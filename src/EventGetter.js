const SdtdApi = require('7daystodie-api-wrapper');
const logger = require('./Logger');
const redisClient = require('./RedisConnector');
const _ = require('lodash');
const handleLogLine = require('./util/handleLogLine');

class EventGetter {
    /**
     * 
     * @param { Object } serverModel 
     */
    constructor(serverModel) {
        this.servers = new Map();
        // Default time between attempts to get new events from a server
        this.defaultInterval = 2000;
        // When a server has consistently failed, we retry on a slower interval
        this.failedInterval = 60000;
        serverModel.getAll().then(servers => {
            for (const server of servers) {
                this.servers.set(server.id, server.dataValues);
            }
        });

        this.interval = setInterval(() => {
            this._intervalFunction();
        }, 2000);
    }

    /**
     * Heartbeat of this class
     */
    async _intervalFunction() {
        for (const server of this.servers.values()) {
            let serverLock = await redisClient.get('lock', server);
            if (_.isNull(serverLock)) {
                await this.getNewLogs(server);
            }
        }
    }

    /**
     * When a request to a server fails, we call this function
     * After consecutive failed requests, we slow down how often we retry
     * @param {Object} server 
     */
    async failedRequestHandler(server, error) {

        if (_.isUndefined(server)) {
            throw new Error(`Server cannot be undefined`);
        }

        let currentFails = await redisClient.get(`failedCounter`, server);

        if (_.isNull(currentFails)) {
            currentFails = 1;
        }
        // Increment the counter
        currentFails = parseInt(currentFails) + 1;

        if (currentFails > 3) {
            logger.info(`Server ${server.id} - ${server.name} has failed ${currentFails} times. Setting failed status to true. ${error}`);
            this.activateFailed(server);
        }

        // Reset the latest log line so we are up to date with server events after a reboot
        this.updateLatestLogLine(server);

        await redisClient.set(`failedCounter`, currentFails, server);
        return;
    }

    /**
     * Get the failed status for a server
     * @param {Object} server 
     */
    async getFailedStatus(server) {
        let response = await redisClient.get(`failed`, server);
        switch (response) {
            case 'true':
                return true;
            case 'false':
                return false;
            case null:
                return false;
            default:
                throw new Error(`Invalid data for failed status in redis`);
        }
    }

    /**
     * Set a servers failed status to true & set a longer delay before we check for new logs again.
     * @param {Object} server 
     */
    async activateFailed(server) {
        await redisClient.set(`failed`, true, server);
        await this.setLock(server, this.failedInterval);

    }

    /**
     * Server is reachable again, set counter & status to 0
     * @param {Object} server 
     */
    async resetFailedStatus(server) {
        await redisClient.set(`failedCounter`, 0, server);
        await redisClient.set(`failed`, false, server);
    }


    /**
     * After getting new log lines for a server, we set a value in redis with an expire
     * Use this to check if the timeout to get new logs has passed
     * @param { Object } server 
     * @param { Number } duration How many miliseconds between every request.
     */
    setLock(server, duration) {
        return redisClient.set(`lock`, 1, server, duration);
    }

    /**
     * Gets the newest log lines for a server
     * @param {Object} server 
     */
    async getNewLogs(server) {
        logger.verbose(`Getting new logs for server ${server.id} - ${server.name}`);
        await this.setLock(server, this.defaultInterval);
        server.latestLogLine = await this.getLatestLogLine(server);

        if (_.isUndefined(server.latestLogLine) || _.isNull(server.latestLogLine)) {
            server.latestLogLine = await this.updateLatestLogLine(server);
        }


        let newLogs
        try {
            newLogs = await SdtdApi.getLog({
                ip: server.ip,
                port: server.webPort,
                adminUser: server.authName,
                adminToken: server.authToken
            }, server.latestLogLine);

        } catch (error) {
            this.failedRequestHandler(server, error);
            return
        }

        await this.setLatestLogLine(server, server.latestLogLine + parseInt(newLogs.entries.length));

        _.each(newLogs.entries, async line => {
            let parsedLogLine = handleLogLine(line);
            if (parsedLogLine.type) {
                parsedLogLine.server = {
                    id: server.id,
                    name: server.name
                }
                logger.verbose(`Detected event "${parsedLogLine.type} on server ${server.id} - ${JSON.stringify(parsedLogLine.data)}`);
                redisClient.addToEventQueue(parsedLogLine)
            }
        });

        this.servers.set(server.id, server);
        this.resetFailedStatus(server);
        logger.verbose(`Finished handling update for server ${server.id} - ${server.name}. Found ${newLogs.entries.length} new loglines. latestLogLine: ${server.latestLogLine}`);
    }

    /**
     * Update the log line # of the server
     * We use this to get the latest lines so we don't start with logs from server boot
     * @param { Object } server 
     */
    async updateLatestLogLine(server) {
        try {
            const webUIUpdate = await SdtdApi.getWebUIUpdates({
                ip: server.ip,
                port: server.webPort,
                adminUser: server.authName,
                adminToken: server.authToken
            });
            server.latestLogLine = parseInt(webUIUpdate.newlogs) + 1;
        } catch (error) {
            logger.warn(`Error when getting latest log line for server with ip ${server.ip} - ${error}`);
            server.latestLogLine = 0;
        }

        await redisClient.set('latestLogLine', server.latestLogLine, server);
        return server.latestLogLine;
    }

    async getLatestLogLine(server) {
        let result = await redisClient.get('latestLogLine', server);


        if (_.isNull(result)) {
            result = await this.updateLatestLogLine(server);
        }

        let resultCheck = _.isNaN(parseInt(result));

        if (resultCheck) {
            throw new Error(`Unexpected data from redis: "${result}"`);
        }

        return parseInt(result);
    }

    async setLatestLogLine(server, latestLogLine) {

        if (!_.isFinite(latestLogLine)) {
            throw new Error(`latestLogLine must be an integer`);
        }

        let result = await redisClient.set('latestLogLine', latestLogLine, server);
        return result;
    }
}

module.exports = EventGetter;
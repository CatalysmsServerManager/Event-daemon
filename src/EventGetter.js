const SdtdApi = require('7daystodie-api-wrapper');
const logger = require('./Logger');
const redisClient = require('./Redis');
const Server = require('./model/Server');
const _ = require('lodash');
const handleLogLine = require('./util/handleLogLine');

class EventGetter {
    /**
     * 
     * @param { Server } serverModel 
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
            let serverLock = await redisClient.client.get(`server:${server.id}:lock`);
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

        let currentFails = await redisClient.client.get(`server:${server.id}:failedCounter`);

        if (_.isNull(currentFails)) {
            currentFails = 0;
        }

        currentFails = parseInt(currentFails);

        if (currentFails > 3) {
            await redisClient.client.set(`server:${server.id}:failed`, 1);
            await this.setLock(server, this.failedInterval);
            logger.info(`Server ${server.id} - ${server.name} has failed ${currentFails} times. Setting failed status to true. ${error}`);
        };

        await redisClient.client.set(`server:${server.id}:failedCounter`, currentFails + 1);
        return;
    }

    /**
     * Get the failed status for a server
     * @param {Object} server 
     */
    async getFailedStatus(server) {
        let response = await redisClient.client.get(`server:${server.id}:failed`);
        return response;
    }

    async resetFailedStatus(server) {
        await redisClient.client.set(`server:${server.id}:failedCounter`, 0);
        await redisClient.client.set(`server:${server.id}:failed`, 0);
    }


    /**
     * After getting new log lines for a server, we set a value in redis with an expire
     * Use this to check if the timeout to get new logs has passed
     * @param { Object } server 
     * @param { Number } duration How many miliseconds between every request.
     */
    setLock(server, duration) {
        return redisClient.client.set(`server:${server.id}:lock`, 1, 'PX', duration);
    }

    /**
     * Gets the newest log lines for a server
     * @param {Object} server 
     */
    async getNewLogs(server) {
        logger.verbose(`Get new logs for server ${server.id} - ${server.name}`);
        await this.setLock(server, this.defaultInterval);

        if (_.isUndefined(server.latestLogLine)) {
            server.latestLogLine = await this.getLatestLogLine(server);
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
            this.failedRequestHandler(server,error);
            return
        }
        server.latestLogLine = server.latestLogLine + parseInt(newLogs.entries.length);

        _.each(newLogs.entries, async line => {
            let parsedLogLine = handleLogLine(line);
            if (parsedLogLine.type) {
                logger.info(JSON.stringify(parsedLogLine))
            }
        });

        this.servers.set(server.id, server);
        this.resetFailedStatus(server);
        logger.verbose(`Finished handling update for server ${server.id} - ${server.name}. Found ${newLogs.entries.length} new loglines.`);
    }

    /**
     * Get the log line # of the server
     * We use this to get the latest lines so we don't start with logs from server boot
     * @param { Object } server 
     */
    async getLatestLogLine(server) {
        try {
            const webUIUpdate = await SdtdApi.getWebUIUpdates({
                ip: server.ip,
                port: server.webPort,
                adminUser: server.authName,
                adminToken: server.authToken
            });
            server.latestLogLine = parseInt(webUIUpdate.newlogs) + 1;
            this.servers.set(server.id, server);
            return server.latestLogLine;
        } catch (error) {
            logger.warn(`Error when getting latest log line for server with ip ${server.ip} - ${error}`);
            return 0;
        }
    }
}

module.exports = EventGetter;
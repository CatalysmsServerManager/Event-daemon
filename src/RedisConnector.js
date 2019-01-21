const Redis = require('ioredis');
const _ = require('lodash');

/**
 * Controller class for redis
 */
class RedisConnector {
    constructor() {
        this.client = new Redis({
            keyPrefix: 'eventDaemon:'
        });
        this._subscriber = this.client.duplicate();
    }

    /**
     * Adds an event to the redis queue, ready to be picked up by the game daemon
     * @param {Object} event 
     * @returns { Promise<Number>} Length of the queue after insertion of event.
     */

    async addToEventQueue(event) {
        if (_.isUndefined(event)) {
            throw new Error('Must provide a event argument');
        }

        if (_.isUndefined(event.server)) {
            throw new Error('Must provide a server property');
        }

        let queueLength = await this.client.rpush(`eventQueue`, JSON.stringify(event));
        await this.client.publish('eventQueue', 'new');
        return parseInt(queueLength);
    }

    /**
     * Sets a key in redis
     * @param { String } key Name of the value
     * @param { Object } data JSON deserializable data
     * @param { Object } server
     * @param { Number } expiry ms before key gets deleted
     * @returns { Object } response from redis server
     */

    async set(key, data, server, expiry) {

        if (_.isUndefined(key) || _.isUndefined(data) || _.isUndefined(server) || _.isUndefined(server.id)) {
            throw new Error(`Invalid inputs. key, data, server and server.id are all required`);
        }

        let parsedData = data;

        if (!_.isString(data)) {
            parsedData = JSON.stringify(data);
        }
        let result
        if (expiry) {
            result = await this.client.set(`server:${server.id}:${key}`, parsedData, 'PX', expiry);
        } else {
            result = await this.client.set(`server:${server.id}:${key}`, parsedData);
        }
        return result;
    }

    /**
     * Gets a key from redis
     * @param { String } key 
     * @param { Object } server 
     * @returns { String } Response from redis server
     */
    async get(key, server) {
        if (_.isUndefined(key) || _.isUndefined(server) || _.isUndefined(server.id)) {
            throw new Error(`Invalid inputs, key, server and server.id are all required`);
        }
        let result = await this.client.get(`server:${server.id}:${key}`);
        return result;
    }

    /**
     * Subscribe to a redis channel
     * @param {String} channel 
     * @returns event emitter
     */
    subscribe(channel) {
        this._subscriber.subscribe(channel);
        return this._subscriber;
    }
}

const client = new RedisConnector();

module.exports = client;
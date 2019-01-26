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

        let queueLength = await this.rpush(`eventQueue`, event);
        return parseInt(queueLength);
    }

    /**
     * Push an object into a list
     * @param {String} list 
     * @param {Object} object
     */
    async rpush(list, object) {
        await this.client.rpush(list, JSON.stringify(object));
        await this.client.publish(list, 'new');
        return;
    }

    /**
     * Remove & return an element from a list
     * @param {String} list 
     */
    async lpop(list) {
        let result = await this.client.lpop(list);
        return JSON.parse(result);
    }

    /**
     * Add some object to a set
     * @param {String} set Name of the set
     * @param {Object} object JSON deserializable data
     */
    async sadd(set, object) {
        await this.client.sadd(set, JSON.stringify(object));
        await this.client.publish(set, 'new');
        return;
    }

    /**
     * Returns a random element from a set
     * @param {String} set Name of the set
     */
    async spop(set) {
        let result = await this.client.spop(set);
        return JSON.parse(result);
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

    /**
     * Subscribe to a redis pattern
     * @param {String} pattern 
     * @returns event emitter
     */
    psubscribe(pattern) {
        this._subscriber.psubscribe(pattern);
        return this._subscriber;
    }
}

const client = new RedisConnector();

module.exports = client;
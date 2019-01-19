const Redis = require('ioredis');

class RedisConnector {
    constructor() {
        this.client = new Redis({ keyPrefix: 'eventDaemon:' });
    }
}

const client = new RedisConnector();

module.exports = client;
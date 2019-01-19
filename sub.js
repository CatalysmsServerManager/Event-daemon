const Redis = require('ioredis');

const redis = new Redis();
const sub = redis.duplicate();

sub.on('message', async (channel, message) => {
    console.log(`Received the following message from ${channel}: ${message}`);

    if (message === "update") {
        let event = await redis.lpop('events');
        if (event !== null) {
            console.log(`Handling event ${event}`);
        }
    }

});

const channel = 'eventDaemon';

sub.subscribe(channel, (error, count) => {
    if (error) {
        throw new Error(error);
    }
    console.log(`Subscribed to ${count} channel. Listening for updates on the ${channel} channel.`);
});
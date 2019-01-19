const channel = 'eventDaemon';
const Sequelize = require('sequelize');
const ServerStatic = require('./src/model/Server');
const logger = require('./src/Logger');
const EventGetter = require('./src/EventGetter');

require('dotenv').config();

const sequelize = new Sequelize(process.env.DB, process.env.DB_USER, process.env.DB_PW, {
    host: process.env.DB_HOST,
    dialect: 'mysql',

    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    logging: (msg) => logger.debug(msg),
});

sequelize
    .authenticate()
    .then(() => {
        console.log('Database connection has been established successfully.');
    })
    .catch(err => {
        throw err;
    });

sequelize.sync()
    .then(() => logger.info("Synchronized model definitions"))

const sleep = sec => new Promise(resolve => setTimeout(resolve, sec * 1000));

async function main() {
    const Server = new ServerStatic(sequelize);
    const eventGetter = new EventGetter(Server);

/*     await sleep(4);
    pub.rpush('events', 'event1');
    pub.publish(channel, 'update');

    await sleep(7);
    pub.rpush('events', 'event2');
    pub.publish(channel, 'update'); */


}

main();
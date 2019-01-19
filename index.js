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

const Server = new ServerStatic(sequelize);
const eventGetter = new EventGetter(Server);

const app = {
    datbaseConnection: sequelize,
    eventGetter: eventGetter,
    models: {
        server: Server
    }
}

module.exports = app;
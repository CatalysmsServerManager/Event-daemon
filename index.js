const channel = 'eventDaemon';
const Sequelize = require('sequelize');
const ServerStatic = require('./src/model/Server');
const logger = require('./src/Logger');
const EventGetter = require('./src/EventGetter');

require('dotenv').config();
const main = function main() {
    return new Promise((resolve, reject) => {
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
                logger.info('Database connection has been established successfully.');
            }).then(() => {
                return sequelize.sync()
            })
            .then(() => {
                logger.info("Synchronized model definitions");
                const Server = new ServerStatic(sequelize);
                const eventGetter = new EventGetter(Server);
    
                const instance = {
                    databaseConnection: sequelize,
                    eventGetter: eventGetter,
                    models: {
                        server: Server
                    }
                }
                resolve(instance);
            })
            .catch(err => {
                throw err;
            });

    })
}

/* process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled promise rejection: ${reason}`);
    logger.error(JSON.stringify(promise))
    
}) */

process.on('unhandledRejection', (reason, p) => {
    logger.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
    throw new Error(reason);
  });

const app = main();

module.exports = app;
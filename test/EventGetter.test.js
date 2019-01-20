const expect = require('chai').expect;
const generateServer = require('./generators/generateServer');
const redisClient = require('../src/RedisConnector');
const logger = require('../src/Logger');
let app = require('../index');

describe('EventGetter', () => {

    before(function (done) {
        app.then(instance => {
            logger.info('finish before');
            app = instance;
            done();
        });
    });

    describe('#getFailedStatus', async () => {
        it('returns false or null when no server status has been set yet', async function () {
            let server = generateServer();
            let status = await app.eventGetter.getFailedStatus(server);
            expect(status).to.be.false;
        });

        it('returns true if the server is set to failed', async () => {
            let server = generateServer();
            await app.eventGetter.activateFailed(server);
            let status = await app.eventGetter.getFailedStatus(server);
            expect(status).to.be.true;
        })
    });

    describe('#getLatestLogLine', () => {

    });

    describe('#activateFailed', () => {

        it('Correctly actives failed status', async function() {
            let server = generateServer();
            let status = await app.eventGetter.getFailedStatus(server);
            expect(status).to.be.false;
            await app.eventGetter.activateFailed(server);
            status = await app.eventGetter.getFailedStatus(server);
            expect(status).to.be.true;
        })

    });

    describe('#failedRequestHandler', () => {
        it('throws when no server is given', async function() {
            await expect(app.eventGetter.failedRequestHandler()).to.be.rejectedWith(Error);
        });
        it('Increments the failed counter in redis', async function() {
            let server = generateServer();
            await app.eventGetter.resetFailedStatus(server);
            let currentFails = await redisClient.get(`failedCounter`, server);
            await app.eventGetter.failedRequestHandler(server);
            let currentFails2 = await redisClient.get(`failedCounter`, server);
            expect(parseInt(currentFails2)).to.be.eq(parseInt(currentFails) + 1);
        });
        it('Activates failed status when counter > 3', async function() {
            let server = generateServer();
            await app.eventGetter.resetFailedStatus(server);
            let status = await app.eventGetter.getFailedStatus(server);
            expect(status).to.be.false;

            let currentFails = await redisClient.get(`failedCounter`, server);

            await app.eventGetter.failedRequestHandler(server);
            await app.eventGetter.failedRequestHandler(server);
            await app.eventGetter.failedRequestHandler(server);
            await app.eventGetter.failedRequestHandler(server);

            currentFails = await redisClient.get(`failedCounter`, server);

            status = await app.eventGetter.getFailedStatus(server);
            expect(status).to.be.true;
        });
    });
});
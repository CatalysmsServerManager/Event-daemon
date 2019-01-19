const chai = require('chai')
const expect = chai.expect
chai.use(require('chai-as-promised'));

const generateServer = require('./generators/generateServer');

const redis = require('../src/RedisConnector');
describe('RedisConnector', () => {

    describe('#addToEventQueue', () => {
        it('Errors when no argument is given or argument has no server data', async () => {
            await expect(redis.addToEventQueue()).to.be.rejectedWith(Error);
            await expect(redis.addToEventQueue({
                fake: true
            })).to.be.rejectedWith(Error);
        });

        it('Adds the event to a redis list', async () => {
            const event = {
                type: 'test',
                server: generateServer(),
                data: {
                    some: 'data',
                    goes: 'here'
                }
            };
            let result = await redis.addToEventQueue(event);

            expect(result).to.not.be.eq(0);

            let lastListElement = await redis.client.rpop('eventQueue');
            expect(lastListElement).to.be.eq(JSON.stringify(event));
        });

    });


    describe('#get', function () {
        it('Errors with invalid inputs', async () => {
            await expect(redis.get()).to.be.rejectedWith(Error);
            await expect(redis.get('test')).to.be.rejectedWith(Error);
            await expect(redis.get('test', {})).to.be.rejectedWith(Error);
        });
        it('Returns a string with correct inputs', async () => {
            await redis.set('test', 'some data', {id: 1});

            let result = await redis.get('test', {id: 1});
            expect(result).to.be.a.string;
            expect(result).to.be.eq('some data');
        });
    });


    describe('#set', function () {
        it('Sets a correct value ', async () => {

            await redis.set('test', 'some data', {id: 1});
            let result = await redis.get('test', {id: 1});
            expect(result).to.be.a.string;
            expect(result).to.be.eq('some data');

            await redis.set('test', "3", {id: 1});
            result = await redis.get('test', {id: 1});
            expect(result).to.be.a.string;
            expect(result).to.be.eq("3");
        });

        it('Errors with invalid inputs', async () => {
            await expect(redis.set()).to.be.rejectedWith(Error);
            await expect(redis.set('test')).to.be.rejectedWith(Error);
            await expect(redis.set('test', 'data')).to.be.rejectedWith(Error);
            await expect(redis.set('test', {})).to.be.rejectedWith(Error);
            await expect(redis.set('test', 'data', {})).to.be.rejectedWith(Error);
        });
    });
});
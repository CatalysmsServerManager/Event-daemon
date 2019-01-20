const chai = require('chai')
const expect = chai.expect
chai.use(require('chai-as-promised'));

const generateServer = require('./generators/generateServer');
const handleLogLine = require('../src/util/handleLogLine');

describe('handleLogLine', () => {

    it('Detects a memUpdate event', async () => {
        let result = handleLogLine(createLogLine('Time: 1200.60m FPS: 36.24 Heap: 769.5MB Max: 924.2MB Chunks: 361 CGO: 14 Ply: 1 Zom: 10 Ent: 11 (20) Items: 0 CO: 2 RSS: 1440.9MB'))
        expect(result.type).to.be.eq('memUpdate');
    });

    it('Detects a chatMessage event', async () => {
        let result = handleLogLine(createLogLine('Chat (from \'76561198028175941\', entity id \'171\', to \'Global\'): \'Catalysm\': blabla'))
        expect(result.type).to.be.eq('chatMessage');
        expect(result.data.playerName).to.be.eq('Catalysm');

        result = handleLogLine(createLogLine('Chat (from \'76561198028175941\', entity id \'171\', to \'Global\'): \'[#87646](Admin) Catalysm[-]\': blabla'))
        expect(result.type).to.be.eq('chatMessage');
        expect(result.data.playerName).to.be.eq('Catalysm');

        result = handleLogLine(createLogLine('Chat (from \'76561198028175941\', entity id \'171\', to \'Global\'): \'[#87646]Catalysm[-]\': blabla'))
        expect(result.type).to.be.eq('chatMessage');
        expect(result.data.playerName).to.be.eq('Catalysm');
    });

    it('Detects a playerConnected event', async () => {
        let result = handleLogLine(createLogLine('Player connected, entityid=171, name=Catalysm, steamid=76561198028175941, steamOwner=76561198028175941, ip=::ffff:192.168.1.52'))
        expect(result.type).to.be.eq('playerConnected');
    });

    it('Detects a playerDisconnected event', async () => {
        let result = handleLogLine(createLogLine("Player disconnected: EntityID=171, PlayerID='76561198028175941', OwnerID='76561198028175941', PlayerName='Catalysm'"))
        expect(result.type).to.be.eq('playerDisconnected');
    });

    it('Detects a playerDeath event', async () => {
        let result = handleLogLine(createLogLine("GMSG: Player 'Catalysm' died"))
        expect(result.type).to.be.eq('playerDeath');
    });

    it('Detects a logLine event when someting unknown is given', async () => {
        let result = handleLogLine(createLogLine("something random that will never trigger an event"))
        expect(result.type).to.be.eq('logLine');
    });
});


function createLogLine(msg) {
    return {
        date: '2018-04-12',
        time: '22:01:21',
        uptime: '72067.431',
        msg: msg,
        trace: '',
        type: 'Log'
    }
}
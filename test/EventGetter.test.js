const expect = require('chai').expect;

describe('Dummy test', () => {

    it('returns', () => {
        let app = require('../index');
        expect(app.models).to.not.be.undefined;
    })
});
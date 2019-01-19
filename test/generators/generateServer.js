const faker = require('faker');

module.exports = function generateServer(options) {

    if (!options) {
        options = {};
    }

    return {
        id: options.id ? options.id : faker.random.uuid(),
        name: options.name ? options.name : faker.company.companyName(),
        webPort: options.webPort ? options.webPort : faker.random.number(1, 65535),
        authName: options.authName ? options.authName : faker.name.firstName(),
        authToken: options.authToken ? options.authToken : faker.internet.password()
    }
}
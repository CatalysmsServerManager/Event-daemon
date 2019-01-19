const Sequelize = require('sequelize');

class Server {
    /**
     * 
     * @param { Sequelize.Sequelize } sequelize 
     */
    constructor(sequelize) {
        this.model = sequelize.define('sdtdserver', {
            id: {
                type: Sequelize.STRING,
                primaryKey: true
            },
            name: Sequelize.STRING,
            ip: Sequelize.STRING,
            webPort: Sequelize.STRING,
            authName: Sequelize.STRING,
            authToken: Sequelize.STRING
        }, {
            tableName: 'sdtdserver',
        });

    }

    async getAll() {
        const result = await this.model.findAll();
        return result;
    }
}

module.exports = Server;
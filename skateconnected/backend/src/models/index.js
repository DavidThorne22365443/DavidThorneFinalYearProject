const { defineAccount } = require("./Account");

function initModels(sequelize) {
    const Account = defineAccount(sequelize);

    return {
        Account,
    };
}

module.exports = { initModels };

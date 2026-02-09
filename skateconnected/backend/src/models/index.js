const { defineAccount } = require("./Account");
const { definePark } = require("./Park");

function initModels(sequelize) {
    const Account = defineAccount(sequelize);
    const Park = definePark(sequelize);

    // associations
    // i.e. many users can be associated with one skatepark
    Park.hasMany(Account, { foreignKey: "parkId" });
    Account.belongsTo(Park, { foreignKey: "parkId" });

    return { Account, Park };
}

module.exports = { initModels };

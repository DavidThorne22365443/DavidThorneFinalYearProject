const { DataTypes } = require("sequelize");

function defineParkMember(sequelize) {
    const ParkMember = sequelize.define(
        "ParkMember",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            parkId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            accountId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
        },
        {
            tableName: "park_members",
            timestamps: true,
            indexes: [
                { unique: true, fields: ["parkId", "accountId"] },
                { fields: ["accountId"] },
                { fields: ["parkId"] },
            ],
        }
    );

    return ParkMember;
}

module.exports = { defineParkMember };
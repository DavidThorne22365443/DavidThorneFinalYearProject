const { DataTypes } = require("sequelize");

function defineSkatespot(sequelize) {
    const Skatespot = sequelize.define(
        "Skatespot",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(60),
                allowNull: false,
                validate: { notEmpty: true },
            },
            nearby: {
                type: DataTypes.STRING(200),
                allowNull: true,
            },
            latitude: {
                type: DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            longitude: {
                type: DataTypes.DECIMAL(10, 7),
                allowNull: false,
            },
            addedById: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            approved: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        },
        {
            tableName: "skatespots",
            timestamps: true,
        }
    );

    return Skatespot;
}

module.exports = { defineSkatespot };
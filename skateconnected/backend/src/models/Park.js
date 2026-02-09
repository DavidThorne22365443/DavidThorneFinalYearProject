const { DataTypes } = require("sequelize");

function definePark(sequelize) {
    const Park = sequelize.define(

        // creates a park model containing all the fields that each park has
        "Park",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(30),
                allowNull: false,
                validate: { notEmpty: true },
            },
            city: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },
            county: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },
            latitude: {
                type: DataTypes.DECIMAL(10, 7),
                allowNull: true,
            },
            longitude: {
                type: DataTypes.DECIMAL(10, 7),
                allowNull: true,
            },
        },
        {
            tableName: "parks",
            timestamps: true,
            indexes: [{ unique: true, fields: ["name"] }],
        }
    );

    return Park;
}

module.exports = { definePark };

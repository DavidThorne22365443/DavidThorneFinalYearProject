const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

function defineAccount(sequelize) {
    const Account = sequelize.define(
        "Account",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4, // this line automatically generates a user ID (UUID)
                primaryKey: true,
            },

            username: {
                type: DataTypes.STRING(20),
                allowNull: false,
                unique: true,
                validate: {
                    notEmpty: true,
                    len: [3, 20], // ensures username is not too long
                },
            },

            passwordHash: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            parkId: {
                type: DataTypes.UUID,
                allowNull: true,
            },

        },
        {
            tableName: "accounts",
            timestamps: true, //allows us to see when the account was created or updated
            indexes: [{ unique: true, fields: ["username"] }],
        }
    );

    return Account;
}

module.exports = { defineAccount };

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
                    len: [3, 20],
                },
            },

            email: {
                type: DataTypes.STRING(255),
                allowNull: true,
                unique: true,
                validate: { isEmail: true },
            },

            passwordHash: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            parkId: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            firstName: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            lastName: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            showLastName: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            favouriteTrick: {
                type: DataTypes.STRING(80),
                allowNull: true,
            },
            city: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },

            emailVerified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            verificationCode: {
                type: DataTypes.STRING(10),
                allowNull: true,
            },
            verificationCodeExpiresAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            isAdmin: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

        },
        {
            tableName: "accounts",
            timestamps: true,
            indexes: [
                { unique: true, fields: ["username"] },
                { unique: true, fields: ["email"] },
            ],
        }
    );

    return Account;
}

module.exports = { defineAccount };

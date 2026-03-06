const { DataTypes } = require("sequelize");

function definePendingRegistration(sequelize) {
    const PendingRegistration = sequelize.define(
        "PendingRegistration",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            verificationCode: {
                type: DataTypes.STRING(10),
                allowNull: false,
            },
            verificationCodeExpiresAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            username: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            passwordHash: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            firstName: { type: DataTypes.STRING(50), allowNull: true },
            lastName: { type: DataTypes.STRING(50), allowNull: true },
            showLastName: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            favouriteTrick: { type: DataTypes.STRING(80), allowNull: true },
            city: { type: DataTypes.STRING(50), allowNull: true },
        },
        {
            tableName: "pending_registrations",
            timestamps: true,
            indexes: [{ fields: ["email"] }, { fields: ["verificationCodeExpiresAt"] }],
        }
    );
    return PendingRegistration;
}

module.exports = { definePendingRegistration };

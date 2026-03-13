const { DataTypes } = require("sequelize");

function defineConversation(sequelize) {
    const Conversation = sequelize.define(
        "Conversation",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            status: {
                type: DataTypes.ENUM("pending", "accepted"),
                allowNull: false,
                defaultValue: "pending",
            },
            inviterId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
        },
        {
            tableName: "conversations",
            timestamps: true,
        }
    );

    return Conversation;
}

module.exports = { defineConversation };

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
        },
        {
            tableName: "conversations",
            timestamps: true,
        }
    );

    return Conversation;
}

module.exports = { defineConversation };

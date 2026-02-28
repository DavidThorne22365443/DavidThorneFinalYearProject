const { DataTypes } = require("sequelize");

function defineConversationParticipant(sequelize) {
    const ConversationParticipant = sequelize.define(
        "ConversationParticipant",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            conversationId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            accountId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
        },
        {
            tableName: "conversation_participants",
            timestamps: true,
            indexes: [
                { unique: true, fields: ["conversationId", "accountId"] }, // prevents duplicates
                { fields: ["accountId"] },
                { fields: ["conversationId"] },
            ],
        }
    );

    return ConversationParticipant;
}

module.exports = { defineConversationParticipant };

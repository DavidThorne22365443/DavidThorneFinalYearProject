const { DataTypes } = require("sequelize");

function defineMessage(sequelize) {
    const Message = sequelize.define(
        "Message",
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
            senderId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            body: {
                type: DataTypes.STRING(1000),
                allowNull: false,
                validate: { notEmpty: true },
            },
        },
        {
            tableName: "messages",
            timestamps: true,
            indexes: [
                { fields: ["conversationId", "createdAt"] }, // fast “load messages in chat”
                { fields: ["senderId"] },
            ],
        }
    );

    return Message;
}

module.exports = { defineMessage };

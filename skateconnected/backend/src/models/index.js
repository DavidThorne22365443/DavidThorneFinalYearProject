const { defineAccount } = require("./Account");
const { definePark } = require("./Park");
const { defineConversation } = require("./Conversation");
const { defineConversationParticipant } = require("./ConversationParticipant");
const { defineMessage } = require("./Message");
const { definePendingRegistration } = require("./PendingRegistration");

function initModels(sequelize) {

    const Conversation = defineConversation(sequelize);
    const ConversationParticipant = defineConversationParticipant(sequelize);
    const Message = defineMessage(sequelize);
    const Account = defineAccount(sequelize);
    const Park = definePark(sequelize);
    const PendingRegistration = definePendingRegistration(sequelize);

    // associations
    // i.e. many users can be associated with one skatepark
    Park.hasMany(Account, { foreignKey: "parkId" });
    Account.belongsTo(Park, { foreignKey: "parkId" });

    // Conversations <-> Accounts (many-to-many) via ConversationParticipant
    Conversation.belongsToMany(Account, {
        through: ConversationParticipant,
        foreignKey: "conversationId",
        otherKey: "accountId",
        as: "participants",
    });

    Account.belongsToMany(Conversation, {
        through: ConversationParticipant,
        foreignKey: "accountId",
        otherKey: "conversationId",
        as: "conversations",
    });

// Conversation -> Messages (one-to-many)
    Conversation.hasMany(Message, {
        foreignKey: "conversationId",
        as: "messages",
        onDelete: "CASCADE",
    });

    Message.belongsTo(Conversation, {
        foreignKey: "conversationId",
        as: "conversation",
    });

// Message sender relation (optional but useful)
    Message.belongsTo(Account, {
        foreignKey: "senderId",
        as: "sender",
    });


    return {
        sequelize,
        Account,
        Park,
        Conversation,
        ConversationParticipant,
        Message,
        PendingRegistration,
    };



}

module.exports = { initModels };

const { defineAccount } = require("./Account");
const { definePark } = require("./Park");
const { defineParkMember } = require("./ParkMember");
const { defineConversation } = require("./Conversation");
const { defineConversationParticipant } = require("./ConversationParticipant");
const { defineMessage } = require("./Message");
const { definePendingRegistration } = require("./PendingRegistration");
const { defineSkatespot } = require("./Skatespot");

function initModels(sequelize) {

    const Conversation = defineConversation(sequelize);
    const ConversationParticipant = defineConversationParticipant(sequelize);
    const Message = defineMessage(sequelize);
    const Account = defineAccount(sequelize);
    const Park = definePark(sequelize);
    const ParkMember = defineParkMember(sequelize);
    const PendingRegistration = definePendingRegistration(sequelize);
    const Skatespot = defineSkatespot(sequelize);

    // Park <-> Account many-to-many via ParkMember (users can join up to 4 parks)
    Park.belongsToMany(Account, {
        through: ParkMember,
        foreignKey: "parkId",
        otherKey: "accountId",
        as: "members",
    });
    Account.belongsToMany(Park, {
        through: ParkMember,
        foreignKey: "accountId",
        otherKey: "parkId",
        as: "parks",
    });
    ParkMember.belongsTo(Park, { foreignKey: "parkId", as: "park" });
    ParkMember.belongsTo(Account, { foreignKey: "accountId", as: "account" });
    Park.hasMany(ParkMember, { foreignKey: "parkId", as: "memberships" });
    Account.hasMany(ParkMember, { foreignKey: "accountId", as: "parkMemberships" });

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

    // Message sender relation
    Message.belongsTo(Account, {
        foreignKey: "senderId",
        as: "sender",
    });

    // Skatespot -> Account (addedBy)
    Skatespot.belongsTo(Account, { foreignKey: "addedById", as: "addedBy" });
    Account.hasMany(Skatespot, { foreignKey: "addedById", as: "submittedSpots" });

    return {
        sequelize,
        Account,
        Park,
        ParkMember,
        Conversation,
        ConversationParticipant,
        Message,
        PendingRegistration,
        Skatespot,
    };
}

module.exports = { initModels };

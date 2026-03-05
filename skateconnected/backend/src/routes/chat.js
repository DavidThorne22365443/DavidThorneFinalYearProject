const express = require("express");
const { validate: isUuid } = require("uuid");
const { Op } = require("sequelize");



function messageToDto(m) {
    return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        body: m.body,
        createdAt: m.createdAt,
    };
}

function chatRouter(models) {
    const router = express.Router();
    const { Account, Conversation, ConversationParticipant, Message, sequelize } = models;

    const { requireAuth } = require("../middleware/requireAuth");
    router.use(requireAuth(models));

    // 1) Resolve existing chats for logged-in user
    // GET /chat/conversations
    router.get("/conversations", async (req, res) => {
        try {
            const me = req.user.id;

            // All conversation IDs I'm part of
            const myLinks = await ConversationParticipant.findAll({
                where: { accountId: me },
                attributes: ["conversationId"],
            });
            const conversationIds = myLinks.map((x) => x.conversationId);

            if (conversationIds.length === 0) return res.json([]);

            // Get last message per conversation (simple, reliable approach)
            const lastMessages = await Promise.all(
                conversationIds.map(async (cid) => {
                    const msg = await Message.findOne({
                        where: { conversationId: cid },
                        order: [["createdAt", "DESC"]],
                    });
                    return { cid, msg };
                })
            );

            // Get the "other user" (DM = 2 participants). If later group chats: adapt.
            const otherParticipants = await ConversationParticipant.findAll({
                where: {
                    conversationId: { [Op.in]: conversationIds },
                    accountId: { [Op.ne]: me },
                },
                attributes: ["conversationId", "accountId"],
            });

            const otherUserIds = [...new Set(otherParticipants.map((p) => p.accountId))];
            const otherUsers = await Account.findAll({
                where: { id: { [Op.in]: otherUserIds } },
                attributes: ["id", "username"],
            });

            const otherById = new Map(otherUsers.map((u) => [u.id, u]));
            const otherByConversation = new Map(otherParticipants.map((p) => [p.conversationId, p.accountId]));

            const result = conversationIds
                .map((cid) => {
                    const otherId = otherByConversation.get(cid) || null;
                    const other = otherId ? otherById.get(otherId) : null;
                    const lm = lastMessages.find((x) => x.cid === cid)?.msg || null;

                    return {
                        conversationId: cid,
                        otherUser: other ? { id: other.id, username: other.username } : null,
                        lastMessage: lm ? messageToDto(lm) : null,
                    };
                })
                .sort((a, b) => {
                    const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
                    const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
                    return tb - ta;
                });

            return res.json(result);
        } catch (err) {
            console.error("GET /chat/conversations failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // 2) Create-or-find a DM
    // POST /chat/conversations  body: { otherUserId }
    router.post("/conversations", async (req, res) => {
        const me = req.user.id;
        const { otherUserId } = req.body || {};

        if (!otherUserId || !isUuid(otherUserId)) {
            return res.status(400).json({ error: "otherUserId must be a uuid" });
        }
        if (otherUserId === me) {
            return res.status(400).json({ error: "cannot create conversation with self" });
        }

        try {
            const other = await Account.findByPk(otherUserId);
            if (!other) return res.status(404).json({ error: "other user not found" });

            // Find existing DM by checking any conversation with exactly these 2 participants
            const myLinks = await ConversationParticipant.findAll({
                where: { accountId: me },
                attributes: ["conversationId"],
            });
            const conversationIds = myLinks.map((x) => x.conversationId);

            if (conversationIds.length > 0) {
                const existing = await ConversationParticipant.findOne({
                    where: { conversationId: { [Op.in]: conversationIds }, accountId: otherUserId },
                });
                if (existing) {
                    return res.status(200).json({ conversationId: existing.conversationId });
                }
            }

            // Otherwise create a new conversation + two participant rows transactionally
            const created = await sequelize.transaction(async (t) => {
                const convo = await Conversation.create({}, { transaction: t });
                await ConversationParticipant.bulkCreate(
                    [
                        { conversationId: convo.id, accountId: me },
                        { conversationId: convo.id, accountId: otherUserId },
                    ],
                    { transaction: t }
                );
                return convo;
            });

            return res.status(201).json({ conversationId: created.id });
        } catch (err) {
            console.error("POST /chat/conversations failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // 3) Load messages in a conversation
    // GET /chat/conversations/:id/messages
    router.get("/conversations/:id/messages", async (req, res) => {
        const me = req.user.id;
        const { id } = req.params;

        if (!isUuid(id)) return res.status(400).json({ error: "invalid conversation id (uuid)" });

        try {
            // must be a participant
            const link = await ConversationParticipant.findOne({
                where: { conversationId: id, accountId: me },
            });
            if (!link) return res.status(403).json({ error: "not a participant in this conversation" });

            const msgs = await Message.findAll({
                where: { conversationId: id },
                order: [["createdAt", "ASC"]],
                limit: 200,
            });

            return res.json(msgs.map(messageToDto));
        } catch (err) {
            console.error("GET /chat/conversations/:id/messages failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // 4) Send message (persist)
    // POST /chat/conversations/:id/messages  body: { body }
    router.post("/conversations/:id/messages", async (req, res) => {
        const me = req.user.id;
        const { id } = req.params;
        const { body } = req.body || {};

        if (!isUuid(id)) return res.status(400).json({ error: "invalid conversation id (uuid)" });
        if (!body || typeof body !== "string" || !body.trim()) {
            return res.status(400).json({ error: "message body is required" });
        }

        try {
            const link = await ConversationParticipant.findOne({
                where: { conversationId: id, accountId: me },
            });
            if (!link) return res.status(403).json({ error: "not a participant in this conversation" });

            const msg = await Message.create({
                conversationId: id,
                senderId: me,
                body: body.trim().slice(0, 1000),
            });

            return res.status(201).json(messageToDto(msg));
        } catch (err) {
            console.error("POST /chat/conversations/:id/messages failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    return router;
}

module.exports = { chatRouter };

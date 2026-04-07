const express = require("express");
const { validate: isUuid } = require("uuid");
const { Op } = require("sequelize");
const { requireAuth, requireAdmin } = require("../middleware/requireAuth");

function noticeToDto(notice, includeAddedBy = false) {
    const dto = {
        id: notice.id,
        title: notice.title,
        content: notice.content,
        eventDate: notice.eventDate,
        approved: notice.approved,
        isPinned: notice.isPinned,
        addedById: notice.addedById,
        createdAt: notice.createdAt,
    };
    if (includeAddedBy && notice.addedBy) {
        dto.addedByUsername = notice.addedBy.username;
        dto.addedByFirstName = notice.addedBy.firstName || null;
    }
    return dto;
}

function noticeRouter(models) {
    const router = express.Router();
    const { Notice, Account } = models;
    const auth = requireAuth(models);

    // GET /notice — public, approved notices sorted: pinned first, then by eventDate proximity to today, then by createdAt
    router.get("/", async (_req, res) => {
        try {
            const notices = await Notice.findAll({
                where: { approved: true },
                order: [
                    ["isPinned", "DESC"],
                    ["eventDate", "ASC"],
                    ["createdAt", "DESC"],
                ],
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Sort non-pinned notices so closest upcoming/past date is at top
            const pinned = notices.filter((n) => n.isPinned);
            const rest = notices.filter((n) => !n.isPinned);

            rest.sort((a, b) => {
                const dateA = a.eventDate ? new Date(a.eventDate).getTime() : Infinity;
                const dateB = b.eventDate ? new Date(b.eventDate).getTime() : Infinity;
                const diffA = Math.abs(dateA - today.getTime());
                const diffB = Math.abs(dateB - today.getTime());
                return diffA - diffB;
            });

            const sorted = [...pinned, ...rest];
            return res.json(sorted.map((n) => noticeToDto(n)));
        } catch (err) {
            console.error("GET /notice failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // GET /notice/pending — admin only
    router.get("/pending", auth, requireAdmin, async (_req, res) => {
        try {
            const notices = await Notice.findAll({
                where: { approved: false },
                include: [
                    {
                        model: Account,
                        as: "addedBy",
                        attributes: ["id", "username", "firstName"],
                    },
                ],
                order: [["createdAt", "ASC"]],
            });
            return res.json(notices.map((n) => noticeToDto(n, true)));
        } catch (err) {
            console.error("GET /notice/pending failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // POST /notice — any logged-in user can submit (starts unapproved)
    router.post("/", auth, async (req, res) => {
        try {
            const { title, content, eventDate } = req.body;

            if (!title || typeof title !== "string" || !title.trim()) {
                return res.status(400).json({ error: "title is required" });
            }
            if (!content || typeof content !== "string" || !content.trim()) {
                return res.status(400).json({ error: "content is required" });
            }

            let parsedDate = null;
            if (eventDate) {
                parsedDate = new Date(eventDate);
                if (isNaN(parsedDate.getTime())) {
                    return res.status(400).json({ error: "invalid eventDate" });
                }
            }

            const notice = await Notice.create({
                title: title.trim().slice(0, 100),
                content: content.trim(),
                eventDate: parsedDate || null,
                addedById: req.user.id,
                approved: false,
                isPinned: false,
            });

            return res.status(201).json(noticeToDto(notice));
        } catch (err) {
            console.error("POST /notice failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // PUT /notice/:id/approve — admin only
    router.put("/:id/approve", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid id" });

            const notice = await Notice.findByPk(id);
            if (!notice) return res.status(404).json({ error: "notice not found" });

            notice.approved = true;
            await notice.save();
            return res.json(noticeToDto(notice));
        } catch (err) {
            console.error("PUT /notice/:id/approve failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // PUT /notice/:id/pin — admin only, toggles pin state
    router.put("/:id/pin", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid id" });

            const notice = await Notice.findByPk(id);
            if (!notice) return res.status(404).json({ error: "notice not found" });

            notice.isPinned = !notice.isPinned;
            await notice.save();
            return res.json(noticeToDto(notice));
        } catch (err) {
            console.error("PUT /notice/:id/pin failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // DELETE /notice/:id — admin only (also used for declining pending requests)
    router.delete("/:id", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid id" });

            const deleted = await Notice.destroy({ where: { id } });
            if (!deleted) return res.status(404).json({ error: "notice not found" });

            return res.status(204).send();
        } catch (err) {
            console.error("DELETE /notice/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    return router;
}

module.exports = { noticeRouter };

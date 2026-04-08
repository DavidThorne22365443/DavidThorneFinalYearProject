const express = require("express");
const { validate: isUuid } = require("uuid");
const { requireAuth, requireAdmin } = require("../middleware/requireAuth");

function spotToDto(spot, includeAddedBy = false) {
    const dto = {
        id: spot.id,
        name: spot.name,
        nearby: spot.nearby,
        latitude: spot.latitude,
        longitude: spot.longitude,
        approved: spot.approved,
        addedById: spot.addedById,
        createdAt: spot.createdAt,
    };
    if (includeAddedBy && spot.addedBy) {
        const u = spot.addedBy;
        dto.addedByUsername = u.username;
        dto.addedByFirstName = u.firstName || null;
        dto.addedByLastName = u.showLastName ? (u.lastName || null) : null;
        dto.addedBySkillLevel = u.skillLevel || null;
    }
    return dto;
}

function skatespotRouter(models) {
    const router = express.Router();
    const { Skatespot, Account } = models;
    const auth = requireAuth(models);

    // GET /skatespot — public, approved spots only
    router.get("/", async (_req, res) => {
        try {
            const spots = await Skatespot.findAll({
                where: { approved: true },
                order: [["createdAt", "ASC"]],
            });
            return res.json(spots.map((s) => spotToDto(s)));
        } catch (err) {
            console.error("GET /skatespot failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // GET /skatespot/pending — admin only, unapproved spots with submitter info
    router.get("/pending", auth, requireAdmin, async (_req, res) => {
        try {
            const spots = await Skatespot.findAll({
                where: { approved: false },
                include: [
                    {
                        model: Account,
                        as: "addedBy",
                        attributes: ["id", "username", "firstName", "lastName", "showLastName", "skillLevel"],
                    },
                ],
                order: [["createdAt", "ASC"]],
            });
            return res.json(spots.map((s) => spotToDto(s, true)));
        } catch (err) {
            console.error("GET /skatespot/pending failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // POST /skatespot — any logged-in user can submit (starts unapproved)
    router.post("/", auth, async (req, res) => {
        try {
            const { name, nearby, latitude, longitude } = req.body;

            if (!name || typeof name !== "string" || !name.trim()) {
                return res.status(400).json({ error: "name is required" });
            }
            const lat = Number(latitude);
            const lng = Number(longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return res.status(400).json({ error: "valid latitude and longitude are required" });
            }

            const spot = await Skatespot.create({
                name: name.trim().slice(0, 60),
                nearby: nearby ? String(nearby).trim().slice(0, 200) || null : null,
                latitude: lat,
                longitude: lng,
                addedById: req.user.id,
                approved: false,
            });

            return res.status(201).json(spotToDto(spot));
        } catch (err) {
            console.error("POST /skatespot failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // PUT /skatespot/:id — admin only, update spot details and/or location
    router.put("/:id", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid id" });

            const spot = await Skatespot.findByPk(id);
            if (!spot) return res.status(404).json({ error: "skatespot not found" });

            const { name, nearby, latitude, longitude } = req.body;

            if (name !== undefined) {
                if (!name || typeof name !== "string" || !name.trim()) {
                    return res.status(400).json({ error: "name cannot be empty" });
                }
                spot.name = name.trim().slice(0, 60);
            }
            if (nearby !== undefined) {
                spot.nearby = nearby ? String(nearby).trim().slice(0, 200) || null : null;
            }
            if (latitude !== undefined) {
                const lat = Number(latitude);
                if (!Number.isFinite(lat)) return res.status(400).json({ error: "invalid latitude" });
                spot.latitude = lat;
            }
            if (longitude !== undefined) {
                const lng = Number(longitude);
                if (!Number.isFinite(lng)) return res.status(400).json({ error: "invalid longitude" });
                spot.longitude = lng;
            }

            await spot.save();
            return res.json(spotToDto(spot));
        } catch (err) {
            console.error("PUT /skatespot/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // PUT /skatespot/:id/approve — admin only
    router.put("/:id/approve", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid id" });

            const spot = await Skatespot.findByPk(id);
            if (!spot) return res.status(404).json({ error: "skatespot not found" });

            spot.approved = true;
            await spot.save();
            return res.json(spotToDto(spot));
        } catch (err) {
            console.error("PUT /skatespot/:id/approve failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // DELETE /skatespot/:id — admin only
    router.delete("/:id", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid id" });

            const deleted = await Skatespot.destroy({ where: { id } });
            if (!deleted) return res.status(404).json({ error: "skatespot not found" });

            return res.status(204).send();
        } catch (err) {
            console.error("DELETE /skatespot/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    return router;
}

module.exports = { skatespotRouter };
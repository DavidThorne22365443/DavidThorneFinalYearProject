const express = require("express");
const { validate: isUuid } = require("uuid");
const { requireAuth, requireAdmin } = require("../middleware/requireAuth");

function parkToDto(park) {
    return {
        id: park.id,
        name: park.name,
        city: park.city,
        county: park.county,
        address: park.address,
        openingHours: park.openingHours,
        latitude: park.latitude,
        longitude: park.longitude,
        createdAt: park.createdAt,
        updatedAt: park.updatedAt,
    };
}

function memberToDto(account) {
    return {
        id: account.id,
        username: account.username,
        firstName: account.firstName,
        lastName: account.showLastName ? account.lastName : null,
        showLastName: account.showLastName,
    };
}

function toNum(val) {
    if (val == null || val === "") return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
}

function toStr(val, max) {
    if (val == null) return null;
    const s = String(val).trim();
    return s ? s.slice(0, max) : null;
}

function parksRouter(models) {
    const router = express.Router();
    const { Park, Account, ParkMember } = models;
    const auth = requireAuth(models);

    // CREATE park (admin only)
    router.post("/", auth, requireAdmin, async (req, res) => {
        try {
            const { name, city, county, latitude, longitude, address, openingHours } = req.body;

            if (!name || typeof name !== "string" || !name.trim()) {
                return res.status(400).json({ error: "name is required" });
            }

            const park = await Promise.race([
                Park.create({
                    name: name.trim().slice(0, 30),
                    city: toStr(city, 20),
                    county: toStr(county, 20),
                    latitude: toNum(latitude),
                    longitude: toNum(longitude),
                    address: toStr(address, 100),
                    openingHours: toStr(openingHours, 200),
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Database operation timed out")), 8000)
                ),
            ]);

            return res.status(201).json(parkToDto(park));
        } catch (err) {
            if (err?.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "park name already exists" });
            }
            if (err?.name === "SequelizeValidationError") {
                return res.status(400).json({ error: err.errors?.[0]?.message || "invalid input" });
            }
            console.error("POST /park failed:", err?.message || err);
            return res.status(500).json({
                error: "internal server error",
                detail: process.env.NODE_ENV !== "production" ? (err?.message || String(err)) : undefined,
            });
        }
    });

    // LIST all parks — must be before GET /:id
    router.get("/", async (_req, res) => {
        try {
            const parks = await Park.findAll({ order: [["name", "ASC"]] });
            return res.json(parks.map(parkToDto));
        } catch (err) {
            console.error("GET /park failed:", err?.stack || err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // GET /park/:id/users — list members of a park
    router.get("/:id/users", async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const park = await Park.findByPk(id);
            if (!park) return res.status(404).json({ error: "park not found" });

            const members = await ParkMember.findAll({
                where: { parkId: id },
                include: [
                    {
                        model: Account,
                        as: "account",
                        attributes: ["id", "username", "firstName", "lastName", "showLastName"],
                    },
                ],
                order: [["createdAt", "ASC"]],
            });

            return res.json(members.map((m) => memberToDto(m.account)));
        } catch (err) {
            console.error("GET /park/:id/users failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // POST /park/:id/associate — logged-in user joins a park (max 4)
    router.post("/:id/associate", auth, async (req, res) => {
        try {
            const me = req.user.id;
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const park = await Park.findByPk(id);
            if (!park) return res.status(404).json({ error: "park not found" });

            const count = await ParkMember.count({ where: { accountId: me } });
            if (count >= 4) {
                return res.status(400).json({ error: "You can be associated with a maximum of 4 skateparks" });
            }

            const existing = await ParkMember.findOne({ where: { parkId: id, accountId: me } });
            if (existing) return res.status(409).json({ error: "already associated with this park" });

            await ParkMember.create({ parkId: id, accountId: me });
            return res.status(201).json({ success: true });
        } catch (err) {
            console.error("POST /park/:id/associate failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // DELETE /park/:id/associate — logged-in user leaves a park
    router.delete("/:id/associate", auth, async (req, res) => {
        try {
            const me = req.user.id;
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const deleted = await ParkMember.destroy({ where: { parkId: id, accountId: me } });
            if (!deleted) return res.status(404).json({ error: "not associated with this park" });

            return res.status(204).send();
        } catch (err) {
            console.error("DELETE /park/:id/associate failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // READ park by id
    router.get("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const park = await Park.findByPk(id);
            if (!park) return res.status(404).json({ error: "park not found" });

            return res.json(parkToDto(park));
        } catch (err) {
            console.error("GET /park/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // UPDATE park (admin only)
    router.put("/:id", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const park = await Park.findByPk(id);
            if (!park) return res.status(404).json({ error: "park not found" });

            const { name, city, county, latitude, longitude, address, openingHours } = req.body;

            if (name !== undefined) {
                if (!name || typeof name !== "string" || !name.trim()) {
                    return res.status(400).json({ error: "name cannot be empty" });
                }
                park.name = name.trim().slice(0, 30);
            }
            if (city !== undefined) park.city = toStr(city, 20);
            if (county !== undefined) park.county = toStr(county, 20);
            if (latitude !== undefined) park.latitude = toNum(latitude);
            if (longitude !== undefined) park.longitude = toNum(longitude);
            if (address !== undefined) park.address = toStr(address, 100);
            if (openingHours !== undefined) park.openingHours = toStr(openingHours, 200);

            await park.save();
            return res.json(parkToDto(park));
        } catch (err) {
            if (err?.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "park name already exists" });
            }
            if (err?.name === "SequelizeValidationError") {
                return res.status(400).json({ error: err.errors?.[0]?.message || "invalid input" });
            }
            console.error("PUT /park/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // DELETE park (admin only)
    router.delete("/:id", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const deleted = await Park.destroy({ where: { id } });
            if (!deleted) return res.status(404).json({ error: "park not found" });

            return res.status(204).send();
        } catch (err) {
            console.error("DELETE /park/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    return router;
}

module.exports = { parksRouter };

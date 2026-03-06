const express = require("express");
const { validate: isUuid } = require("uuid");
const { requireAuth, requireAdmin } = require("../middleware/requireAuth");

function parkToDto(park) {
    return {
        id: park.id,
        name: park.name,
        city: park.city,
        county: park.county,
        latitude: park.latitude,
        longitude: park.longitude,
        createdAt: park.createdAt,
        updatedAt: park.updatedAt,
    };
}

function accountToDto(account) {
    return {
        id: account.id,
        username: account.username,
        parkId: account.parkId,
    };
}

function toNum(val) {
    if (val == null || val === "") return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
}

function parksRouter(models) {
    const router = express.Router();
    const { Park, Account } = models;
    const auth = requireAuth(models);

    // CREATE park (admin only)
    router.post("/", auth, requireAdmin, async (req, res) => {
        console.log("POST /park: handler entered");
        try {
            const { name, city, county, latitude, longitude } = req.body;

            if (!name || typeof name !== "string" || !name.trim()) {
                return res.status(400).json({ error: "name is required" });
            }

            const safeLat = toNum(latitude);
            const safeLng = toNum(longitude);
            const createPromise = Park.create({
                name: name.trim().slice(0, 30),
                city: (city != null && String(city).trim()) ? String(city).trim().slice(0, 20) : null,
                county: (county != null && String(county).trim()) ? String(county).trim().slice(0, 20) : null,
                latitude: safeLat,
                longitude: safeLng,
            });
            const timeoutMs = 8000;
            const park = await Promise.race([
                createPromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Database operation timed out")), timeoutMs)
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

    // LIST all parks — must be before GET /:id or "/" is matched as id
    router.get("/", async (_req, res) => {
        try {
            const parks = await Park.findAll({ order: [["name", "ASC"]] });
            return res.json(parks.map(parkToDto));
        } catch (err) {
            console.error("GET /park failed:", err?.stack || err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // READ park by id
    router.get("/:id", async (req, res) => {
        try {
            const { id } = req.params;

            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid park id (uuid)" });
            }

            const park = await Park.findByPk(id);
            if (!park) {
                return res.status(404).json({ error: "park not found" });
            }

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

            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid park id (uuid)" });
            }

            const park = await Park.findByPk(id);
            if (!park) {
                return res.status(404).json({ error: "park not found" });
            }

            const { name, city, county, latitude, longitude } = req.body;

            if (name !== undefined) {
                if (!name || typeof name !== "string" || !name.trim()) {
                    return res.status(400).json({ error: "name cannot be empty" });
                }
                park.name = name.trim().slice(0, 30);
            }

            if (city !== undefined) park.city = (city != null && String(city).trim()) ? String(city).trim().slice(0, 20) : null;
            if (county !== undefined) park.county = (county != null && String(county).trim()) ? String(county).trim().slice(0, 20) : null;
            if (latitude !== undefined) park.latitude = toNum(latitude);
            if (longitude !== undefined) park.longitude = toNum(longitude);

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

            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid park id (uuid)" });
            }

            const deleted = await Park.destroy({ where: { id } });

            if (!deleted) {
                return res.status(404).json({ error: "park not found" });
            }

            return res.status(204).send();
        } catch (err) {
            console.error("DELETE /park/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // LIST users by park
    router.get("/:id/users", async (req, res) => {
        try {
            const { id } = req.params;

            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid park id (uuid)" });
            }

            const park = await Park.findByPk(id);
            if (!park) {
                return res.status(404).json({ error: "park not found" });
            }

            const accounts = await Account.findAll({
                where: { parkId: id },
                order: [["createdAt", "ASC"]],
            });

            return res.json(accounts.map(accountToDto));
        } catch (err) {
            console.error("GET /park/:id/users failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    return router;
}

module.exports = { parksRouter };

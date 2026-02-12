const express = require("express");
const { validate: isUuid } = require("uuid"); // proper UUID validator

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

function parksRouter(models) {
    const router = express.Router();
    const { Park, Account } = models;

    // CREATE park
    router.post("/", async (req, res) => {
        try {
            const { name, city, county, latitude, longitude } = req.body;

            if (!name || typeof name !== "string" || !name.trim()) {
                return res.status(400).json({ error: "name is required" });
            }

            const park = await Park.create({
                name: name.trim(),
                city: city ?? null,
                county: county ?? null,
                latitude: latitude ?? null,
                longitude: longitude ?? null,
            });

            return res.status(201).json(parkToDto(park));
        } catch (err) {
            if (err?.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "park name already exists" });
            }
            if (err?.name === "SequelizeValidationError") {
                return res.status(400).json({ error: err.errors?.[0]?.message || "invalid input" });
            }
            console.error("POST /park failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // LIST all parks
    // READ park by id: GET /park/:id
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


    // UPDATE park
    router.put("/:id", async (req, res) => {
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
                park.name = name.trim();
            }

            if (city !== undefined) park.city = city || null;
            if (county !== undefined) park.county = county || null;
            if (latitude !== undefined) park.latitude = latitude ?? null;
            if (longitude !== undefined) park.longitude = longitude ?? null;

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

    // DELETE park
    router.delete("/:id", async (req, res) => {
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

    // LIST all parks: GET /park
    router.get("/", async (_req, res) => {
        try {
            const parks = await Park.findAll({ order: [["name", "ASC"]] });
            return res.json(parks.map(parkToDto));
        } catch (err) {
            console.error("GET /park failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

// READ one park by id: GET /park/:id
    router.get("/:id", async (req, res) => {
        try {
            const { id } = req.params;

            // If you're using uuid.validate, keep this.
            // If not, you can remove validation and rely on findByPk + 404.
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const park = await Park.findByPk(id);
            if (!park) return res.status(404).json({ error: "park not found" });

            return res.json(parkToDto(park));
        } catch (err) {
            console.error("GET /park/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });


    return router;
}

module.exports = { parksRouter };

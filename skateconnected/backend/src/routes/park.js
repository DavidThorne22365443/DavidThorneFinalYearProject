const express = require("express");

function isUuid(v) {
    // verifies if UUID is valid
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function parkToDto(park) {
    return {

        // each field is something that every park object will have
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
    // creates a router object which will be used when creating each route
    const router = express.Router();
    const { Park, Account } = models;

    // CREATE route, allows users to create/add skateparks to the map
    router.post("/", async (req, res) => {
        try {
            const { name, city, county, latitude, longitude } = req.body;


            // if the field is empty
            if (!name || typeof name !== "string" || !name.trim()) {
                return res.status(400).json({ error: "name is required" });
            }

            // creates the skatepark based on information given by the user
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
            console.error("POST /parks failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // GET route, gets the park name by ParkId
    router.get("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const park = await Park.findByPk(id);
            if (!park) return res.status(404).json({ error: "park not found" });

            return res.json(parkToDto(park));
        } catch (err) {
            console.error("GET /parks/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // PUT route, allows user to edit park details
    router.put("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const park = await Park.findByPk(id);
            if (!park) return res.status(404).json({ error: "park not found" });

            const { name, city, county, latitude, longitude } = req.body;

            if (name !== undefined) {
                if (!name || typeof name !== "string" || !name.trim()) {
                    return res.status(400).json({ error: "name cannot be empty" });
                }

                // if the proposed changed is ok, then change the name
                park.name = name.trim();
            }
            if (city !== undefined) park.city = city || null;
            if (county !== undefined) park.county = county || null;
            if (latitude !== undefined) park.latitude = latitude || null;
            if (longitude !== undefined) park.longitude = longitude || null;


            // if everything is ok, save the changes
            await park.save();
            return res.json(parkToDto(park));
        } catch (err) {
            if (err?.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "park name already exists" });
            }
            if (err?.name === "SequelizeValidationError") {
                return res.status(400).json({ error: err.errors?.[0]?.message || "invalid input" });
            }
            console.error("PUT /parks/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // DELETE park, remove a park from the database
    router.delete("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            const deleted = await Park.destroy({ where: { id } });
            if (!deleted) return res.status(404).json({ error: "park not found" });

            return res.status(204).send();
        } catch (err) {
            console.error("DELETE /parks/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // LIST users information based on a park
    router.get("/:id/users", async (req, res) => {
        try {
            const { id } = req.params;
            if (!isUuid(id)) return res.status(400).json({ error: "invalid park id (uuid)" });

            // ensure park exists
            const park = await Park.findByPk(id);
            if (!park) return res.status(404).json({ error: "park not found" });

            const accounts = await Account.findAll({
                where: { parkId: id },
                order: [["createdAt", "ASC"]],
            });

            // returns that parks information
            return res.json(accounts.map(accountToDto));
        } catch (err) {
            console.error("GET /parks/:id/users failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    return router;
}

module.exports = { parksRouter };

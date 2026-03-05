const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// uuid regex (same as you had)
function isUuid(v) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

// SAFE auth middleware: always responds or calls next()
function requireAuth(req, res, next) {
    const header = req.header("authorization") || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "missing bearer token" });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: "JWT_SECRET missing on server" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const userId = payload?.sub;

        if (!userId || typeof userId !== "string" || !isUuid(userId)) {
            return res.status(401).json({ error: "invalid token payload" });
        }

        req.userId = userId;
        return next();
    } catch (err) {
        return res.status(401).json({ error: "invalid or expired token" });
    }
}

function accountsRouter(models) {
    const router = express.Router();
    const { Account } = models;

    // -----------------------
    // AUTH
    // -----------------------

    // POST /accounts/register
    router.post("/register", async (req, res) => {
        try {
            const { username, password } = req.body || {};

            if (!username || typeof username !== "string" || !username.trim()) {
                return res.status(400).json({ error: "username is required" });
            }
            if (!password || typeof password !== "string" || password.length < 6) {
                return res.status(400).json({ error: "password must be at least 6 characters" });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const account = await Account.create({
                username: username.trim(),
                passwordHash,
            });

            return res.status(201).json({
                id: account.id,
                username: account.username,
                parkId: account.parkId ?? null,
                createdAt: account.createdAt,
                updatedAt: account.updatedAt,
            });
        } catch (err) {
            if (err?.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "username already exists" });
            }
            console.error("POST /accounts/register failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // POST /accounts/login
    router.post("/login", async (req, res) => {
        try {
            const { username, password } = req.body || {};

            if (!username || typeof username !== "string" || !username.trim()) {
                return res.status(400).json({ error: "username is required" });
            }
            if (!password || typeof password !== "string") {
                return res.status(400).json({ error: "password is required" });
            }

            const account = await Account.findOne({ where: { username: username.trim() } });
            if (!account) return res.status(401).json({ error: "invalid credentials" });

            const ok = await bcrypt.compare(password, account.passwordHash);
            if (!ok) return res.status(401).json({ error: "invalid credentials" });

            if (!process.env.JWT_SECRET) {
                return res.status(500).json({ error: "JWT_SECRET missing on server" });
            }

            const token = jwt.sign(
                { sub: account.id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
            );

            return res.json({
                token,
                account: {
                    id: account.id,
                    username: account.username,
                    parkId: account.parkId ?? null,
                    createdAt: account.createdAt,
                    updatedAt: account.updatedAt,
                },
            });
        } catch (err) {
            console.error("POST /accounts/login failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // GET /accounts/me   (IMPORTANT: must be BEFORE "/:id")
    router.get("/me", requireAuth, async (req, res) => {
        try {
            // debug logs so we can see where it would hang
            console.log("GET /accounts/me userId =", req.userId);

            const account = await Account.findByPk(req.userId, {
                attributes: ["id", "username", "parkId", "createdAt", "updatedAt"],
            });

            if (!account) return res.status(404).json({ error: "account not found" });

            return res.json(account);
        } catch (err) {
            console.error("GET /accounts/me failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // -----------------------
    // EXISTING CRUD
    // -----------------------

    // POST /accounts  (old create route; keep if you still want it)
    router.post("/", async (req, res) => {
        try {
            const { username } = req.body;

            if (!username || typeof username !== "string" || username.trim() === "") {
                return res.status(400).json({ error: "username is required" });
            }

            const account = await Account.create({ username: username.trim() });
            return res.status(201).json(account);
        } catch (err) {
            if (err?.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "username already exists" });
            }
            if (err?.name === "SequelizeValidationError") {
                return res.status(400).json({ error: err.errors?.[0]?.message || "invalid input" });
            }
            console.error("POST /accounts failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // GET /accounts/:id
    router.get("/:id", async (req, res) => {
        try {
            const { id } = req.params;

            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid account id (uuid)" });
            }

            const account = await Account.findByPk(id);
            if (!account) {
                return res.status(404).json({ error: "account not found" });
            }

            return res.json(account);
        } catch (err) {
            console.error("GET /accounts/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // PUT /accounts/:id
    router.put("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const { username } = req.body;

            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid account id (uuid)" });
            }
            if (!username || typeof username !== "string" || username.trim() === "") {
                return res.status(400).json({ error: "username is required" });
            }

            const account = await Account.findByPk(id);
            if (!account) {
                return res.status(404).json({ error: "account not found" });
            }

            account.username = username.trim();
            await account.save();

            return res.json(account);
        } catch (err) {
            if (err?.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "username already exists" });
            }
            if (err?.name === "SequelizeValidationError") {
                return res.status(400).json({ error: err.errors?.[0]?.message || "invalid input" });
            }
            console.error("PUT /accounts/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // DELETE /accounts/:id
    router.delete("/:id", async (req, res) => {
        try {
            const { id } = req.params;

            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid account id (uuid)" });
            }

            const deleted = await Account.destroy({ where: { id } });
            if (!deleted) {
                return res.status(404).json({ error: "account not found" });
            }

            return res.status(204).send();
        } catch (err) {
            console.error("DELETE /accounts/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    return router;
}

module.exports = { accountsRouter };
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendVerificationEmail } = require("../lib/sendVerificationEmail");
const { sendPasswordResetEmail } = require("../lib/sendPasswordResetEmail");
const { requireAuth, requireAdmin } = require("../middleware/requireAuth");

function isUuid(v) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function accountToSafeJson(account) {
    const o = account.toJSON ? account.toJSON() : account;
    const { passwordHash, verificationCode, verificationCodeExpiresAt, resetToken, resetTokenExpiresAt, ...safe } = o;
    return safe;
}

function accountsRouter(models) {
    const router = express.Router();
    const { Account, PendingRegistration, ParkMember, ConversationParticipant, Conversation, Skatespot, Notice } = models;

    // -----------------------
    // AUTH
    // -----------------------

    // POST /accounts/register — store pending signup and send code; no account created yet
    router.post("/register", async (req, res) => {
        try {
            const {
                username,
                password,
                email,
                firstName,
                lastName,
                showLastName,
                favouriteTrick,
                city,
                skillLevel,
            } = req.body || {};

            if (!username || typeof username !== "string" || !username.trim()) {
                return res.status(400).json({ error: "username is required" });
            }
            if (!email || typeof email !== "string" || !email.trim()) {
                return res.status(400).json({ error: "email is required" });
            }
            const emailTrimmed = email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailTrimmed)) {
                return res.status(400).json({ error: "please enter a valid email address" });
            }
            if (!password || typeof password !== "string" || password.length < 6) {
                return res.status(400).json({ error: "password must be at least 6 characters" });
            }

            const existingUsername = await Account.findOne({ where: { username: username.trim() } });
            if (existingUsername) {
                return res.status(409).json({ error: "An account with this username already exists" });
            }
            const existingEmail = await Account.findOne({ where: { email: emailTrimmed } });
            if (existingEmail) {
                return res.status(409).json({ error: "An account with this email already exists" });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
            const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await PendingRegistration.destroy({ where: { email: emailTrimmed } });
            await PendingRegistration.create({
                email: emailTrimmed,
                verificationCode,
                verificationCodeExpiresAt,
                username: username.trim(),
                passwordHash,
                firstName: firstName != null ? String(firstName).trim().slice(0, 50) : null,
                lastName: lastName != null ? String(lastName).trim().slice(0, 50) : null,
                showLastName: showLastName !== false,
                favouriteTrick: favouriteTrick != null && String(favouriteTrick).trim() ? String(favouriteTrick).trim().slice(0, 80) : null,
                city: city != null && String(city).trim() ? String(city).trim().slice(0, 50) : null,
                skillLevel: ["beginner", "intermediate", "advanced"].includes(skillLevel) ? skillLevel : null,
            });
            await sendVerificationEmail(emailTrimmed, verificationCode);
            return res.status(201).json({
                message: "Check your email for a verification code",
                email: emailTrimmed,
            });
        } catch (err) {
            console.error("POST /accounts/register failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // POST /accounts/verify-email — only then create the account
    router.post("/verify-email", async (req, res) => {
        try {
            const { email, code } = req.body || {};
            if (!email || typeof email !== "string" || !email.trim()) {
                return res.status(400).json({ error: "email is required" });
            }
            if (!code || typeof code !== "string" || !code.trim()) {
                return res.status(400).json({ error: "verification code is required" });
            }

            const emailTrimmed = email.trim().toLowerCase();
            const codeTrimmed = code.trim();
            const now = new Date();

            const pending = await PendingRegistration.findOne({
                where: {
                    email: emailTrimmed,
                    verificationCode: codeTrimmed,
                },
            });

            if (!pending) {
                return res.status(400).json({ error: "Invalid or expired verification code" });
            }
            if (pending.verificationCodeExpiresAt < now) {
                await PendingRegistration.destroy({ where: { email: emailTrimmed } });
                return res.status(400).json({ error: "Verification code has expired" });
            }

            const existingUsername = await Account.findOne({ where: { username: pending.username } });
            if (existingUsername) {
                await PendingRegistration.destroy({ where: { email: emailTrimmed } });
                return res.status(409).json({ error: "An account with this username was created meanwhile. Please log in or register with a different username." });
            }
            const existingEmail = await Account.findOne({ where: { email: emailTrimmed } });
            if (existingEmail) {
                await PendingRegistration.destroy({ where: { email: emailTrimmed } });
                return res.status(409).json({ error: "An account with this email already exists" });
            }

            await Account.create({
                username: pending.username,
                email: emailTrimmed,
                passwordHash: pending.passwordHash,
                firstName: pending.firstName,
                lastName: pending.lastName,
                showLastName: pending.showLastName,
                favouriteTrick: pending.favouriteTrick,
                city: pending.city,
                skillLevel: pending.skillLevel ?? null,
                emailVerified: true,
            });

            await PendingRegistration.destroy({ where: { email: emailTrimmed } });

            return res.status(200).json({ message: "Email verified. You can now log in." });
        } catch (err) {
            console.error("POST /accounts/verify-email failed:", err);
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

            if (!account.emailVerified) {
                return res.status(403).json({
                    error: "Please verify your email first. Check your inbox for the verification code.",
                    code: "EMAIL_NOT_VERIFIED",
                });
            }

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
                    firstName: account.firstName,
                    lastName: account.lastName,
                    showLastName: account.showLastName,
                    favouriteTrick: account.favouriteTrick,
                    city: account.city,
                    createdAt: account.createdAt,
                    updatedAt: account.updatedAt,
                },
            });
        } catch (err) {
            console.error("POST /accounts/login failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // POST /accounts/forgot-password — generate reset token and email link
    router.post("/forgot-password", async (req, res) => {
        try {
            const { email } = req.body || {};
            if (!email || typeof email !== "string" || !email.trim()) {
                return res.status(400).json({ error: "email is required" });
            }

            const emailTrimmed = email.trim().toLowerCase();
            const account = await Account.findOne({ where: { email: emailTrimmed } });

            // Always respond with success to avoid leaking whether an email exists
            if (!account) {
                return res.status(200).json({ message: "If that email is registered, you'll receive a reset link shortly." });
            }

            const token = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            account.resetToken = token;
            account.resetTokenExpiresAt = expiresAt;
            await account.save();

            const baseUrl = process.env.APP_URL || "http://localhost:3000";
            const resetLink = `${baseUrl}/reset-password?token=${token}`;

            await sendPasswordResetEmail(emailTrimmed, resetLink);

            return res.status(200).json({ message: "If that email is registered, you'll receive a reset link shortly." });
        } catch (err) {
            console.error("POST /accounts/forgot-password failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // POST /accounts/reset-password — validate token and update password
    router.post("/reset-password", async (req, res) => {
        try {
            const { token, password } = req.body || {};
            if (!token || typeof token !== "string" || !token.trim()) {
                return res.status(400).json({ error: "reset token is required" });
            }
            if (!password || typeof password !== "string" || password.length < 6) {
                return res.status(400).json({ error: "password must be at least 6 characters" });
            }

            const account = await Account.findOne({ where: { resetToken: token.trim() } });
            if (!account || !account.resetTokenExpiresAt || account.resetTokenExpiresAt < new Date()) {
                return res.status(400).json({ error: "This reset link is invalid or has expired." });
            }

            account.passwordHash = await bcrypt.hash(password, 10);
            account.resetToken = null;
            account.resetTokenExpiresAt = null;
            await account.save();

            return res.status(200).json({ message: "Password updated successfully. You can now log in." });
        } catch (err) {
            console.error("POST /accounts/reset-password failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    const auth = requireAuth(models);

    // GET /accounts/me   (IMPORTANT: must be BEFORE "/:id")
    router.get("/me", auth, async (req, res) => {
        try {
            return res.json(accountToSafeJson(req.user));
        } catch (err) {
            console.error("GET /accounts/me failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // PUT /accounts/me — update own profile fields
    router.put("/me", auth, async (req, res) => {
        try {
            const allowed = ["showLastName", "firstName", "lastName", "favouriteTrick", "city", "skillLevel"];
            const updates = {};

            for (const field of allowed) {
                if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                    updates[field] = req.body[field];
                }
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: "no updatable fields provided" });
            }

            if ("showLastName" in updates) {
                updates.showLastName = Boolean(updates.showLastName);
            }

            await req.user.update(updates);
            return res.json(accountToSafeJson(req.user));
        } catch (err) {
            console.error("PUT /accounts/me failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // GET /accounts/me/parks — park IDs the logged-in user is a member of
    router.get("/me/parks", auth, async (req, res) => {
        try {
            const memberships = await ParkMember.findAll({
                where: { accountId: req.user.id },
                attributes: ["parkId"],
            });
            return res.json(memberships.map((m) => m.parkId));
        } catch (err) {
            console.error("GET /accounts/me/parks failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // -----------------------
    // ADMIN-ONLY CRUD
    // -----------------------

    // GET /accounts  (list all — admin only)
    router.get("/", auth, requireAdmin, async (req, res) => {
        try {
            const accounts = await Account.findAll({
                order: [["username", "ASC"]],
                attributes: ["id", "username", "email", "parkId", "firstName", "lastName", "showLastName", "favouriteTrick", "city", "emailVerified", "isAdmin", "createdAt", "updatedAt"],
            });
            return res.json(accounts);
        } catch (err) {
            console.error("GET /accounts failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // POST /accounts  (admin create; minimal)
    router.post("/", auth, requireAdmin, async (req, res) => {
        try {
            const { username } = req.body;

            if (!username || typeof username !== "string" || username.trim() === "") {
                return res.status(400).json({ error: "username is required" });
            }

            const account = await Account.create({ username: username.trim() });
            return res.status(201).json(accountToSafeJson(account));
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

    // GET /accounts/:id  (admin only)
    router.get("/:id", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;

            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid account id (uuid)" });
            }

            const account = await Account.findByPk(id);
            if (!account) {
                return res.status(404).json({ error: "account not found" });
            }

            return res.json(accountToSafeJson(account));
        } catch (err) {
            console.error("GET /accounts/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // PUT /accounts/:id  (admin only)
    router.put("/:id", auth, requireAdmin, async (req, res) => {
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

            return res.json(accountToSafeJson(account));
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

    // DELETE /accounts/:id  (admin only)
    router.delete("/:id", auth, requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;

            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid account id (uuid)" });
            }

            const account = await Account.findByPk(id);
            if (!account) {
                return res.status(404).json({ error: "account not found" });
            }

            // 1. Remove park memberships
            await ParkMember.destroy({ where: { accountId: id } });

            // 2. Delete all conversations this user is part of (cascades to messages + participants)
            const participantRows = await ConversationParticipant.findAll({ where: { accountId: id }, attributes: ["conversationId"] });
            const convIds = participantRows.map((r) => r.conversationId);
            if (convIds.length > 0) {
                await Conversation.destroy({ where: { id: convIds } });
            }

            // 3. Null out skate spots submitted by this user (addedById is nullable)
            await Skatespot.update({ addedById: null }, { where: { addedById: id } });

            // 4. Delete notices submitted by this user (addedById is not nullable)
            await Notice.destroy({ where: { addedById: id } });

            // 5. Delete the account
            await account.destroy();

            return res.status(204).send();
        } catch (err) {
            console.error("DELETE /accounts/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    return router;
}

module.exports = { accountsRouter };
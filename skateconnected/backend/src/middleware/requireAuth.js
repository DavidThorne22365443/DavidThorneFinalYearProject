const jwt = require("jsonwebtoken");

function requireAuth(models) {
    const { Account } = models;

    return async (req, res, next) => {
        try {
            const auth = req.header("authorization") || "";
            const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

            if (!token) return res.status(401).json({ error: "missing token" });

            const payload = jwt.verify(token, process.env.JWT_SECRET);
            const user = await Account.findByPk(payload.sub);

            if (!user) return res.status(401).json({ error: "account not found" });

            req.user = user;
            next();
        } catch (e) {
            return res.status(401).json({ error: "invalid or expired token" });
        }
    };
}

module.exports = { requireAuth };
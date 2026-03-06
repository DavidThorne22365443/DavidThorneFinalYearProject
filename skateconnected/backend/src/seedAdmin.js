const bcrypt = require("bcrypt");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "adminDavid2004";

async function seedAdmin(Account) {
    const existing = await Account.findOne({ where: { username: ADMIN_USERNAME } });
    if (existing) {
        if (existing.isAdmin) return;
        existing.isAdmin = true;
        await existing.save();
        console.log("✅ Admin user updated (isAdmin=true)");
        return;
    }
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await Account.create({
        username: ADMIN_USERNAME,
        passwordHash,
        email: "admin@skateconnected.local",
        emailVerified: true,
        isAdmin: true,
    });
    console.log("✅ Admin user created (username: admin, password: adminDavid2004)");
}

module.exports = { seedAdmin };

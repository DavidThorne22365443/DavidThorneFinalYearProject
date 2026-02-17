const { Sequelize } = require("sequelize");

function createSequelize() {
    const url = process.env.DATABASE_URL;

    if (!url) {
        // Fail early with a clear message
        throw new Error("DATABASE_URL is missing. Check backend/.env");
    }

    return new Sequelize(url, {
        dialect: "postgres",
        logging: console.log, // temp: see if INSERT runs (set back to false when done)
    });
}

module.exports = { createSequelize };

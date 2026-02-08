require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createSequelize } = require("./db/sequelize");


const { initModels } = require("./models");
const { accountsRouter } = require("./routes/accounts");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

async function start() {
    const port = Number(process.env.PORT || 5001);

    try {
        const sequelize = createSequelize();
        await sequelize.authenticate();
        console.log("✅ Connected to Postgres via Sequelize");

        const models = initModels(sequelize);

        // Creates tables if they don't exist (good for dev; later use migrations)
        await sequelize.sync();
        console.log("✅ Models synced");

        app.use("/accounts", accountsRouter(models));

        app.listen(port, () => {
            console.log(`✅ Backend listening on http://localhost:${port}`);
        });
    } catch (err) {
        console.error("❌ Startup failed:", err.message);
        process.exit(1);
    }
}

start();

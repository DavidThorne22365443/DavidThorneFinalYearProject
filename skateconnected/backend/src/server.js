require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createSequelize } = require("./db/sequelize");


const { initModels } = require("./models");
const { accountsRouter } = require("./routes/accounts");
const { parksRouter } = require("./routes/park");


const app = express();

app.use((req, res, next) => {
    console.log("REQ IN:", req.method, req.url);
    res.on("finish", () => console.log("REQ OUT:", req.method, req.url, res.statusCode));
    next();
});

app.get("/ping", (req, res) => {
    console.log("HIT /ping");
    res.status(200).send("pong");
});

app.get("/ping", (req, res) => res.status(200).send("pong"));

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

        app.use("/accounts", accountsRouter(models)); // wiring the account routes into the server
        app.use("/park", parksRouter(models));  // wiring the park routes into the server


        app.listen(port, () => {
            console.log(`✅ Backend listening on http://localhost:${port}`);
        });
    } catch (err) {
        console.error("❌ Startup failed:", err.message);
        process.exit(1);
    }
}

start();

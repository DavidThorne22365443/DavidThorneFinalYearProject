require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createSequelize } = require("./db/sequelize");


const { initModels } = require("./models");
const { accountsRouter } = require("./routes/accounts");
const { parksRouter } = require("./routes/park");
const { chatRouter } = require("./routes/chat");






const app = express();

// Health and ping first — no body parsing, so they can't hang
app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/ping", (req, res) => res.status(200).send("pong"));

app.use((req, res, next) => {
    console.log("REQ IN:", req.method, req.url);
    res.on("finish", () => console.log("REQ OUT:", req.method, req.url, res.statusCode));
    next();
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/ping", (req, res) => {
    console.log("POST /ping hit, body:", req.body);
    res.json({ pong: true, body: req.body });
});

const port = Number(process.env.PORT || 5001);

// Listen immediately so /health works even if DB is slow or hung.
// Park and account routes are added after DB is ready.
const server = app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use!`);
        console.error(`   Kill existing processes: kill -9 $(lsof -ti :${port})`);
        process.exit(1);
    }
    throw err;
});

async function connectDbAndMountRoutes() {
    try {
        const sequelize = createSequelize();
        await sequelize.authenticate();
        console.log("Connected to Postgres via Sequelize");

        const models = initModels(sequelize);
        await sequelize.sync({ alter: true }); //allows table to be altered if necessary
        console.log("✅ Models synced (alter)");

        app.use("/accounts", accountsRouter(models));
        app.use("/park", parksRouter(models));
        app.use("/chat", chatRouter(models));
    } catch (err) {
        console.error("DB setup failed (server still up, /health works):", err?.stack || err);
    }
}

connectDbAndMountRoutes();

const express = require("express");

function isUuid(v) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    //the line above basically checks if v is a valid UUID. if it is it returns true, otherwise it returns
    //false.


}

function accountsRouter(models) {
    const router = express.Router();
    const { Account } = models;

    // this is the create route for creating an account. the POST method is used here

    router.post("/", async (req, res) => {
        try {
            const { username } = req.body;

            // the following two lines checks if a username of the required length and type is being used
            if (!username || typeof username !== "string" || username.trim() === "") {
                return res.status(400).json({ error: "username is required" });
            }

            // if the username reaches the requirements, the account is created
            const account = await Account.create({ username: username.trim() });
            return res.status(201).json(account);
        } catch (err) {


            // specific error code 409 telling the user if the username already exists
            if (err?.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "username already exists" });
            }

            // specific error code 400 which tells the user if there is an invalid input
            if (err?.name === "SequelizeValidationError") {
                return res.status(400).json({ error: err.errors?.[0]?.message || "invalid input" });
            }

            // tells teh user if there is an internal server error
            console.error("POST /accounts failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // this is teh read route used to get the ID of an account

    router.get("/:id", async (req, res) => {
        try {
            const { id } = req.params;

            // checks if the ID actually exists/is valid
            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid account id (uuid)" });
            }

            // if the ID does exist, then find it
            const account = await Account.findByPk(id);


            // if the account does not exist, throw an error telling the user that
            if (!account) {
                return res.status(404).json({ error: "account not found" });
            }

            return res.json(account);
        } catch (err) {

            // theres a server error, throw an error telling the user that
            console.error("GET /accounts/:id failed:", err);
            return res.status(500).json({ error: "internal server error" });
        }
    });

    // allows users to change/update their username

    router.put("/:id", async (req,
                              res) => {
        try {
            const { id } = req.params;
            const { username } = req.body;

            // checks if the ID and username are within the requirements
            if (!isUuid(id)) {
                return res.status(400).json({ error: "invalid account id (uuid)" });
            }
            if (!username || typeof username !== "string" || username.trim() === "") {
                return res.status(400).json({ error: "username is required" });
            }

            //if the requirements are met, it finds the account associated with that ID.

            const account = await Account.findByPk(id);

            //if it cant find the account it throws an error
            if (!account) {
                return res.status(404).json({ error: "account not found" });
            }

            // username is changed and saved
            account.username = username.trim();
            await account.save();

            // return the account, if not throw an error
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

    // delete route code for removing an account
    router.delete("/:id", async (req,
                                 res) => {
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

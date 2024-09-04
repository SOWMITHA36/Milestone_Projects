const express = require("express");
const router = express.Router();
const SyncController = require("../controllers/sync.controller");


router.post("/ticketdetails", (req, res) => SyncController.storeConfigs(req, res));

module.exports = router;
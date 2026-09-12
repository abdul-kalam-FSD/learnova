const express = require("express");
const router = express.Router();
const { getProfileStats, updateStream } = require("../controllers/profileControllers");
const { protect } = require("../middleware/authMiddleware");

router.get("/stats", protect, getProfileStats);
router.patch("/stream", protect, updateStream);

module.exports = router;
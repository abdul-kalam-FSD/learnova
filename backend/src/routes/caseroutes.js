const express = require("express");
const router = express.Router();
const { getCases, startCase, getRecommendedCase } = require("../controllers/caseControllers");
const { protect } = require("../middleware/authMiddleware");
router.get("/recommended", protect, getRecommendedCase)
router.get("/", protect, getCases);
router.post("/:caseId/start", protect, startCase);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  getGameContentList,
  startGame,
  submitGameAttempt,
  completeGame,
  getGameCatalog,
  getRecommendedGame,
} = require("../controllers/gameControllers");
const { protect } = require("../middleware/authMiddleware");

// NOTE: static paths (/catalog, /recommended, /content) must be
// registered before the /:sessionId/* dynamic routes below, or
// Express would try to match "catalog"/"recommended" as a sessionId.
router.get("/catalog", protect, getGameCatalog);
router.get("/recommended", protect, getRecommendedGame);
router.get("/content", protect, getGameContentList);
router.post("/start", protect, startGame);
router.post("/:sessionId/attempt", protect, submitGameAttempt);
router.post("/:sessionId/complete", protect, completeGame);

module.exports = router;

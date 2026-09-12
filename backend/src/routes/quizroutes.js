const express = require("express");
const router = express.Router();
const {
  startQuiz,
  submitAnswer,
  completeQuiz,
  getHome,
} = require("../controllers/quizControllers");
const { protect } = require("../middleware/authMiddleware");

router.post("/start", protect, startQuiz);
router.post("/:sessionId/answer", protect, submitAnswer);
router.post("/:sessionId/complete", protect, completeQuiz);
module.exports = router;

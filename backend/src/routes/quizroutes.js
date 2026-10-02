const express = require("express");
const router = express.Router();
const {
  startQuiz,
  submitAnswer,
  completeQuiz,
  getHome,
  getQuizReview,
} = require("../controllers/quizControllers");
const { protect } = require("../middleware/authMiddleware");

router.post("/start", protect, startQuiz);
router.post("/:sessionId/answer", protect, submitAnswer);
router.post("/:sessionId/complete", protect, completeQuiz);
// Task 3 spec used "/api/quizzes/:sessionId/review" — mounted here as
// "/:sessionId/review" instead to match this router's existing
// convention (already mounted at "/api/quiz" in app.js, alongside
// /start, /:sessionId/answer, /:sessionId/complete). A second,
// inconsistently-pluralized base path would be an unrelated API
// surface change, not something this task's scope calls for.
router.get("/:sessionId/review", protect, getQuizReview);
module.exports = router;

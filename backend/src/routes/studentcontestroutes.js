const express = require("express");
const router = express.Router();
const { listStudentContests, getStudentContest } = require("../controllers/studentContestControllers");
const { studentContestResult, studentContestLeaderboard } = require("../controllers/contestResultControllers");
const { protect } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/studentMiddleware");

// Student-facing contest discovery. Read-only: taking part goes through
// the EXISTING game endpoints (POST /api/games/start with a contestId,
// then /attempt and /complete), so there is deliberately no "join" or
// "submit" route here and nothing that can change a contest's status.
router.use(protect, requireStudent);

router.get("/", listStudentContests);
router.get("/:id", getStudentContest);
router.get("/:id/result", studentContestResult);
router.get("/:id/leaderboard", studentContestLeaderboard);

module.exports = router;

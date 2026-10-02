const express = require("express");
const router = express.Router();
const {
  createContest,
  listMyContests,
  submitContestForApproval,
  listGameOptions,
} = require("../controllers/contestControllers");
const {
  teacherContestResults,
  teacherContestParticipant,
  teacherContestExport,
} = require("../controllers/contestResultControllers");
const { protect } = require("../middleware/authMiddleware");
const { requireTeacher } = require("../middleware/teacherMiddleware");

// Every contest-management route is teacher/admin only — students get
// a 403 from requireTeacher (same middleware, same rules as the rest
// of the teacher portal: admins pass, pending teachers are blocked).
// Student-facing contest routes (browse/participate) are a later task
// and will be added separately, without loosening these.
router.use(protect, requireTeacher);

// Static paths first, before any /:id route.
router.get("/my", listMyContests);
router.get("/game-options", listGameOptions);
router.post("/", createContest);
router.post("/:id/submit", submitContestForApproval);

// Results for contests the requesting teacher owns (read-only).
router.get("/:id/results", teacherContestResults);
// Registered BEFORE /results/:studentId so "export" is never read as a student id.
router.get("/:id/results/export", teacherContestExport);
router.get("/:id/results/:studentId", teacherContestParticipant);

module.exports = router;

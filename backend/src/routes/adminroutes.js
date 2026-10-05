const express = require("express");
const router = express.Router();
const {
  listUsers,
  listStudents,
  getStudentDetail,
  getResults,
  exportResultsExcel,
  downloadSyncedWorkbook,
  retrySync,
  setUserRole,
  getTeacherStudents,
  getDashboardStats,
} = require("../controllers/adminControllers");
const {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  listStreams,
  createStream,
  updateStream,
  deleteStream,
  listChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  listConcepts,
  createConcept,
  updateConcept,
  deleteConcept,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listGameContent,
  createGameContent,
  updateGameContent,
  deleteGameContent,
} = require("../controllers/contentControllers");
const {
  listCases,
  getCaseDetail,
  createCase,
  updateCase,
  deleteCase,
} = require("../controllers/caseAdminControllers");
const {
  listSections,
  createSection,
  updateSection,
  deleteSection,
  addStudentToSection,
  removeStudentFromSection,
} = require("../controllers/sectionControllers");
const {
  listContests,
  getContestDetail,
  approveContest,
  rejectContest,
} = require("../controllers/adminContestControllers");
const {
  adminContestResults,
  adminContestParticipant,
  adminContestExport,
} = require("../controllers/contestResultControllers");
const { protect } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

router.use(protect, requireAdmin);

router.get("/stats", getDashboardStats);
router.get("/users", listUsers);
router.get("/students", listStudents);
router.get("/students/:id", getStudentDetail);
router.get("/results", getResults);
router.get("/results/export", exportResultsExcel);
router.get("/results/synced-file", downloadSyncedWorkbook);
router.post("/results/:sessionId/retry-sync", retrySync);
router.patch("/users/:id/role", setUserRole);
router.get("/teachers/:id/students", getTeacherStudents);

router.get("/subjects", listSubjects);
router.post("/subjects", createSubject);
router.patch("/subjects/:id", updateSubject);
router.delete("/subjects/:id", deleteSubject);

router.get("/streams", listStreams);
router.post("/streams", createStream);
router.patch("/streams/:id", updateStream);
router.delete("/streams/:id", deleteStream);

router.get("/chapters", listChapters);
router.post("/chapters", createChapter);
router.patch("/chapters/:id", updateChapter);
router.delete("/chapters/:id", deleteChapter);

router.get("/concepts", listConcepts);
router.post("/concepts", createConcept);
router.patch("/concepts/:id", updateConcept);
router.delete("/concepts/:id", deleteConcept);

router.get("/questions", listQuestions);
router.post("/questions", createQuestion);
router.patch("/questions/:id", updateQuestion);
router.delete("/questions/:id", deleteQuestion);

router.get("/game-content", listGameContent);
router.post("/game-content", createGameContent);
router.patch("/game-content/:id", updateGameContent);
router.delete("/game-content/:id", deleteGameContent);

router.get("/cases", listCases);
router.get("/cases/:id", getCaseDetail);
router.post("/cases", createCase);
router.patch("/cases/:id", updateCase);
router.delete("/cases/:id", deleteCase);

router.get("/sections", listSections);
router.post("/sections", createSection);
router.patch("/sections/:id", updateSection);
router.delete("/sections/:id", deleteSection);
router.post("/sections/:id/students", addStudentToSection);
router.delete("/sections/:id/students/:studentId", removeStudentFromSection);

// Contest review (teachers create/submit via /api/contests; admins
// review here). Status/reviewer are decided server-side — see
// controllers/adminContestControllers.js.
router.get("/contests", listContests);
router.get("/contests/:id", getContestDetail);
router.post("/contests/:id/approve", approveContest);
router.post("/contests/:id/reject", rejectContest);
// Results / leaderboard for published contests (read-only).
router.get("/contests/:id/results", adminContestResults);
// Registered BEFORE /results/:studentId so "export" is never read as a student id.
router.get("/contests/:id/results/export", adminContestExport);
router.get("/contests/:id/results/:studentId", adminContestParticipant);

module.exports = router;

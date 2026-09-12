const express = require("express");
const router = express.Router();
const {
  listStudents,
  getStudentDetail,
  getStudentMastery,
  getWeakAreas,
  getOverview,
  getSections,
  getContentTree,
} = require("../controllers/teacherControllers");
const { protect } = require("../middleware/authMiddleware");
const { requireTeacher } = require("../middleware/teacherMiddleware");

router.use(protect, requireTeacher);

router.get("/overview", getOverview);
router.get("/weak-areas", getWeakAreas);
router.get("/sections", getSections);
router.get("/content-tree", getContentTree);
router.get("/students", listStudents);
router.get("/students/:studentId", getStudentDetail);
router.get("/students/:studentId/mastery", getStudentMastery);

module.exports = router;

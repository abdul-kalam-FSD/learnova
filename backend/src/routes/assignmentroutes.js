const express = require("express");
const router = express.Router();
const {
  createAssignment,
  listTeacherAssignments,
  getAssignmentDetail,
  cancelAssignment,
  listMyAssignments,
} = require("../controllers/assignmentControllers");
const { protect } = require("../middleware/authMiddleware");
const { requireTeacher } = require("../middleware/teacherMiddleware");

router.use(protect);

// Student-facing — any authenticated user (in practice, students).
router.get("/mine", listMyAssignments);

// Teacher/admin-facing.
router.post("/", requireTeacher, createAssignment);
router.get("/teacher", requireTeacher, listTeacherAssignments);
router.get("/teacher/:id", requireTeacher, getAssignmentDetail);
router.delete("/:id", requireTeacher, cancelAssignment);

module.exports = router;

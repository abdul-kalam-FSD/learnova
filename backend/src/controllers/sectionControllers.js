const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const Section = require("../models/Section");
const User = require("../models/User");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ---------- Sections (class/section groupings for teacher scoping) ----------

const listSections = async (req, res) => {
  try {
    const filter = {};
    if (req.query.grade) filter.grade = Number(req.query.grade);
    if (req.query.teacher_id) {
      if (!isValidId(req.query.teacher_id)) {
        return res.status(400).json({ message: "Invalid teacher_id" });
      }
      filter.teacher_id = req.query.teacher_id;
    }
    const sections = await Section.find(filter)
      .populate("teacher_id", "name email")
      .populate("student_ids", "name email grade")
      .sort({ grade: 1, name: 1 });
    res.status(200).json({ sections });
  } catch (err) {
    sendError(res, err);
  }
};

const createSection = async (req, res) => {
  try {
    const { name, grade, teacher_id } = req.body;
    if (!name || !grade || !teacher_id) {
      return res.status(400).json({ message: "name, grade and teacher_id are required" });
    }
    if (!isValidId(teacher_id)) {
      return res.status(400).json({ message: "Invalid teacher_id" });
    }
    const teacher = await User.findById(teacher_id);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(400).json({ message: "teacher_id must reference an existing teacher account" });
    }
    const section = await Section.create({ name, grade, teacher_id, student_ids: [] });
    res.status(201).json({ section });
  } catch (err) {
    sendError(res, err);
  }
};

const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const { name, teacher_id } = req.body;
    if (teacher_id) {
      if (!isValidId(teacher_id)) {
        return res.status(400).json({ message: "Invalid teacher_id" });
      }
      const teacher = await User.findById(teacher_id);
      if (!teacher || teacher.role !== "teacher") {
        return res.status(400).json({ message: "teacher_id must reference an existing teacher account" });
      }
    }

    const section = await Section.findByIdAndUpdate(
      id,
      { ...(name && { name }), ...(teacher_id && { teacher_id }) },
      { new: true, runValidators: true },
    )
      .populate("teacher_id", "name email")
      .populate("student_ids", "name email grade");
    if (!section) return res.status(404).json({ message: "Section not found" });
    res.status(200).json({ section });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const section = await Section.findByIdAndDelete(id);
    if (!section) return res.status(404).json({ message: "Section not found" });
    res.status(200).json({ message: "Section deleted" });
  } catch (err) {
    sendError(res, err);
  }
};

// POST /api/admin/sections/:id/students  { studentId }
// A student belongs to at most one section — if they're already in a
// different section, this fails rather than silently moving them, so
// the admin makes that move explicitly (remove-then-add) instead of
// it happening as a side effect.
const addStudentToSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid section id" });
    if (!studentId || !isValidId(studentId)) {
      return res.status(400).json({ message: "Valid studentId is required" });
    }

    const section = await Section.findById(id);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const student = await User.findById(studentId);
    if (!student || student.role !== "student" || student.is_guest) {
      return res.status(400).json({ message: "studentId must reference an existing enrolled student account" });
    }
    if (student.grade !== section.grade) {
      return res.status(400).json({
        message: `Grade mismatch: student is grade ${student.grade}, section is grade ${section.grade}`,
      });
    }

    const existingSection = await Section.findOne({ student_ids: studentId });
    if (existingSection && existingSection._id.toString() !== id) {
      return res.status(409).json({
        message: `Student is already in section "${existingSection.name}". Remove them from it first.`,
      });
    }

    if (!section.student_ids.some((sid) => sid.toString() === studentId)) {
      section.student_ids.push(studentId);
      await section.save();
    }

    const populated = await Section.findById(id)
      .populate("teacher_id", "name email")
      .populate("student_ids", "name email grade");
    res.status(200).json({ section: populated });
  } catch (err) {
    sendError(res, err);
  }
};

const removeStudentFromSection = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid section id" });
    if (!isValidId(studentId)) return res.status(400).json({ message: "Invalid studentId" });

    const section = await Section.findById(id);
    if (!section) return res.status(404).json({ message: "Section not found" });

    section.student_ids = section.student_ids.filter((sid) => sid.toString() !== studentId);
    await section.save();

    const populated = await Section.findById(id)
      .populate("teacher_id", "name email")
      .populate("student_ids", "name email grade");
    res.status(200).json({ section: populated });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  listSections,
  createSection,
  updateSection,
  deleteSection,
  addStudentToSection,
  removeStudentFromSection,
};

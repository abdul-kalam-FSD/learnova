const mongoose = require("mongoose");

// A Section represents a real-world class/section (e.g. "Grade 6 - A",
// "Grade 9 - Blue") that a teacher is assigned to monitor. This is the
// scoping boundary for the teacher dashboard: a teacher must only see
// students who belong to a section they are assigned to, never every
// student on the platform (see teacherControllers.js — previously
// listStudents/getStudentDetail/getStudentMastery/getWeakAreas had no
// such scoping at all).
//
// One teacher per section for now (teacher_id is singular, not an
// array) — co-teaching / multiple teachers per section is not a
// current requirement; extend to teacher_ids[] later if needed rather
// than over-building now.
//
// Admin creates/manages sections and assigns students (see
// adminControllers.js). Students are NOT self-service members of a
// section — membership is admin-controlled, same trust model as
// grade/role today.
const sectionSchema = new mongoose.Schema(
  {
    // e.g. "Grade 6 - A", "Grade 9 - Morning Batch"
    name: { type: String, required: true, trim: true },
    grade: { type: Number, required: true, enum: [4, 5, 6, 7, 8, 9, 10, 11, 12] },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    student_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true },
);

sectionSchema.index({ teacher_id: 1 });
sectionSchema.index({ grade: 1 });
// A student should belong to at most one section — enforced at the
// controller level when adding a student (checked across all
// sections), not via a unique index here, since student_ids is an
// array field and Mongo can't uniquely-index array membership across
// documents that way.

module.exports = mongoose.model("Section", sectionSchema);

const mongoose = require("mongoose");

// A "mission" a teacher assigns to one or more students: practice a
// specific Concept. Deliberately concept-level rather than pinned to
// one exact GameContent/game_type — the platform already has an
// adaptive engine (gameControllers.getRecommendedGame) that picks the
// right mechanic/tier for a student's mastery state, so an assignment
// just says WHAT to practice; resolveAssignmentContent (in
// assignmentControllers.js) picks the actual playable content the
// same way the rest of the app already does. This also means an
// assignment never goes stale if content for that concept is added
// or changed later.
//
// Per-student status lives inline on `students` (not a separate
// collection) because assignments are always read teacher-side as
// "this assignment + its roster" and student-side as "my assignments"
// — an inline array keeps both reads to one query, and the roster for
// a single assignment is small (one section's worth of students at
// most).
const assignmentSchema = new mongoose.Schema(
  {
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    concept_id: { type: mongoose.Schema.Types.ObjectId, ref: "Concept", required: true },
    // Set when the assignment targeted a whole section at creation
    // time, purely for display ("Assigned to Grade 6 - A") — the
    // roster below is what's authoritative for status tracking, so a
    // student later leaving the section doesn't retroactively change
    // an assignment already made to them.
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    due_date: { type: Date, default: null },
    students: {
      type: [
        {
          _id: false,
          student_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          status: { type: String, enum: ["pending", "completed"], default: "pending" },
          completed_at: { type: Date, default: null },
        },
      ],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "An assignment needs at least one student",
      },
    },
  },
  { timestamps: true },
);

// Teacher's "my assignments" list, newest first.
assignmentSchema.index({ teacher_id: 1, createdAt: -1 });
// Student's "assigned to me" list, and the completeGame hook that
// flips a matching pending entry to completed for one student +
// concept at a time.
assignmentSchema.index({ "students.student_id": 1, "students.status": 1 });
assignmentSchema.index({ concept_id: 1, "students.student_id": 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);

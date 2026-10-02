const mongoose = require("mongoose");
const { CONTEST_STATUSES, VALID_GRADES } = require("../utils/contestLifecycle");

// A teacher-created, grade-wide gamified contest (think a LeetCode
// weekly contest, built out of Learnova's own games). NOT an
// Assignment: an Assignment is a per-student roster item for one
// Concept; a Contest is open to a whole grade during a time window and
// is made of specific playable GameContent challenges.
//
// Challenges reference existing GameContent documents by id rather than
// copying game payloads — the contest reuses the games exactly as they
// exist (same payloads, same scoring in gameControllers), so nothing
// about game mechanics or XP is duplicated here.
//
// Lifecycle (see utils/contestLifecycle.js): only DRAFT /
// PENDING_APPROVAL / PUBLISHED / REJECTED are stored. "Active" and
// "completed" are derived from start_at/end_at at read time.
//
// NOT built yet (deliberately): student participation and contest
// scoring/leaderboard. Admin approve/reject lives in
// controllers/adminContestControllers.js and writes reviewed_*.
const contestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    grade: { type: Number, required: true, enum: VALID_GRADES },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    // Optional: null means the contest draws from the whole subject
    // for that grade rather than one chapter.
    chapter_id: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", default: null },
    challenges: {
      type: [
        {
          _id: false,
          game_content_id: { type: mongoose.Schema.Types.ObjectId, ref: "GameContent", required: true },
        },
      ],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "A contest needs at least one challenge",
      },
    },
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    status: { type: String, enum: CONTEST_STATUSES, default: "DRAFT" },
    // When the teacher last sent it for review (set on submit /
    // resubmit). Drives the admin queue order and "submitted" column.
    submitted_at: { type: Date, default: null },
    // Written only by the admin approve/reject actions.
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewed_at: { type: Date, default: null },
    review_note: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

// Teacher's "my contests" list, newest first.
contestSchema.index({ teacher_id: 1, createdAt: -1 });
// Prepares the next two tasks without extra migrations: the admin
// approval queue (status) and the student "contests for my grade"
// list (grade + status + window).
contestSchema.index({ status: 1, submitted_at: 1 });
contestSchema.index({ grade: 1, status: 1, start_at: 1 });

module.exports = mongoose.model("Contest", contestSchema);

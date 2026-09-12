const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  grade: { type: Number, required: true },
  // Which curriculum this subject belongs to. Defaulted to CBSE so
  // existing documents/queries keep working unchanged; lets us add
  // other boards (e.g. "TN_STATE_BOARD", "ICSE") later without a
  // breaking migration — each board's subjects simply coexist,
  // scoped by this field wherever a user's board matters.
  board: { type: String, default: "CBSE" },
});

// PERFORMANCE: Subject.find({ grade }) is the entry point of nearly
// every content query in the app (getChapters, verifyGradeAccess,
// getCases, getRecommendedCase, admin filters).
subjectSchema.index({ grade: 1 });
// Once multiple boards exist for the same grade, most queries will
// want to scope by board too (a CBSE student shouldn't see TN State
// Board subjects). Compound index prepares for that without
// requiring board on every existing query today.
subjectSchema.index({ grade: 1, board: 1 });

module.exports = mongoose.model("Subject", subjectSchema);

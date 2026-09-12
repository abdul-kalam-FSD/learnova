const mongoose = require("mongoose");

const conceptSchema = new mongoose.Schema({
  chapter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chapter",
    required: true,
  },
  title: { type: String, required: true },
  explanation_text: { type: String, required: true },
});

// PERFORMANCE: Concept.find({ chapter_id }) runs on every
// getChapterDetail call and every grade-scope walk (verifyGradeAccess,
// getCases, getRecommendedCase).
conceptSchema.index({ chapter_id: 1 });

module.exports = mongoose.model("Concept", conceptSchema);

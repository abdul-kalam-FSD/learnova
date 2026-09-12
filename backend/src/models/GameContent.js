const mongoose = require("mongoose");

// Generic content container for non-quiz game mechanics (Fraction
// Builder, and future subject-specific games). One document = one
// playable challenge/level for a given game_type, linked to the
// existing Concept it teaches so it plugs into the same mastery
// system as regular quiz questions.
//
// Keeping this generic (vs. a new collection per game type) avoids
// schema sprawl as more game types are added later (Section 16/25).
const gameContentSchema = new mongoose.Schema(
  {
    // e.g. "MATH_FRACTION_BUILDER" — matches GameSession.game_type
    game_type: { type: String, required: true },
    concept_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Concept",
      required: true,
    },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
    // Free-form, shape depends entirely on game_type. For
    // MATH_FRACTION_BUILDER this holds the target fraction, the
    // available pieces, and the correct combination — see
    // Task 2.4 sample data for the exact shape.
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    order_index: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// PERFORMANCE: getGameContentList now filters by game_type AND
// concept_id (grade-scoped, see gameControllers.js) on every load,
// so the index needs concept_id in it too — a game_type-only index
// would make Mongo scan every doc for that game_type and filter
// concept_id in memory once a game_type spans multiple grades.
gameContentSchema.index({ game_type: 1, concept_id: 1, order_index: 1 });

module.exports = mongoose.model("GameContent", gameContentSchema);

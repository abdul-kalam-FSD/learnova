const mongoose = require("mongoose");

const masterySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    concept_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Concept",
      required: true,
    },
    state: {
      type: String,
      enum: ["weak", "learning", "strong"],
      default: "weak",
    },
    correct_streak: { type: Number, default: 0 },
    last_attempted_at: { type: Date },
  },
  { timestamps: { createdAt: false, updatedAt: "updated_at" } },
);

masterySchema.index({ user_id: 1, concept_id: 1 }, { unique: true });

module.exports = mongoose.model("UserConceptMastery", masterySchema);

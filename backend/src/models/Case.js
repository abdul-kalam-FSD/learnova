const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  intro_text: { type: String, required: true },
  mission_text: {
    type: String,
    required: true,
    default: "Investigate the case and solve it.",
  },
  concept_ids: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Concept", required: true },
  ],
  clue_count: { type: Number, required: true, default: 3 },
  dragdrop_task: {
    prompt: { type: String },
    clue_text: { type: String },
    items: [{ type: String }],
  },
  matching_task: {
    prompt: { type: String },
    clue_text: { type: String },
    pairs: [
      {
        structure: { type: String },
        role: { type: String },
      },
    ],
  },
  // Optional — only cases that have this get a Theory step before
  // "Solved". Cases without it keep the exact old flow (all steps done
  // -> straight to complete). See doc-driven Theory System requirement.
  theory_prompt: { type: String },
  theory_options: [
    {
      text: { type: String },
      correct: { type: Boolean, default: false },
      feedback: { type: String },
    },
  ],
  // Optional — a simple single-variable experiment. Only cases with this
  // get an "Experiment" hub step. Cases without it are unaffected.
  experiment: {
    prompt: { type: String },
    clue_text: { type: String },
    variable_name: { type: String },
    min: { type: Number },
    max: { type: Number },
    unit: { type: String },
    threshold: { type: Number },
    good_outcome_text: { type: String },
    bad_outcome_text: { type: String },
  },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Case", caseSchema);
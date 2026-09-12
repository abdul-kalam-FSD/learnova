const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema({
  concept_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Concept",
    required: true,
  },
  question_text: { type: String, required: true },
  options: { type: [optionSchema], required: true },
  correct_option_id: { type: String, required: true },
  explanation_text: { type: String },
  fun_fact: { type: String },
  difficulty: { type: String, enum: ["easy", "medium", "hard"] },
});

module.exports = mongoose.model("Question", questionSchema);
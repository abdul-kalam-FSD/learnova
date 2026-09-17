require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Adding Fractions" (Grade 6
// Mathematics, seedMathGrade6.js) already has healthy coverage across
// several sibling mechanics (Builder x3, Match x3, Strategy x3), but
// MATH_FRACTION_SPEED_CHALLENGE itself only has 2 rounds ("Which is
// Bigger?" and "Simplify Fast") and neither actually tests ADDING
// fractions, which is this concept's namesake skill. This adds 2 more
// MATH_FRACTION_SPEED_CHALLENGE rounds to the SAME existing concept:
// a hard round on adding fractions with unlike denominators, and a
// hard round mixing addition with simplifying the result. Same
// numeric MCQ question-batch payload shape as the original 2 rounds —
// no new mechanic. Errors out if the subject/chapter/concept don't
// already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 6, name: /mathematics|math/i });
  if (!subject) {
    console.error("Grade 6 Mathematics subject not found — run seedMathGrade6.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Fractions" });
  if (!chapter) {
    console.error('Chapter "Fractions" not found — run seedMathGrade6.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Adding Fractions" });
  if (!concept) {
    console.error('Concept "Adding Fractions" not found — run seedMathGrade6.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newRounds = [
    {
      title: "Speed Round: Add Them Fast",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 10,
        hint: "Convert to a common denominator first, then add the numerators.",
        questions: [
          { id: "q1", prompt: "1/4 + 1/4 = ?", options: [{ id: "a", label: "1/2" }, { id: "b", label: "2/8" }], correct_option_id: "a" },
          { id: "q2", prompt: "1/2 + 1/4 = ?", options: [{ id: "a", label: "3/4" }, { id: "b", label: "2/6" }], correct_option_id: "a" },
          { id: "q3", prompt: "1/3 + 1/6 = ?", options: [{ id: "a", label: "1/2" }, { id: "b", label: "2/9" }], correct_option_id: "a" },
          { id: "q4", prompt: "2/5 + 1/5 = ?", options: [{ id: "a", label: "3/5" }, { id: "b", label: "3/10" }], correct_option_id: "a" },
          { id: "q5", prompt: "1/2 + 1/3 = ?", options: [{ id: "a", label: "5/6" }, { id: "b", label: "2/5" }], correct_option_id: "a" },
          { id: "q6", prompt: "1/4 + 1/2 = ?", options: [{ id: "a", label: "3/4" }, { id: "b", label: "2/6" }], correct_option_id: "a" },
        ],
      },
    },
    {
      title: "Speed Round: Add and Simplify",
      difficulty: "hard",
      order_index: 4,
      payload: {
        time_limit_seconds: 12,
        hint: "Add first, then check whether the result can be simplified to a smaller fraction.",
        questions: [
          { id: "q1", prompt: "2/6 + 1/6 = ? (in simplest form)", options: [{ id: "a", label: "1/2" }, { id: "b", label: "3/6" }], correct_option_id: "a" },
          { id: "q2", prompt: "1/8 + 3/8 = ? (in simplest form)", options: [{ id: "a", label: "1/2" }, { id: "b", label: "4/8" }], correct_option_id: "a" },
          { id: "q3", prompt: "1/6 + 1/3 = ? (in simplest form)", options: [{ id: "a", label: "1/2" }, { id: "b", label: "2/9" }], correct_option_id: "a" },
          { id: "q4", prompt: "3/10 + 1/5 = ? (in simplest form)", options: [{ id: "a", label: "1/2" }, { id: "b", label: "4/15" }], correct_option_id: "a" },
          { id: "q5", prompt: "1/4 + 1/8 = ? (in simplest form)", options: [{ id: "a", label: "3/8" }, { id: "b", label: "2/12" }], correct_option_id: "a" },
          { id: "q6", prompt: "2/9 + 1/9 = ? (in simplest form)", options: [{ id: "a", label: "1/3" }, { id: "b", label: "3/9" }], correct_option_id: "a" },
        ],
      },
    },
  ];

  for (const round of newRounds) {
    const exists = await GameContent.findOne({ game_type: "MATH_FRACTION_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_SPEED_CHALLENGE",
        concept_id: concept._id,
        title: round.title,
        difficulty: round.difficulty,
        order_index: round.order_index,
        payload: round.payload,
      });
      console.log("Created GameContent:", created.title, created._id);
    } else {
      console.log("Using existing GameContent:", exists.title, exists._id);
    }
  }

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

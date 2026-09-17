require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Fast Equation Solving" (Grade 7
// Mathematics, seedMathEquationSpeedCalculation.js) only has 2
// GameContent rounds (one-step warm-up, then mixed one-step
// operations), with no two-step equation round. This adds 2 more
// MATH_EQUATION_SPEED_CALCULATION rounds to the SAME existing
// concept, progressing to two-step equations. Same numeric-answer
// question batch payload shape as the original 2 rounds — no new
// mechanic. Errors out if the subject/chapter/concept don't already
// exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: /mathematics|math/i });
  if (!subject) {
    console.error("Grade 7 Mathematics subject not found — run seedMathEquationSpeedCalculation.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Simple Equations" });
  if (!chapter) {
    console.error('Chapter "Simple Equations" not found — run seedMathEquationSpeedCalculation.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Fast Equation Solving" });
  if (!concept) {
    console.error('Concept "Fast Equation Solving" not found — run seedMathEquationSpeedCalculation.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newRounds = [
    {
      title: "Speed Round: Two-Step Equations",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 10,
        hint: "Undo the addition or subtraction first, then undo the multiplication.",
        questions: [
          { id: "q1", equation_label: "2x + 3 = 11", correct_answer: 4 },
          { id: "q2", equation_label: "3n - 4 = 11", correct_answer: 5 },
          { id: "q3", equation_label: "5y + 2 = 22", correct_answer: 4 },
          { id: "q4", equation_label: "4a - 3 = 13", correct_answer: 4 },
          { id: "q5", equation_label: "2b + 6 = 20", correct_answer: 7 },
          { id: "q6", equation_label: "3c - 5 = 16", correct_answer: 7 },
        ],
      },
    },
    {
      title: "Speed Round: Bigger Two-Step Challenges",
      difficulty: "hard",
      order_index: 4,
      payload: {
        time_limit_seconds: 10,
        hint: "Same two-step approach, just with larger numbers — undo addition/subtraction first, then multiplication.",
        questions: [
          { id: "q1", equation_label: "5x + 4 = 29", correct_answer: 5 },
          { id: "q2", equation_label: "6n - 7 = 29", correct_answer: 6 },
          { id: "q3", equation_label: "4y + 9 = 41", correct_answer: 8 },
          { id: "q4", equation_label: "7a - 10 = 25", correct_answer: 5 },
          { id: "q5", equation_label: "3b + 15 = 36", correct_answer: 7 },
          { id: "q6", equation_label: "8c - 6 = 42", correct_answer: 6 },
        ],
      },
    },
  ];

  for (const round of newRounds) {
    const exists = await GameContent.findOne({ game_type: "MATH_EQUATION_SPEED_CALCULATION", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_SPEED_CALCULATION",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Boss capstone for the Grade 7 "Simple Equations" mechanic family
// (Equation Builder, Speed Calculation, Word Problem Match, Balance
// Strategy already exist under this chapter). Same payload/scoring
// shape as the other equation content — a timed MCQ batch, checked by
// the shared checkMultiQuestionAttempt, no new backend scoring logic.
//
// Grade 7 Audit fix (Batch 1, Defect 2): this file previously picked
// "whatever concept is first" under a regex-matched chapter, which was
// fragile and invisible to the structural audit. It now uses the same
// exact subject/chapter/concept lookup convention as every other
// Grade 7 seed file (see seedMathNumberMachine.js), anchoring to the
// existing "Solving for the Unknown" concept under "Simple Equations"
// — the general equation-solving skill this capstone tests across both
// direct solving (Round 1) and word-problem translation (Round 2).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: "Mathematics" });
  if (!subject) {
    throw new Error(
      "No Grade 7 Mathematics subject found — run seedMathGrade7.js (Integers) first.",
    );
  }
  console.log("Using subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Simple Equations" });
  if (!chapter) {
    throw new Error(
      "No 'Simple Equations' chapter found under Grade 7 Mathematics — run seedMathNumberMachine.js or seedMathEquationBuilder.js first.",
    );
  }
  console.log("Using chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Solving for the Unknown" });
  if (!concept) {
    throw new Error(
      "No 'Solving for the Unknown' concept found under 'Simple Equations' — run seedMathNumberMachine.js first.",
    );
  }
  console.log("Using concept:", concept._id);

  // Grade 7 Audit fix (Batch 1, Defect 1): "boss" is not a valid
  // GameContent.difficulty value (schema enum is easy/medium/hard).
  // Both rounds are the hardest content in this mechanic family, so
  // they map to "hard".
  //
  // Grade 7 Audit fix (Batch 1, Defect 9): the original 12 questions
  // had a first-option bias (a=6, b=5, c=1). The three questions below
  // marked "rebalanced" have had their option order (and matching
  // correct_option_id) changed — content and correctness are
  // unchanged, only which lettered slot holds the correct answer.
  // New distribution: a=4, b=4, c=4.
  const equationBossRounds = [
    {
      title: "Boss Round 1: The Balance Keeper Rises",
      difficulty: "hard",
      order_index: 1,
      payload: {
        time_limit_seconds: 9,
        hint: "Whatever you do to one side, do the same to the other — that's the whole fight.",
        questions: [
          {
            id: "q1",
            prompt: "Solve: x + 5 = 12",
            options: [
              { id: "a", label: "x = 5" },
              { id: "b", label: "x = 7" },
              { id: "c", label: "x = 17" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q2",
            prompt: "Solve: 3x = 21",
            options: [
              { id: "a", label: "x = 6" },
              { id: "b", label: "x = 7" },
              { id: "c", label: "x = 18" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "A shop sells pens at ₹x each. 4 pens cost ₹48. Which equation represents this?",
            // rebalanced: correct answer moved from slot a to slot c
            options: [
              { id: "a", label: "x + 4 = 48" },
              { id: "b", label: "x - 4 = 48" },
              { id: "c", label: "4x = 48" },
            ],
            correct_option_id: "c",
          },
          {
            id: "q4",
            prompt: "Solve: x - 9 = 4",
            // rebalanced: correct answer moved from slot b to slot c
            options: [
              { id: "a", label: "x = 5" },
              { id: "b", label: "x = -5" },
              { id: "c", label: "x = 13" },
            ],
            correct_option_id: "c",
          },
          {
            id: "q5",
            prompt: "To solve 2x = 18, what operation do you apply to both sides?",
            options: [
              { id: "a", label: "Add 2" },
              { id: "b", label: "Divide by 2" },
              { id: "c", label: "Multiply by 2" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "Solve: x / 4 = 6",
            options: [
              { id: "a", label: "x = 10" },
              { id: "b", label: "x = 2" },
              { id: "c", label: "x = 24" },
            ],
            correct_option_id: "c",
          },
        ],
      },
    },
    {
      title: "Boss Round 2: Final Balance",
      difficulty: "hard",
      order_index: 2,
      payload: {
        time_limit_seconds: 8,
        hint: "Read the word problem twice — the trap is picking the equation that sounds right instead of the one that matches the numbers.",
        questions: [
          {
            id: "q1",
            prompt: "Solve: 2x + 3 = 11",
            // rebalanced: correct answer moved from slot a to slot c
            options: [
              { id: "a", label: "x = 7" },
              { id: "b", label: "x = 5.5" },
              { id: "c", label: "x = 4" },
            ],
            correct_option_id: "c",
          },
          {
            id: "q2",
            prompt: "Ravi is x years old. In 5 years he'll be 18. Which equation fits?",
            options: [
              { id: "a", label: "x + 5 = 18" },
              { id: "b", label: "x - 5 = 18" },
              { id: "c", label: "5x = 18" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q3",
            prompt: "Solve: 5x - 4 = 16",
            options: [
              { id: "a", label: "x = 3" },
              { id: "b", label: "x = 4" },
              { id: "c", label: "x = 20" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q4",
            prompt: "Which step correctly isolates x in x + 7 = 15?",
            options: [
              { id: "a", label: "Subtract 7 from both sides" },
              { id: "b", label: "Add 7 to both sides" },
              { id: "c", label: "Divide both sides by 7" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q5",
            prompt: "Solve: x/3 + 2 = 9",
            options: [
              { id: "a", label: "x = 21" },
              { id: "b", label: "x = 7" },
              { id: "c", label: "x = 33" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q6",
            prompt: "A number doubled and increased by 6 gives 20. Which equation fits?",
            options: [
              { id: "a", label: "2x + 6 = 20" },
              { id: "b", label: "x + 2 = 20" },
              { id: "c", label: "2(x + 6) = 20" },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
  ];

  for (const round of equationBossRounds) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_BOSS_CHALLENGE",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_BOSS_CHALLENGE",
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

  console.log("Equation Boss Challenge seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

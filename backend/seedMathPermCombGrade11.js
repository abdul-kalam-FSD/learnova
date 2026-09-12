require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Continues the Grade 11 Math sequence (14-chapter core, 2026-27
// CBSE session). Chapter 6, next after Linear Inequalities:
// Permutations and Combinations.
//
// New game_type this pass: MATH_PERMCOMB_SPEED_CHALLENGE. Reuses the
// existing quick-fire multi-question round pattern (same backend
// logic as Fraction/Angle Speed Challenge / Equation Speed
// Calculation, scored by the shared checkMultiQuestionAttempt) — no
// new scoring code, just registering the game_type in
// MULTI_QUESTION_GAME_TYPES. Chosen over a new visual mechanic
// because this first pass is calculation practice (factorials, nPr,
// nCr, straightforward word problems); a dedicated
// order-matters-vs-doesn't visual mechanic is a better fit for a
// later, more conceptual pass in this same chapter.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 11 });
    console.log("Created new Grade 11 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Permutations and Combinations" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Permutations and Combinations",
      order_index: 6,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Counting, Permutations and Combinations" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Counting, Permutations and Combinations",
      explanation_text:
        "The Fundamental Principle of Counting says that if one task can be done in m ways and a second, independent task can be done in n ways, together they can be done in m × n ways. A permutation is an arrangement of r objects chosen from n distinct objects where order matters: nPr = n! / (n − r)!. A combination is a selection of r objects from n where order does not matter: nCr = n! / (r! (n − r)!). Use permutations for arrangements (seating, passwords, rankings) and combinations for selections (choosing a team, picking items from a group).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- PERMUTATIONS & COMBINATIONS SPEED CHALLENGE (GameType: MATH_PERMCOMB_SPEED_CHALLENGE) ----------
  // payload shape: same quick-fire MCQ round pattern as Angle/Fraction
  // Speed Challenge / Equation Speed Calculation — `questions` is a
  // batch scored together by the shared checkMultiQuestionAttempt,
  // no new backend logic needed beyond registering the game_type in
  // MULTI_QUESTION_GAME_TYPES.
  const permCombSpeedChallengeRounds = [
    {
      title: "Speed Round: Factorials and the Counting Principle",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 10,
        hint: "n! = n × (n−1) × (n−2) × ... × 1. For independent choices, multiply the number of ways.",
        questions: [
          {
            id: "q1",
            prompt: "What is 5!?",
            options: [
              { id: "a", label: "60" },
              { id: "b", label: "120" },
              { id: "c", label: "20" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q2",
            prompt: "What is 4!?",
            options: [
              { id: "a", label: "24" },
              { id: "b", label: "12" },
              { id: "c", label: "16" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q3",
            prompt: "By definition, what is 0!?",
            options: [
              { id: "a", label: "0" },
              { id: "b", label: "1" },
              { id: "c", label: "Undefined" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q4",
            prompt: "A shirt comes in 3 colors and 4 sizes. How many shirt choices are there?",
            options: [
              { id: "a", label: "7" },
              { id: "b", label: "12" },
              { id: "c", label: "34" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q5",
            prompt: "A restaurant has 5 starters and 6 main courses. How many starter+main combos can you order?",
            options: [
              { id: "a", label: "11" },
              { id: "b", label: "30" },
              { id: "c", label: "56" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "Simplify 6! / 4!",
            options: [
              { id: "a", label: "30" },
              { id: "b", label: "2" },
              { id: "c", label: "15" },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
    {
      title: "Speed Round: nPr — Arrangements",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 12,
        hint: "nPr = n! / (n − r)! — use this whenever order matters.",
        questions: [
          {
            id: "q1",
            prompt: "How many ways can 3 students from a class of 5 be arranged in a line?",
            options: [
              { id: "a", label: "15" },
              { id: "b", label: "60" },
              { id: "c", label: "10" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q2",
            prompt: "Evaluate 5P2.",
            options: [
              { id: "a", label: "10" },
              { id: "b", label: "20" },
              { id: "c", label: "25" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "How many 3-letter codes can be formed from the letters A, B, C, D with no letter repeated?",
            options: [
              { id: "a", label: "24" },
              { id: "b", label: "12" },
              { id: "c", label: "64" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "In how many ways can 1st, 2nd, and 3rd place be awarded among 6 runners?",
            options: [
              { id: "a", label: "20" },
              { id: "b", label: "120" },
              { id: "c", label: "216" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q5",
            prompt: "Evaluate 4P4.",
            options: [
              { id: "a", label: "4" },
              { id: "b", label: "16" },
              { id: "c", label: "24" },
            ],
            correct_option_id: "c",
          },
          {
            id: "q6",
            prompt: "Choosing a president, vice-president, and secretary from 8 candidates (all different roles) — how many ways?",
            options: [
              { id: "a", label: "56" },
              { id: "b", label: "336" },
              { id: "c", label: "512" },
            ],
            correct_option_id: "b",
          },
        ],
      },
    },
    {
      title: "Speed Round: nCr — Selections",
      difficulty: "medium",
      order_index: 3,
      payload: {
        time_limit_seconds: 12,
        hint: "nCr = n! / (r!(n − r)!) — use this whenever order does not matter, like picking a group or team.",
        questions: [
          {
            id: "q1",
            prompt: "How many ways can a team of 3 be chosen from 5 players?",
            options: [
              { id: "a", label: "10" },
              { id: "b", label: "60" },
              { id: "c", label: "15" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "Evaluate 6C2.",
            options: [
              { id: "a", label: "30" },
              { id: "b", label: "15" },
              { id: "c", label: "12" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "A committee of 4 is chosen from 10 people. How many different committees are possible?",
            options: [
              { id: "a", label: "210" },
              { id: "b", label: "5040" },
              { id: "c", label: "40" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "Which scenario needs a combination (order doesn't matter), not a permutation?",
            options: [
              { id: "a", label: "Ranking the top 3 finishers in a race" },
              { id: "b", label: "Choosing 2 fruits to put in a basket" },
              { id: "c", label: "Assigning students to numbered seats" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q5",
            prompt: "Evaluate 7C7.",
            options: [
              { id: "a", label: "0" },
              { id: "b", label: "1" },
              { id: "c", label: "7" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "Evaluate 5C0.",
            options: [
              { id: "a", label: "0" },
              { id: "b", label: "5" },
              { id: "c", label: "1" },
            ],
            correct_option_id: "c",
          },
        ],
      },
    },
  ];

  for (const round of permCombSpeedChallengeRounds) {
    const exists = await GameContent.findOne({
      game_type: "MATH_PERMCOMB_SPEED_CHALLENGE",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_PERMCOMB_SPEED_CHALLENGE",
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

  console.log("Permutations & Combinations Speed Challenge seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

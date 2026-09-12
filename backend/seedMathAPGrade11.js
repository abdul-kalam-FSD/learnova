require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Continues the Grade 11 Math sequence (14-chapter core, 2026-27
// CBSE session). Chapter 8, next after Binomial Theorem: Sequences
// and Series. This is a first pass covering Arithmetic Progression
// (AP) only — Geometric Progression (GP) is a large enough topic to
// warrant its own later pass in this same chapter.
//
// New game_type this pass: MATH_AP_SPEED_CHALLENGE. Reuses the
// existing quick-fire multi-question round pattern (same backend
// logic as Perm&Comb/Angle/Fraction Speed Challenge, scored by the
// shared checkMultiQuestionAttempt) — no new scoring code, just
// registering the game_type in MULTI_QUESTION_GAME_TYPES. Chosen
// over Match because this pass is nth-term/sum-of-n-terms
// calculation practice, a genuine fit for the Speed Challenge shape.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Sequences and Series" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Sequences and Series",
      order_index: 8,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Arithmetic Progression" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Arithmetic Progression",
      explanation_text:
        "An Arithmetic Progression (AP) is a sequence where each term after the first is obtained by adding a fixed number, the common difference d, to the previous term. If the first term is a, the nth term is a_n = a + (n − 1)d. The sum of the first n terms is S_n = n/2 [2a + (n − 1)d], which can also be written as S_n = n/2 (a + a_n) using the first and last terms.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- ARITHMETIC PROGRESSION SPEED CHALLENGE (GameType: MATH_AP_SPEED_CHALLENGE) ----------
  // payload shape: same quick-fire MCQ round pattern as Perm&Comb/
  // Angle/Fraction Speed Challenge — `questions` is a batch scored
  // together by the shared checkMultiQuestionAttempt, no new backend
  // logic needed beyond registering the game_type in
  // MULTI_QUESTION_GAME_TYPES.
  const apSpeedChallengeRounds = [
    {
      title: "Speed Round: Finding the nth Term",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "a_n = a + (n − 1)d — first term plus (n−1) times the common difference.",
        questions: [
          {
            id: "q1",
            prompt: "In the AP 2, 5, 8, 11, ..., what is the common difference?",
            options: [
              { id: "a", label: "2" },
              { id: "b", label: "3" },
              { id: "c", label: "5" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q2",
            prompt: "For the AP with a = 4, d = 3, what is the 5th term?",
            options: [
              { id: "a", label: "16" },
              { id: "b", label: "19" },
              { id: "c", label: "15" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q3",
            prompt: "For the AP 10, 7, 4, 1, ..., what is the common difference?",
            options: [
              { id: "a", label: "3" },
              { id: "b", label: "-3" },
              { id: "c", label: "-7" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q4",
            prompt: "For the AP with a = 1, d = 2, what is the 10th term?",
            options: [
              { id: "a", label: "19" },
              { id: "b", label: "20" },
              { id: "c", label: "21" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q5",
            prompt: "For the AP 5, 5, 5, 5, ..., what is the common difference?",
            options: [
              { id: "a", label: "5" },
              { id: "b", label: "0" },
              { id: "c", label: "1" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q6",
            prompt: "For the AP with a = -2, d = 4, what is the 6th term?",
            options: [
              { id: "a", label: "18" },
              { id: "b", label: "22" },
              { id: "c", label: "16" },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
    {
      title: "Speed Round: Sum of n Terms",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 15,
        hint: "S_n = n/2 [2a + (n − 1)d], or S_n = n/2 (a + a_n) if you already know the last term.",
        questions: [
          {
            id: "q1",
            prompt: "Find the sum of the first 5 terms of the AP with a = 2, d = 3.",
            options: [
              { id: "a", label: "40" },
              { id: "b", label: "50" },
              { id: "c", label: "35" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "Find the sum of the first 10 natural numbers (1 + 2 + ... + 10).",
            options: [
              { id: "a", label: "45" },
              { id: "b", label: "55" },
              { id: "c", label: "50" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "For an AP with a = 1 and a_10 = 28, find the sum of the first 10 terms.",
            options: [
              { id: "a", label: "145" },
              { id: "b", label: "280" },
              { id: "c", label: "150" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "Find the sum of the first 4 terms of the AP with a = 5, d = -2.",
            options: [
              { id: "a", label: "8" },
              { id: "b", label: "14" },
              { id: "c", label: "20" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q5",
            prompt: "Find the sum of the first 20 terms of the AP with a = 0, d = 1.",
            options: [
              { id: "a", label: "190" },
              { id: "b", label: "200" },
              { id: "c", label: "210" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q6",
            prompt: "For an AP with a = 3 and common difference d = 4, find the sum of the first 6 terms.",
            options: [
              { id: "a", label: "78" },
              { id: "b", label: "84" },
              { id: "c", label: "60" },
            ],
            correct_option_id: "a",
          },
        ],
      },
    },
  ];

  for (const round of apSpeedChallengeRounds) {
    const exists = await GameContent.findOne({
      game_type: "MATH_AP_SPEED_CHALLENGE",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_AP_SPEED_CHALLENGE",
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

  console.log("Arithmetic Progression Speed Challenge seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

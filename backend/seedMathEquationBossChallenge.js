require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Boss capstone for the Equations family (Builder, Speed Calculation,
// Word Problem Match, Balance Strategy already exist). Same
// payload/scoring shape as the other boss challenges — a timed MCQ
// batch, checked by the shared checkMultiQuestionAttempt, no new
// backend scoring logic.
//
// UNLIKE seedMathAngleSpeedChallenge.js / seedMathGeometryBossChallenge.js,
// this script does NOT know the exact Chapter/Concept titles already
// used for Equations content in earlier sessions — those seed files
// weren't available when this one was written. To avoid creating a
// duplicate Concept (which would fragment mastery tracking for the
// same skill), this script:
//   1. Finds the Mathematics subject (grade 6, same as Geometry).
//   2. Finds a Chapter under it whose title matches /equation/i.
//   3. Picks the FIRST Concept under that chapter, whatever it's
//      named, and logs it clearly.
//   4. Refuses to run (throws, no GameContent created) if step 2 or 3
//      finds nothing — safer than guessing a title and silently
//      creating a new, disconnected Concept.
//
// BEFORE trusting this in production: check the "Using concept:" log
// line below against your actual DB and confirm it's the concept you
// expect Equation content to map to. If it's the wrong one, edit the
// CONCEPT_TITLE_OVERRIDE constant below to pin an exact title instead.
const CONCEPT_TITLE_OVERRIDE = null; // e.g. "Solving Linear Equations"

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: /mathematics|math/i });
  if (!subject) {
    throw new Error(
      "No Grade 7 Mathematics subject found — run seedMathGrade7.js (Integers) first, or check the grade/name filter above.",
    );
  }
  console.log("Using subject:", subject._id);

  const chapter = await Chapter.findOne({
    subject_id: subject._id,
    title: /equation/i,
  });
  if (!chapter) {
    throw new Error(
      "No Chapter matching /equation/i found under Mathematics. Check your DB for the real chapter title and either rename it to include 'Equation', or hardcode chapter lookup here.",
    );
  }
  console.log("Using chapter:", chapter._id, `(title: "${chapter.title}")`);

  let concept;
  if (CONCEPT_TITLE_OVERRIDE) {
    concept = await Concept.findOne({ chapter_id: chapter._id, title: CONCEPT_TITLE_OVERRIDE });
    if (!concept) {
      throw new Error(`CONCEPT_TITLE_OVERRIDE "${CONCEPT_TITLE_OVERRIDE}" not found under chapter "${chapter.title}".`);
    }
  } else {
    concept = await Concept.findOne({ chapter_id: chapter._id }).sort({ _id: 1 });
    if (!concept) {
      throw new Error(
        `Chapter "${chapter.title}" has no Concepts yet — nothing to anchor GameContent to. Seed a concept first, or set CONCEPT_TITLE_OVERRIDE.`,
      );
    }
  }
  console.log(`Using concept: ${concept._id} (title: "${concept.title}") — VERIFY this is correct before trusting this seed's output.`);

  const equationBossRounds = [
    {
      title: "Boss Round 1: The Balance Keeper Rises",
      difficulty: "boss",
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
            options: [
              { id: "a", label: "4x = 48" },
              { id: "b", label: "x + 4 = 48" },
              { id: "c", label: "x - 4 = 48" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q4",
            prompt: "Solve: x - 9 = 4",
            options: [
              { id: "a", label: "x = 5" },
              { id: "b", label: "x = 13" },
              { id: "c", label: "x = -5" },
            ],
            correct_option_id: "b",
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
      difficulty: "boss",
      order_index: 2,
      payload: {
        time_limit_seconds: 8,
        hint: "Read the word problem twice — the trap is picking the equation that sounds right instead of the one that matches the numbers.",
        questions: [
          {
            id: "q1",
            prompt: "Solve: 2x + 3 = 11",
            options: [
              { id: "a", label: "x = 4" },
              { id: "b", label: "x = 7" },
              { id: "c", label: "x = 5.5" },
            ],
            correct_option_id: "a",
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

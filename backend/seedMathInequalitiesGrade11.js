require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Continues the Grade 11 Math sequence (14-chapter core, 2026-27
// CBSE session). Chapter 5, next after Sets, Relations and
// Functions, Trigonometric Functions, and Complex Numbers and
// Quadratic Equations: Linear Inequalities.
//
// New game_type this pass: MATH_INEQUALITY_MATCH. Reuses the
// existing mapping-equality scoring group (same backend logic as
// Fraction/Shape/Place Value/Ratio/Function/Trig Match) — matching a
// linear inequality to its correct solution interval is the same
// "assign each slot to its correct counterpart" shape as those.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Linear Inequalities" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Linear Inequalities",
      order_index: 5,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Solving Linear Inequalities in One Variable" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Solving Linear Inequalities in One Variable",
      explanation_text:
        "A linear inequality is solved almost the same way as an equation — add, subtract, multiply, or divide both sides by the same amount. The one rule that's different: multiplying or dividing both sides by a negative number flips the direction of the inequality sign. The solution is a whole range of values, usually written as an interval.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape matches Inequality Match: `slots` are the
  // inequality cards, `components` are the tappable solution-interval
  // cards, `correct_mapping` is stripped before the client sees it.
  const inequalityMatchChallenges = [
    {
      title: "Match: Simple One-Step Inequalities",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each inequality to its correct solution.",
        slots: [
          { id: "s1", label: "x + 3 > 7" },
          { id: "s2", label: "x - 2 ≤ 5" },
          { id: "s3", label: "2x < 10" },
        ],
        components: [
          { id: "c1", label: "x > 4" },
          { id: "c2", label: "x ≤ 7" },
          { id: "c3", label: "x < 5" },
          { id: "c4", label: "x > 7" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Add, subtract, multiply, or divide both sides just like an equation — the inequality sign itself doesn't move unless you multiply or divide by a negative.",
      },
    },
    {
      title: "Match: Flipping the Sign",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each inequality to its correct solution — watch for the sign flip.",
        slots: [
          { id: "s1", label: "-2x > 8" },
          { id: "s2", label: "-x ≤ 6" },
          { id: "s3", label: "-3x < -9" },
        ],
        components: [
          { id: "c1", label: "x < -4" },
          { id: "c2", label: "x ≥ -6" },
          { id: "c3", label: "x > 3" },
          { id: "c4", label: "x > -4" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Dividing both sides by a negative number flips the inequality's direction — a '>' becomes '<' and vice versa.",
      },
    },
    {
      title: "Match: Two-Step Inequalities to Intervals",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each inequality to its correct solution written as an interval.",
        slots: [
          { id: "s1", label: "3x + 1 ≥ 10" },
          { id: "s2", label: "-2x + 5 > 1" },
          { id: "s3", label: "5 - x ≤ 8" },
        ],
        components: [
          { id: "c1", label: "[3, ∞)" },
          { id: "c2", label: "(-∞, 2)" },
          { id: "c3", label: "[-3, ∞)" },
          { id: "c4", label: "(2, ∞)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Solve for x one step at a time first, then convert the resulting inequality into interval notation — a square bracket means the endpoint is included, a round one means it isn't.",
      },
    },
  ];

  for (const challenge of inequalityMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_INEQUALITY_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_INEQUALITY_MATCH",
        concept_id: concept._id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        order_index: challenge.order_index,
        payload: challenge.payload,
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

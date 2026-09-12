require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Continues the Grade 11 Math sequence (14-chapter core, 2026-27
// CBSE session — same list seedMathGrade11.js's "Sets" note refers
// to). Chapter 2, next in syllabus order after Sets: Relations and
// Functions.
//
// New game_type this pass: MATH_FUNCTION_MATCH. Reuses the existing
// mapping-equality scoring group (same backend logic as Fraction/
// Shape/Place Value/Ratio Match) — a genuine fit, not a forced
// reuse: matching a relation to its domain/range or to its
// function-type classification is the same "assign each slot to its
// correct counterpart" shape as those, just applied one level more
// abstractly (a relation given as a set of ordered pairs, not a
// number).
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Relations and Functions" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Relations and Functions",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Domain, Range and Function Classification" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Domain, Range and Function Classification",
      explanation_text:
        "A relation from set A to set B is any set of ordered pairs (a, b) where a is from A and b is from B. Its domain is the set of all first elements actually used, and its range is the set of all second elements actually used. A relation is a function only if every element of the domain maps to exactly one element of the range — if any first element repeats with a different second element, it's a relation but not a function.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape matches Function Match: `slots` are the relation
  // cards, `components` are the tappable classification cards,
  // `correct_mapping` is stripped before the client sees it.
  const functionMatchChallenges = [
    {
      title: "Match: Domain and Range",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each relation to its correct domain and range.",
        slots: [
          { id: "s1", label: "{(1, 2), (2, 4), (3, 6)}" },
          { id: "s2", label: "{(1, 1), (2, 1), (3, 1)}" },
          { id: "s3", label: "{(2, 5), (4, 5), (6, 9)}" },
        ],
        components: [
          { id: "c1", label: "Domain {1, 2, 3}, Range {2, 4, 6}" },
          { id: "c2", label: "Domain {1, 2, 3}, Range {1}" },
          { id: "c3", label: "Domain {2, 4, 6}, Range {5, 9}" },
          { id: "c4", label: "Domain {2, 4, 6}, Range {2, 4, 6}" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Domain is the set of every first element that appears; range is the set of every second element that appears — repeats only count once.",
      },
    },
    {
      title: "Match: Function or Not a Function",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each relation to whether it's a function or not.",
        slots: [
          { id: "s1", label: "{(1, 3), (2, 5), (3, 7)}" },
          { id: "s2", label: "{(1, 3), (1, 5), (2, 7)}" },
          { id: "s3", label: "{(4, 2), (5, 2), (6, 2)}" },
        ],
        components: [
          { id: "c1", label: "Function — every input has exactly one output" },
          { id: "c2", label: "Not a function — input 1 maps to two different outputs" },
          { id: "c3", label: "Function — every input has exactly one output (all mapping to the same value is fine)" },
          { id: "c4", label: "Not a function — no input repeats, but two outputs are missing" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A function only breaks when the SAME input appears twice with two DIFFERENT outputs — multiple inputs sharing one output is still perfectly fine.",
      },
    },
    {
      title: "Match: Type of Function",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each function to its correct type.",
        slots: [
          { id: "s1", label: "f(x) = x + 1, from {1, 2, 3} to {2, 3, 4}" },
          { id: "s2", label: "f(x) = x², from {-1, 1} to {1}" },
          { id: "s3", label: "f(x) = x, from {1, 2, 3} to {1, 2, 3, 4, 5}" },
        ],
        components: [
          { id: "c1", label: "One-one and onto (bijective) — every output in {2,3,4} is hit exactly once" },
          { id: "c2", label: "Many-one — two different inputs (-1 and 1) give the same output" },
          { id: "c3", label: "One-one but not onto — no two inputs share an output, but 4 and 5 in the codomain are never hit" },
          { id: "c4", label: "Onto but not one-one" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Check two things separately: does any output get hit more than once (rules out one-one), and does every element of the codomain get hit at least once (rules out onto).",
      },
    },
  ];

  for (const challenge of functionMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FUNCTION_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FUNCTION_MATCH",
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

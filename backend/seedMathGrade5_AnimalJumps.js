require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 13 "Animal
// Jumps" (2026-27 session). Confirmed via a current CBSE school's
// 2026-27 academic calendar as grouped with rounding numbers and
// factors/multiples in the May teaching block. This chapter's own
// framing uses the length of an animal's jump/hop as a repeated
// distance — a natural context for multiples, skip-counting, and
// simple number patterns (how far after N jumps, what pattern the
// landing points make).
//
// Reuses MATH_EQUATION_WORD_PROBLEM_MATCH. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 5 });
    console.log("Created new Grade 5 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Animal Jumps" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Numbers",
      title: "Animal Jumps",
      order_index: 13,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Multiples and Patterns from Repeated Jumps",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Multiples and Patterns from Repeated Jumps",
      explanation_text:
        "If a frog jumps the same distance every time, its landing spots after 1, 2, 3, 4 jumps are all multiples of that jump length — the same idea as a times table, laid out along a number line. Comparing two animals with different jump lengths, you can work out how many jumps each needs to cover the same total distance, or which lands exactly on a particular spot and which never does.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const jumpChallenges = [
    {
      title: "Match: Where Does the Frog Land?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "A frog jumps exactly 7cm every time, starting at 0. Match each jump number to its landing position.",
        slots: [
          { id: "s1", label: "After 4 jumps" },
          { id: "s2", label: "After 6 jumps" },
          { id: "s3", label: "After 9 jumps" },
        ],
        components: [
          { id: "c1", label: "28cm" },
          { id: "c2", label: "42cm" },
          { id: "c3", label: "63cm" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The landing position after N jumps is just N times the jump length.",
      },
    },
    {
      title: "Match: How Many Jumps to Reach the Target?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each animal's jump length and target distance to the number of jumps needed to land exactly on it.",
        slots: [
          { id: "s1", label: "A kangaroo jumps 9m each time; target is 72m" },
          { id: "s2", label: "A rabbit hops 6cm each time; target is 90cm" },
          { id: "s3", label: "A grasshopper jumps 5cm each time; target is 60cm" },
        ],
        components: [
          { id: "c1", label: "8 jumps" },
          { id: "c2", label: "15 jumps" },
          { id: "c3", label: "12 jumps" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Divide the target distance by the length of one jump.",
      },
    },
    {
      title: "Match: Which Animal Lands Exactly on the Mark?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Two animals start at 0 and jump repeatedly. Match each pair to which one can land exactly on the given mark (the other never can).",
        slots: [
          { id: "s1", label: "A 4cm-jumper and a 6cm-jumper — can either land exactly on 50cm?" },
          { id: "s2", label: "A 3cm-jumper and a 8cm-jumper — can either land exactly on 48cm?" },
          { id: "s3", label: "A 7cm-jumper and a 9cm-jumper — can either land exactly on 56cm?" },
        ],
        components: [
          { id: "c1", label: "Neither — 50 is not a multiple of 4 or of 6" },
          { id: "c2", label: "Both can — 48 is a multiple of both 3 and 8" },
          { id: "c3", label: "Only the 7cm-jumper — 56 is a multiple of 7 but not of 9" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A jumper can land exactly on a mark only if that mark is a multiple of the jump length — check by dividing.",
      },
    },
  ];

  for (const challenge of jumpChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH",
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

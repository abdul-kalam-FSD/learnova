require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 5 Mathematics — Chapter 1 of the Grade 5 vertical slice (closing
// the Grade 5 content gap; Grade 4 only covers shape naming, Grade 6
// jumps straight to LCD-based fraction addition). This chapter bridges
// the two: same-denominator fraction building + simplest-form/decimal
// equivalence, with no cross-denominator conversion yet (that's Grade 6).
// Reuses MATH_FRACTION_BUILDER and MATH_FRACTION_MATCH — genuine fits,
// not reuse-for-convenience.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Fractions & Decimals" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Numbers",
      title: "Fractions & Decimals",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Equivalent Fractions and Decimals" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Equivalent Fractions and Decimals",
      explanation_text:
        "A fraction can look different but still mean the same amount — 2/4 and 1/2 are equivalent because they cover the same part of a whole. Fractions with a denominator of 10 connect directly to decimals: 7/10 is the same as 0.7. Learning to spot equivalent fractions and convert simple fractions to decimals sets up the harder work of adding fractions with different denominators, which comes next.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- FRACTION BUILDER challenges (GameType: MATH_FRACTION_BUILDER) ----------
  // Deliberately same-denominator pieces only — no LCD conversion yet,
  // that jump is Grade 6's "Adding Fractions" concept.
  const fractionChallenges = [
    {
      title: "Build 3/4 (Quarters Only)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target: { numerator: 3, denominator: 4 },
        pieces: [
          { id: "p1", numerator: 1, denominator: 4 },
          { id: "p2", numerator: 1, denominator: 4 },
          { id: "p3", numerator: 1, denominator: 4 },
          { id: "p4", numerator: 1, denominator: 4 },
        ],
        correct_piece_ids: ["p1", "p2", "p3"],
        hint: "All the pieces are quarters — how many quarters make 3/4?",
      },
    },
    {
      title: "Build 5/8 (Eighths Only)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target: { numerator: 5, denominator: 8 },
        pieces: [
          { id: "p1", numerator: 1, denominator: 8 },
          { id: "p2", numerator: 1, denominator: 8 },
          { id: "p3", numerator: 1, denominator: 8 },
          { id: "p4", numerator: 1, denominator: 8 },
          { id: "p5", numerator: 1, denominator: 8 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4", "p5"],
        hint: "Every piece is an eighth — just count out five of them.",
      },
    },
    {
      title: "Build 7/10 (Tenths Only)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target: { numerator: 7, denominator: 10 },
        pieces: [
          { id: "p1", numerator: 1, denominator: 10 },
          { id: "p2", numerator: 1, denominator: 10 },
          { id: "p3", numerator: 1, denominator: 10 },
          { id: "p4", numerator: 1, denominator: 10 },
          { id: "p5", numerator: 1, denominator: 10 },
          { id: "p6", numerator: 1, denominator: 10 },
          { id: "p7", numerator: 1, denominator: 10 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"],
        hint: "Tenths connect to decimals — 7/10 is the same as 0.7.",
      },
    },
  ];

  for (const challenge of fractionChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_BUILDER",
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

  // ---------- FRACTION MATCH challenges (GameType: MATH_FRACTION_MATCH) ----------
  const fractionMatchChallenges = [
    {
      title: "Match: Simplest Form (Grade 5)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each fraction card to its simplest form.",
        slots: [
          { id: "s1", label: "2/4" },
          { id: "s2", label: "4/8" },
          { id: "s3", label: "3/6" },
        ],
        components: [
          { id: "c1", label: "1/2" },
          { id: "c2", label: "1/2" },
          { id: "c3", label: "1/2" },
          { id: "c4", label: "1/3" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "All three cards are different ways of writing the same amount — half.",
      },
    },
    {
      title: "Match: Tenths to Decimals",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each tenths fraction to its decimal.",
        slots: [
          { id: "s1", label: "1/10" },
          { id: "s2", label: "5/10" },
          { id: "s3", label: "9/10" },
        ],
        components: [
          { id: "c1", label: "0.1" },
          { id: "c2", label: "0.5" },
          { id: "c3", label: "0.9" },
          { id: "c4", label: "0.4" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "With tenths, the numerator becomes the digit right after the decimal point.",
      },
    },
    {
      title: "Match: Fraction to Decimal (Mixed)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each fraction card to its decimal equivalent.",
        slots: [
          { id: "s1", label: "1/2" },
          { id: "s2", label: "1/4" },
          { id: "s3", label: "3/4" },
        ],
        components: [
          { id: "c1", label: "0.5" },
          { id: "c2", label: "0.25" },
          { id: "c3", label: "0.75" },
          { id: "c4", label: "0.2" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Quarters split a whole into four 0.25-sized steps: 0.25, 0.5, 0.75, 1.0.",
      },
    },
  ];

  for (const challenge of fractionMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_FRACTION_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_FRACTION_MATCH",
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

  console.log("Grade 5 Mathematics — Fractions & Decimals seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

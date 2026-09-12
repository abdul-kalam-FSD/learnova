require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 5 Mathematics — Chapter 3 of the Grade 5 vertical slice.
// No existing mechanic genuinely fit place-value reasoning (Equation
// Builder/Number Machine are about computing, not identifying digit
// position), so this introduces a new game_type: MATH_PLACE_VALUE_MATCH.
// It reuses the backend's mapping-equality scoring group as-is (a
// genuine fit — matching a digit to its place-value name IS a mapping
// task) but ships its own frontend component with a digit-highlighting
// visual. Uses the Indian numbering system (Ones/Tens/Hundreds/
// Thousands/Ten Thousands/Lakhs), scaling number size with difficulty.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Large Numbers and Place Value" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Numbers",
      title: "Large Numbers and Place Value",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Understanding Place Value" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Understanding Place Value",
      explanation_text:
        "Every digit in a number has a place value based on where it sits — the same digit can mean 8 or 8,000 depending on its position. In the Indian numbering system, the places from right to left are Ones, Tens, Hundreds, Thousands, Ten Thousands, and Lakhs. Reading a number one digit at a time, from the right, tells you exactly which place each digit belongs to.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- PLACE VALUE MATCH challenges (GameType: MATH_PLACE_VALUE_MATCH) ----------
  // payload shape: `slots` are numbers (digit string, no separators)
  // with one digit highlighted via `highlightIndex` (0 = leftmost
  // digit); `components` are place-value name cards; `correct_mapping`
  // is { slotId: componentId }. Number length scales with difficulty:
  // 4-digit (easy) -> 5-digit (medium) -> 6-digit/Lakhs (hard).
  const placeValueChallenges = [
    {
      title: "Match: Place Value in 4-Digit Numbers",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match the highlighted digit in each number to its place value.",
        slots: [
          { id: "s1", number: "4739", highlightIndex: 3, label: "Highlighted: 9" },
          { id: "s2", number: "8256", highlightIndex: 2, label: "Highlighted: 5" },
          { id: "s3", number: "3164", highlightIndex: 1, label: "Highlighted: 1" },
        ],
        components: [
          { id: "c1", label: "Ones" },
          { id: "c2", label: "Tens" },
          { id: "c3", label: "Hundreds" },
          { id: "c4", label: "Thousands" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Count from the right: the last digit is Ones, then Tens, then Hundreds.",
      },
    },
    {
      title: "Match: Place Value in 5-Digit Numbers",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match the highlighted digit in each number to its place value.",
        slots: [
          { id: "s1", number: "47281", highlightIndex: 0, label: "Highlighted: 4" },
          { id: "s2", number: "62934", highlightIndex: 1, label: "Highlighted: 2" },
          { id: "s3", number: "81563", highlightIndex: 4, label: "Highlighted: 3" },
        ],
        components: [
          { id: "c1", label: "Ten Thousands" },
          { id: "c2", label: "Thousands" },
          { id: "c3", label: "Hundreds" },
          { id: "c4", label: "Tens" },
          { id: "c5", label: "Ones" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c5" },
        hint: "In a 5-digit number, the leftmost digit is Ten Thousands.",
      },
    },
    {
      title: "Match: Place Value in Lakhs",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match the highlighted digit in each 6-digit number to its place value.",
        slots: [
          { id: "s1", number: "472981", highlightIndex: 0, label: "Highlighted: 4" },
          { id: "s2", number: "586347", highlightIndex: 2, label: "Highlighted: 6" },
          { id: "s3", number: "913825", highlightIndex: 3, label: "Highlighted: 8" },
        ],
        components: [
          { id: "c1", label: "Lakhs" },
          { id: "c2", label: "Ten Thousands" },
          { id: "c3", label: "Thousands" },
          { id: "c4", label: "Hundreds" },
          { id: "c5", label: "Tens" },
          { id: "c6", label: "Ones" },
        ],
        correct_mapping: { s1: "c1", s2: "c3", s3: "c4" },
        hint: "A 6-digit number starts with Lakhs on the far left — count rightward from there.",
      },
    },
  ];

  for (const challenge of placeValueChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_PLACE_VALUE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_PLACE_VALUE_MATCH",
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

  console.log("Grade 5 Mathematics — Large Numbers and Place Value seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 4
// "Thousands Around Us" — larger numbers and place value). Reuses
// MATH_PLACE_VALUE_MATCH exactly as built for Grade 5 (see
// seedMathGrade5_PlaceValue.js), just capped at 4-digit numbers
// (Ones/Tens/Hundreds/Thousands) since Grade 4 doesn't yet go to
// Lakhs. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: /mathematics/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 4 });
    console.log("Created new Grade 4 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Thousands Around Us" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Thousands Around Us",
      order_index: 4,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading and Writing 4-Digit Numbers" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading and Writing 4-Digit Numbers",
      explanation_text:
        "Every digit in a number has a place value based on where it sits. In a 4-digit number, the places from right to left are Ones, Tens, Hundreds and Thousands. The same digit can mean 7 or 7,000 depending only on which place it's in — counting from the right tells you exactly which place each digit belongs to.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const placeValueChallenges = [
    {
      title: "Match: Place Value in 3-Digit Numbers",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match the highlighted digit in each number to its place value.",
        slots: [
          { id: "s1", number: "482", highlightIndex: 2, label: "Highlighted: 2" },
          { id: "s2", number: "635", highlightIndex: 1, label: "Highlighted: 3" },
          { id: "s3", number: "917", highlightIndex: 0, label: "Highlighted: 9" },
        ],
        components: [
          { id: "c1", label: "Ones" },
          { id: "c2", label: "Tens" },
          { id: "c3", label: "Hundreds" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Count from the right: the last digit is Ones, then Tens, then Hundreds.",
      },
    },
    {
      title: "Match: Place Value in 4-Digit Numbers",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match the highlighted digit in each 4-digit number to its place value.",
        slots: [
          { id: "s1", number: "2839", highlightIndex: 3, label: "Highlighted: 9" },
          { id: "s2", number: "5261", highlightIndex: 2, label: "Highlighted: 2" },
          { id: "s3", number: "7304", highlightIndex: 0, label: "Highlighted: 7" },
        ],
        components: [
          { id: "c1", label: "Ones" },
          { id: "c2", label: "Tens" },
          { id: "c3", label: "Hundreds" },
          { id: "c4", label: "Thousands" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c4" },
        hint: "The leftmost digit in a 4-digit number is always the Thousands place.",
      },
    },
    {
      title: "Match: Building a 4-Digit Number",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each number's Thousands digit to its actual value.",
        slots: [
          { id: "s1", label: "In 3,482 the Thousands digit is 3" },
          { id: "s2", label: "In 6,150 the Thousands digit is 6" },
          { id: "s3", label: "In 9,027 the Thousands digit is 9" },
        ],
        components: [
          { id: "c1", label: "Stands for 3,000" },
          { id: "c2", label: "Stands for 6,000" },
          { id: "c3", label: "Stands for 9,000" },
          { id: "c4", label: "Stands for 300" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A digit in the Thousands place is always worth that digit times 1,000.",
      },
    },
  ];

  for (const challenge of placeValueChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_PLACE_VALUE_MATCH", title: challenge.title });
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

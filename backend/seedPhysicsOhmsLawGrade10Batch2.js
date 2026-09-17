require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Ohm's Law and Circuit Calculations"
// (Grade 10 Physics, seedPhysicsOhmsLawGrade10.js) only has 2
// GameContent rounds (basic V=IR, and equal-resistor series/parallel
// totals), with no "hard" round, no power calculations, and no mixed
// series-parallel networks. This adds 2 more
// PHYSICS_OHMS_LAW_SPEED_CHALLENGE rounds to the SAME existing
// concept. Same numeric-answer question batch payload shape as the
// original 2 rounds — no new mechanic. Errors out if the subject/
// chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 10 Science subject not found — run seedPhysicsOhmsLawGrade10.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Series and Parallel Circuits" });
  if (!chapter) {
    console.error('Chapter "Series and Parallel Circuits" not found — run seedPhysicsOhmsLawGrade10.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Ohm's Law and Circuit Calculations" });
  if (!concept) {
    console.error('Concept "Ohm\'s Law and Circuit Calculations" not found — run seedPhysicsOhmsLawGrade10.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newRounds = [
    {
      title: "Speed Round: Electrical Power Basics",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 12,
        hint: "P = V x I. Also P = I\u00b2R and P = V\u00b2/R \u2014 use whichever two quantities you know.",
        questions: [
          { id: "q1", prompt: "A device has voltage 10 V and current 2 A. Find the power.", unit: "W", correct_answer: 20 },
          { id: "q2", prompt: "A resistor of 4 \u03a9 carries a current of 3 A. Find the power dissipated.", unit: "W", correct_answer: 36 },
          { id: "q3", prompt: "A device has voltage 12 V across a 6 \u03a9 resistor. Find the power dissipated.", unit: "W", correct_answer: 24 },
          { id: "q4", prompt: "A bulb draws 5 A at 20 V. Find its power rating.", unit: "W", correct_answer: 100 },
          { id: "q5", prompt: "A 2 \u03a9 resistor carries 5 A of current. Find the power dissipated.", unit: "W", correct_answer: 50 },
          { id: "q6", prompt: "A device has voltage 8 V and current 4 A. Find the power.", unit: "W", correct_answer: 32 },
        ],
      },
    },
    {
      title: "Speed Round: Mixed Series-Parallel Combinations",
      difficulty: "hard",
      order_index: 4,
      payload: {
        time_limit_seconds: 15,
        hint: "Solve the parallel branch first, then add it in series with the rest.",
        questions: [
          { id: "q1", prompt: "Two 4 \u03a9 resistors are in parallel; that combination is in series with a 3rd 2 \u03a9 resistor. Find the total resistance.", unit: "\u03a9", correct_answer: 4 },
          { id: "q2", prompt: "Two 6 \u03a9 resistors are in parallel, and that combination is in series with a 5 \u03a9 resistor. Find the total resistance.", unit: "\u03a9", correct_answer: 8 },
          { id: "q3", prompt: "A 3 \u03a9 resistor is in series with a parallel pair of two 10 \u03a9 resistors. Find the total resistance.", unit: "\u03a9", correct_answer: 8 },
          { id: "q4", prompt: "Two 8 \u03a9 resistors are in parallel, in series with a 2 \u03a9 resistor. Find the total resistance.", unit: "\u03a9", correct_answer: 6 },
          { id: "q5", prompt: "A 6 \u03a9 resistor is in series with a parallel pair of two 12 \u03a9 resistors. Find the total resistance.", unit: "\u03a9", correct_answer: 12 },
          { id: "q6", prompt: "Two 10 \u03a9 resistors are in parallel, in series with a 1 \u03a9 resistor. Find the total resistance.", unit: "\u03a9", correct_answer: 6 },
        ],
      },
    },
  ];

  for (const round of newRounds) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE",
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

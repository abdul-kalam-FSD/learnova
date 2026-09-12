require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Adds PHYSICS_OHMS_LAW_SPEED_CHALLENGE content to the SAME Grade 10
// "Series and Parallel Circuits" chapter that seedPhysicsGrade9.js
// already seeds with PHYSICS_CIRCUIT_BUILDER — a second mechanic for
// the same chapter, same sibling pattern as Grade 6 (Circuit Builder
// + Magnetism Match on different chapters) or Grade 9's own
// Force Simulator addition alongside PHYSICS_MATCH. Circuit Builder
// there covers *qualitative* wiring behavior (which components go in
// a series vs. parallel slot); this covers the *quantitative* side —
// V = I x R, and total resistance for series/parallel combinations —
// that this chapter never had a mechanic for.
//
// New Concept since "calculate it" is a different objective from
// "recognize the wiring", matching how every other Speed Challenge
// mechanic in this project gets its own concept alongside a sibling
// Builder/Match. Reuses MULTI_QUESTION_GAME_TYPES /
// checkMultiQuestionAttempt as-is (see gameControllers.js) — no new
// backend scoring code, only the theme and questions are new.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 10 });
    console.log("Created new Grade 10 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Series and Parallel Circuits" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electricity",
      title: "Series and Parallel Circuits",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Ohm's Law and Circuit Calculations" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Ohm's Law and Circuit Calculations",
      explanation_text:
        "Ohm's Law relates voltage, current and resistance: V = I x R. In a series circuit, resistances simply add up (R_total = R1 + R2 + ...). In a parallel circuit, the reciprocals add instead (1/R_total = 1/R1 + 1/R2 + ...), so the total resistance is always less than the smallest individual resistor.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // Every question below divides/adds evenly to a clean whole number,
  // same "no decimal fighting" spirit as the Math Speed Challenges.
  const speedRounds = [
    {
      title: "Speed Round: Ohm's Law Basics",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "V = I x R. To find current: I = V / R. To find resistance: R = V / I.",
        questions: [
          { id: "q1", prompt: "A circuit has current 2 A and resistance 5 Ω. Find the voltage.", unit: "V", correct_answer: 10 },
          { id: "q2", prompt: "A bulb has voltage 12 V and resistance 4 Ω. Find the current.", unit: "A", correct_answer: 3 },
          { id: "q3", prompt: "A resistor has voltage 20 V and current 4 A. Find the resistance.", unit: "Ω", correct_answer: 5 },
          { id: "q4", prompt: "A circuit has current 3 A and resistance 6 Ω. Find the voltage.", unit: "V", correct_answer: 18 },
          { id: "q5", prompt: "A device has voltage 15 V and resistance 3 Ω. Find the current.", unit: "A", correct_answer: 5 },
        ],
      },
    },
    {
      title: "Speed Round: Total Resistance",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 12,
        hint: "Series: just add the resistances. Parallel with two equal resistors R: total = R / 2.",
        questions: [
          { id: "q1", prompt: "Two resistors of 4 Ω and 6 Ω are connected in series. Find the total resistance.", unit: "Ω", correct_answer: 10 },
          { id: "q2", prompt: "Two resistors of 3 Ω and 5 Ω are connected in series. Find the total resistance.", unit: "Ω", correct_answer: 8 },
          { id: "q3", prompt: "Two equal 8 Ω resistors are connected in parallel. Find the total resistance.", unit: "Ω", correct_answer: 4 },
          { id: "q4", prompt: "Two equal 10 Ω resistors are connected in parallel. Find the total resistance.", unit: "Ω", correct_answer: 5 },
          { id: "q5", prompt: "Three resistors of 2 Ω, 3 Ω and 5 Ω are connected in series. Find the total resistance.", unit: "Ω", correct_answer: 10 },
        ],
      },
    },
  ];

  for (const round of speedRounds) {
    const exists = await GameContent.findOne({
      game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE",
      title: round.title,
    });
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Adds PHYSICS_CAPACITANCE_SPEED_CHALLENGE content to the SAME Grade
// 11 "Electrostatics" chapter that seedPhysicsGrade11.js already
// seeds with PHYSICS_CIRCUIT_BUILDER — a second mechanic for the same
// chapter, same sibling pattern as seedPhysicsOhmsLawGrade10.js adding
// a Speed Challenge alongside Circuit Builder on "Series and Parallel
// Circuits". Circuit Builder there covers the *qualitative* side
// (matching a capacitor scenario to its outcome); this covers the
// *quantitative* side — C = Q/V, and combined capacitance for
// series/parallel capacitors — that this chapter never had a
// mechanic for.
//
// New Concept since "calculate it" is a different objective from
// "recognize the behavior", matching how every other Speed Challenge
// mechanic in this project gets its own concept alongside a sibling
// Match/Builder. Reuses MULTI_QUESTION_GAME_TYPES /
// checkMultiQuestionAttempt as-is (see gameControllers.js) — no new
// backend scoring code, only the theme and questions are new.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /physics/i });
  if (!subject) {
    subject = await Subject.create({ name: "Physics", grade: 11 });
    console.log("Created new Grade 11 Physics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Electrostatics" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electrostatics",
      title: "Electrostatics",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Calculating Capacitance" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Calculating Capacitance",
      explanation_text:
        "Capacitance relates stored charge to voltage: C = Q / V (charge in coulombs, voltage in volts, capacitance in farads). Capacitors in series combine like resistors in parallel — the reciprocals add (1/C_total = 1/C1 + 1/C2 + ...), so the total is always less than the smallest one. Capacitors in parallel simply add (C_total = C1 + C2 + ...).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // Every question below divides/adds evenly to a clean whole number,
  // same "no decimal fighting" spirit as the Math Speed Challenges and
  // the Ohm's Law Speed Challenge.
  const speedRounds = [
    {
      title: "Speed Round: Capacitance Basics",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "C = Q / V. To find charge: Q = C x V. To find voltage: V = Q / C.",
        questions: [
          { id: "q1", prompt: "A capacitor stores 12 C of charge at 4 V. Find its capacitance.", unit: "F", correct_answer: 3 },
          { id: "q2", prompt: "A 5 F capacitor is charged to 6 V. Find the charge stored.", unit: "C", correct_answer: 30 },
          { id: "q3", prompt: "A capacitor stores 20 C of charge at 5 V. Find its capacitance.", unit: "F", correct_answer: 4 },
          { id: "q4", prompt: "A 2 F capacitor stores 18 C of charge. Find the voltage across it.", unit: "V", correct_answer: 9 },
          { id: "q5", prompt: "A 3 F capacitor is charged to 8 V. Find the charge stored.", unit: "C", correct_answer: 24 },
        ],
      },
    },
    {
      title: "Speed Round: Series and Parallel Capacitance",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 12,
        hint: "Parallel: just add the capacitances. Series with two equal capacitors C: total = C / 2.",
        questions: [
          { id: "q1", prompt: "Two capacitors of 4 F and 6 F are connected in parallel. Find the total capacitance.", unit: "F", correct_answer: 10 },
          { id: "q2", prompt: "Two capacitors of 3 F and 5 F are connected in parallel. Find the total capacitance.", unit: "F", correct_answer: 8 },
          { id: "q3", prompt: "Two equal 8 F capacitors are connected in series. Find the total capacitance.", unit: "F", correct_answer: 4 },
          { id: "q4", prompt: "Two equal 10 F capacitors are connected in series. Find the total capacitance.", unit: "F", correct_answer: 5 },
          { id: "q5", prompt: "Three capacitors of 2 F, 3 F and 5 F are connected in parallel. Find the total capacitance.", unit: "F", correct_answer: 10 },
        ],
      },
    },
  ];

  for (const round of speedRounds) {
    const exists = await GameContent.findOne({
      game_type: "PHYSICS_CAPACITANCE_SPEED_CHALLENGE",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_CAPACITANCE_SPEED_CHALLENGE",
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

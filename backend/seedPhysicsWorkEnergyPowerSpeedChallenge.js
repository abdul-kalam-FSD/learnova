require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Adds PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE content to the SAME
// Grade 11 "Work, Energy and Power" chapter that seedPhysicsGrade11b.js
// already seeds with PHYSICS_MATCH — a second mechanic for the same
// chapter, same sibling pattern as seedPhysicsOhmsLawGrade10.js adding
// a Speed Challenge alongside Circuit Builder on "Series and Parallel
// Circuits". PHYSICS_MATCH there covers the *qualitative* side
// (recognizing which energy concept a scenario illustrates); this
// covers the *quantitative* side — KE = ½mv², W = F × d, P = W / t —
// that this chapter never had a mechanic for.
//
// New Concept since "calculate it" is a different objective from
// "recognize the concept", matching how every other Speed Challenge
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Work, Energy and Power" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Mechanics",
      title: "Work, Energy and Power",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Calculating Work, Energy and Power" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Calculating Work, Energy and Power",
      explanation_text:
        "Kinetic energy is KE = ½mv² (mass in kg, speed in m/s, energy in joules). Work done by a constant force is W = F × d (force in newtons, distance in metres, work in joules). Power is the rate of doing work: P = W / t (time in seconds, power in watts).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // Every question below divides/multiplies evenly to a clean whole
  // number, same "no decimal fighting" spirit as the Math Speed
  // Challenges and the Ohm's Law Speed Challenge.
  const speedRounds = [
    {
      title: "Speed Round: Kinetic Energy and Work",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "KE = ½mv². W = F × d.",
        questions: [
          { id: "q1", prompt: "A 4 kg object moves at 5 m/s. Find its kinetic energy.", unit: "J", correct_answer: 50 },
          { id: "q2", prompt: "A 2 kg object moves at 10 m/s. Find its kinetic energy.", unit: "J", correct_answer: 100 },
          { id: "q3", prompt: "A force of 20 N pushes a box 5 m in the direction of the force. Find the work done.", unit: "J", correct_answer: 100 },
          { id: "q4", prompt: "A force of 15 N pushes a crate 4 m in the direction of the force. Find the work done.", unit: "J", correct_answer: 60 },
          { id: "q5", prompt: "A 6 kg object moves at 4 m/s. Find its kinetic energy.", unit: "J", correct_answer: 48 },
        ],
      },
    },
    {
      title: "Speed Round: Power Calculations",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 12,
        hint: "P = W / t. Rearranged: W = P × t, or t = W / P.",
        questions: [
          { id: "q1", prompt: "100 J of work is done in 5 seconds. Find the power.", unit: "W", correct_answer: 20 },
          { id: "q2", prompt: "240 J of work is done in 8 seconds. Find the power.", unit: "W", correct_answer: 30 },
          { id: "q3", prompt: "A motor delivers 50 W of power for 6 seconds. Find the work done.", unit: "J", correct_answer: 300 },
          { id: "q4", prompt: "A pump delivers 40 W of power for 10 seconds. Find the work done.", unit: "J", correct_answer: 400 },
          { id: "q5", prompt: "180 J of work is done in 9 seconds. Find the power.", unit: "W", correct_answer: 20 },
        ],
      },
    },
  ];

  for (const round of speedRounds) {
    const exists = await GameContent.findOne({
      game_type: "PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE",
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

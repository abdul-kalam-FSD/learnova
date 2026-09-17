require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Calculating Capacitance" (Grade 12
// Physics, seedPhysicsCapacitanceSpeedChallenge.js) only has 2
// GameContent rounds (basic C=Q/V, then equal-value series/parallel),
// with no "hard" round and no energy-stored-in-a-capacitor or
// unequal-value series coverage. This adds 2 more
// PHYSICS_CAPACITANCE_SPEED_CHALLENGE rounds to the SAME existing
// concept. Same numeric-answer question batch payload shape as the
// original 2 rounds — no new mechanic. Errors out if the subject/
// chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 12, name: /physics/i });
  if (!subject) {
    console.error("Grade 12 Physics subject not found — run seedPhysicsCapacitanceSpeedChallenge.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Electrostatics" });
  if (!chapter) {
    console.error('Chapter "Electrostatics" not found — run seedPhysicsCapacitanceSpeedChallenge.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Calculating Capacitance" });
  if (!concept) {
    console.error('Concept "Calculating Capacitance" not found — run seedPhysicsCapacitanceSpeedChallenge.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newRounds = [
    {
      title: "Speed Round: Unequal Series Capacitors",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 15,
        hint: "For series: 1/C_total = 1/C1 + 1/C2. Combine the fractions, then flip the result.",
        questions: [
          { id: "q1", prompt: "Two capacitors of 3 F and 6 F are connected in series. Find the total capacitance.", unit: "F", correct_answer: 2 },
          { id: "q2", prompt: "Two equal 4 F capacitors are connected in series. Find the total capacitance.", unit: "F", correct_answer: 2 },
          { id: "q3", prompt: "Two equal 8 F capacitors are connected in series. Find the total capacitance.", unit: "F", correct_answer: 4 },
          { id: "q4", prompt: "Two capacitors of 12 F and 4 F are connected in series. Find the total capacitance.", unit: "F", correct_answer: 3 },
          { id: "q5", prompt: "Two capacitors of 9 F and 18 F are connected in series. Find the total capacitance.", unit: "F", correct_answer: 6 },
          { id: "q6", prompt: "Two capacitors of 10 F and 15 F are connected in series. Find the total capacitance.", unit: "F", correct_answer: 6 },
        ],
      },
    },
    {
      title: "Speed Round: Energy Stored in a Capacitor",
      difficulty: "hard",
      order_index: 4,
      payload: {
        time_limit_seconds: 15,
        hint: "Energy stored: U = 1/2 x C x V\u00b2 (capacitance in farads, voltage in volts, energy in joules).",
        questions: [
          { id: "q1", prompt: "A 2 F capacitor is charged to 4 V. Find the energy stored.", unit: "J", correct_answer: 16 },
          { id: "q2", prompt: "A 4 F capacitor is charged to 3 V. Find the energy stored.", unit: "J", correct_answer: 18 },
          { id: "q3", prompt: "A 1 F capacitor is charged to 6 V. Find the energy stored.", unit: "J", correct_answer: 18 },
          { id: "q4", prompt: "A 5 F capacitor is charged to 2 V. Find the energy stored.", unit: "J", correct_answer: 10 },
          { id: "q5", prompt: "A 2 F capacitor stores 25 J of energy. Find the voltage across it (V\u00b2 = 2U/C).", unit: "V", correct_answer: 5 },
          { id: "q6", prompt: "A 3 F capacitor is charged to 4 V. Find the energy stored.", unit: "J", correct_answer: 24 },
        ],
      },
    },
  ];

  for (const round of newRounds) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_CAPACITANCE_SPEED_CHALLENGE", title: round.title });
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

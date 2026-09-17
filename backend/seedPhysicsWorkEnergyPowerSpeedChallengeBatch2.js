require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Calculating Work, Energy and Power"
// (Grade 11 Physics, seedPhysicsWorkEnergyPowerSpeedChallenge.js) only
// has 2 GameContent rounds (basic KE/work, and power), with no "hard"
// round and no coverage of the work-energy theorem or gravitational
// PE/energy conservation — both core NCERT Class 11 topics for this
// chapter. This adds 3 more PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE
// rounds to the SAME existing concept. Same numeric-answer question
// batch payload shape as the original 2 rounds, same
// MULTI_QUESTION_GAME_TYPES / checkMultiQuestionAttempt scoring — no
// new mechanic. Errors out if the subject/chapter/concept don't
// already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /physics/i });
  if (!subject) {
    console.error("Grade 11 Physics subject not found — run seedPhysicsWorkEnergyPowerSpeedChallenge.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Work, Energy and Power" });
  if (!chapter) {
    console.error('Chapter "Work, Energy and Power" not found — run seedPhysicsWorkEnergyPowerSpeedChallenge.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Calculating Work, Energy and Power" });
  if (!concept) {
    console.error('Concept "Calculating Work, Energy and Power" not found — run seedPhysicsWorkEnergyPowerSpeedChallenge.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newRounds = [
    {
      title: "Speed Round: The Work-Energy Theorem",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 15,
        hint: "The work-energy theorem: net work done on an object equals its change in kinetic energy, W_net = KE_final − KE_initial.",
        questions: [
          { id: "q1", prompt: "A 2 kg object speeds up from 3 m/s to 5 m/s. Find the work done on it (its change in kinetic energy).", unit: "J", correct_answer: 16 },
          { id: "q2", prompt: "A 4 kg object slows from 6 m/s to 2 m/s. Find the magnitude of the work done in slowing it down.", unit: "J", correct_answer: 64 },
          { id: "q3", prompt: "A 1 kg ball starts at rest and speeds up to 8 m/s. Find the work done on it.", unit: "J", correct_answer: 32 },
          { id: "q4", prompt: "A 3 kg cart speeds up from 2 m/s to 4 m/s. Find the work done on it.", unit: "J", correct_answer: 18 },
          { id: "q5", prompt: "A 5 kg object moving at 4 m/s is brought to rest. Find the magnitude of the work done to stop it.", unit: "J", correct_answer: 40 },
          { id: "q6", prompt: "A 2 kg object speeds up from 4 m/s to 6 m/s. Find the work done on it.", unit: "J", correct_answer: 20 },
        ],
      },
    },
    {
      title: "Speed Round: Gravitational Potential Energy",
      difficulty: "medium",
      order_index: 4,
      payload: {
        time_limit_seconds: 12,
        hint: "Gravitational PE = mgh (mass in kg, g = 10 m/s\u00b2 in this game, height in m, energy in joules).",
        questions: [
          { id: "q1", prompt: "A 5 kg object is lifted 4 m. Find its gravitational potential energy (use g = 10 m/s\u00b2).", unit: "J", correct_answer: 200 },
          { id: "q2", prompt: "A 2 kg object is lifted 10 m. Find its gravitational potential energy.", unit: "J", correct_answer: 200 },
          { id: "q3", prompt: "A 10 kg object is lifted 3 m. Find its gravitational potential energy.", unit: "J", correct_answer: 300 },
          { id: "q4", prompt: "An object has 400 J of gravitational potential energy at a height of 8 m. Find its mass.", unit: "kg", correct_answer: 5 },
          { id: "q5", prompt: "A 4 kg object has 120 J of gravitational potential energy. Find its height above the ground.", unit: "m", correct_answer: 3 },
          { id: "q6", prompt: "A 6 kg object is lifted 5 m. Find its gravitational potential energy.", unit: "J", correct_answer: 300 },
        ],
      },
    },
    {
      title: "Speed Round: Conservation of Mechanical Energy",
      difficulty: "hard",
      order_index: 5,
      payload: {
        time_limit_seconds: 18,
        hint: "When only gravity acts, total mechanical energy is conserved: kinetic energy gained equals potential energy lost (ignoring air resistance).",
        questions: [
          { id: "q1", prompt: "A 2 kg ball is dropped from a height of 5 m. Find its kinetic energy just before hitting the ground (use g = 10 m/s\u00b2, ignore air resistance).", unit: "J", correct_answer: 100 },
          { id: "q2", prompt: "A 1 kg ball is dropped from a height of 5 m. Find its speed just before hitting the ground (use g = 10 m/s\u00b2).", unit: "m/s", correct_answer: 10 },
          { id: "q3", prompt: "A pendulum bob of mass 3 kg swings down from a height of 2 m above its lowest point. Find its kinetic energy at the lowest point (use g = 10 m/s\u00b2, ignore air resistance).", unit: "J", correct_answer: 60 },
          { id: "q4", prompt: "A 4 kg object is dropped from a height of 5 m. Find its kinetic energy just before landing (use g = 10 m/s\u00b2).", unit: "J", correct_answer: 200 },
          { id: "q5", prompt: "A ball dropped from a height of 8 m has 160 J of kinetic energy just before hitting the ground (use g = 10 m/s\u00b2). Find its mass.", unit: "kg", correct_answer: 2 },
          { id: "q6", prompt: "A 2 kg object dropped from height h has 100 J of kinetic energy just before hitting the ground (use g = 10 m/s\u00b2). Find h.", unit: "m", correct_answer: 5 },
        ],
      },
    },
  ];

  for (const round of newRounds) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE", title: round.title });
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 Batch 1 (Part B, Science expansion). Adds the current NCERT
// Class 7 Science ("Curiosity", NCF-SE 2023, 2026-27 session) Chapter
// 7, "Heat Transfer in Nature" — verified via multiple independent
// chapter-list sources during the Grade 7 audit (conduction,
// convection, radiation, plus the land-breeze/sea-breeze examples the
// chapter is known for).
//
// Gap 1 fix: Physics is not a separate top-level Subject below Grade
// 11 — it lives inside the integrated "Science" subject, with chapters
// tagged strand: "Physics" for mastery/analytics.
//
// Reuses PHYSICS_MATCH's mapping-equality check (already registered;
// same "assign each slot to its correct counterpart" shape used by
// seedPhysicsMatchGrade6.js for Magnetic/Non-Magnetic) — matching an
// everyday scenario to Conduction/Convection/Radiation is the same
// shape. No new mechanic.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 7 });
    console.log("Created new Grade 7 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Heat Transfer in Nature" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Heat",
      title: "Heat Transfer in Nature",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Conduction, Convection and Radiation" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Conduction, Convection and Radiation",
      explanation_text:
        "Heat moves in three ways: conduction (through direct touch, like a hot spoon warming your hand), convection (through a moving fluid, like warm air or water rising), and radiation (through empty space, like sunlight warming your skin with no medium needed in between).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- PHYSICS MATCH challenges (GameType: PHYSICS_MATCH) ----------
  const physicsMatchChallenges = [
    {
      title: "Match: Mode of Heat Transfer",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each situation to how the heat is actually travelling.",
        slots: [
          { id: "s1", label: "Touching a hot metal spoon burns your hand" },
          { id: "s2", label: "Steam from a heater spreads warmth through a room" },
          { id: "s3", label: "The Sun warms the Earth across empty space" },
        ],
        components: [
          { id: "c1", label: "Conduction" },
          { id: "c2", label: "Convection" },
          { id: "c3", label: "Radiation" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Conduction needs touching, convection needs a moving fluid, radiation needs neither.",
      },
    },
    {
      title: "Match: Heat Transfer in Everyday Life",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each everyday example to its mode of heat transfer.",
        slots: [
          { id: "s1", label: "Ice cream melts faster when held in your warm hand" },
          { id: "s2", label: "You feel warmth from a bonfire without touching it" },
          { id: "s3", label: "A hot air balloon rises as the air inside it heats up" },
          { id: "s4", label: "At night, a breeze blows from the land toward the sea" },
        ],
        components: [
          { id: "c1", label: "Conduction" },
          { id: "c2", label: "Convection" },
          { id: "c3", label: "Radiation" },
        ],
        correct_mapping: { s1: "c1", s2: "c3", s3: "c2", s4: "c2" },
        hint: "Rising warm air and moving breezes are both convection, even outdoors.",
      },
    },
  ];

  for (const challenge of physicsMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "PHYSICS_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_MATCH",
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

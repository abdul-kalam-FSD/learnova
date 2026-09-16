require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 6 Physics hole left by the seedPhysicsCircuitBasicsGrade7.js
// grade-correction: circuits moved to Grade 7 (confirmed exact match,
// Ch.3 "Electricity - Circuits and their Components"), which left
// Grade 6 with no Physics content at all. Under the current
// "Curiosity" textbook (NCF-SE 2023, 2026-27 session), Grade 6's
// confirmed Physics-relevant chapter is Ch.4, "Exploring Magnets" —
// a real, confirmed Grade 6 topic, distinct from the Grade 7 circuits
// content it replaces.
//
// Gap 1 fix: Physics is not a separate top-level Subject below
// Grade 11 — it lives inside the integrated "Science" subject, with
// chapters tagged strand: "Physics" for mastery/analytics.
//
// New mechanic PHYSICS_MATCH reuses the shared mapping-equality
// scoring group (same backend logic as CHEMISTRY_MATCH/Fraction
// Match/Shape Match/Ratio Match) — matching an object or effect to
// "Magnetic" or "Non-Magnetic" is the same "assign each slot to its
// correct counterpart" shape as CHEMISTRY_MATCH, added the same way
// CHEMISTRY_MATCH was added to fill Grade 8's Chemistry hole. This
// becomes Physics's 2nd mechanic alongside Circuit Builder.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 6 });
    console.log("Created new Grade 6 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Exploring Magnets" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Physics",
      title: "Exploring Magnets",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Magnetic and Non-Magnetic Materials" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Magnetic and Non-Magnetic Materials",
      explanation_text:
        "A magnet attracts certain materials — mainly iron, nickel, and cobalt, and things made from them — but has no effect on most other materials, like wood, plastic, or aluminium. A magnet also always has two poles, and like poles repel while unlike poles attract.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same mapping-equality check as CHEMISTRY_MATCH —
  // student matches each object/effect card (slot) to Magnetic or
  // Non-Magnetic (component); the tray always has both category
  // labels, with the third round adding decoy labels to stop simple
  // elimination.
  const physicsMatchChallenges = [
    {
      title: "Match: Magnetic or Non-Magnetic",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each object to whether a magnet attracts it or not.",
        slots: [
          { id: "s1", label: "Iron Nail" },
          { id: "s2", label: "Wooden Ruler" },
          { id: "s3", label: "Steel Paperclip" },
        ],
        components: [
          { id: "c1", label: "Magnetic" },
          { id: "c2", label: "Non-Magnetic" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1" },
        hint: "A magnet attracts iron and steel objects, but has no effect on wood.",
      },
    },
    {
      title: "Match: Everyday Materials",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each everyday material to the category it belongs to.",
        slots: [
          { id: "s1", label: "Aluminium Foil" },
          { id: "s2", label: "Cobalt Sample" },
          { id: "s3", label: "Plastic Ruler" },
          { id: "s4", label: "Nickel Coin" },
        ],
        components: [
          { id: "c1", label: "Magnetic" },
          { id: "c2", label: "Non-Magnetic" },
        ],
        correct_mapping: { s1: "c2", s2: "c1", s3: "c2", s4: "c1" },
        hint: "Only iron, nickel, cobalt, and materials made from them are magnetic — aluminium and plastic are not.",
      },
    },
    {
      title: "Match: Poles and Effects",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "Magnet behaviour goes beyond just attraction. Match each situation to what actually happens.",
        slots: [
          { id: "s1", label: "Bringing two North poles close together" },
          { id: "s2", label: "Bringing a North pole and a South pole close together" },
          { id: "s3", label: "Holding a magnet near a piece of gold" },
        ],
        components: [
          { id: "c1", label: "The poles repel" },
          { id: "c2", label: "The poles attract" },
          { id: "c3", label: "Nothing happens — gold isn't magnetic" },
          { id: "c4", label: "The gold becomes permanently magnetized" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Like poles push apart, unlike poles pull together — and gold isn't one of the magnetic metals.",
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

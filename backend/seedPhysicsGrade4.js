require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 vertical slice. Reuses PHYSICS_CIRCUIT_BUILDER exactly as
// the Grade 6 version does (mapping-equality check), scaled down to
// just the two components every Grade 4 EVS syllabus already covers:
// a battery (power source) and a bulb (load) — the switch/resistor
// complexity from Grade 6 is left out entirely rather than simplified
// awkwardly.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Physics is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject, with
  // its chapters tagged strand: "Physics" for mastery/analytics. See
  // migrations/mergeGrade4ScienceAndSocialScience.js for the one-time
  // migration that moves any pre-existing standalone Physics content
  // into this shape.
  let subject = await Subject.findOne({ grade: 4, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 4 });
    console.log("Created new Grade 4 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Simple Circuits" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electricity Basics",
      title: "Simple Circuits",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Making a Bulb Light Up" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Making a Bulb Light Up",
      explanation_text:
        "For a bulb to light up, it needs a battery to push electricity through it, connected in a complete loop with nothing missing. If any part of the loop is broken or missing, the bulb won't light up at all.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const circuitChallenges = [
    {
      title: "Light the Bulb — Basic Circuit",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Connect the battery and bulb correctly so the bulb lights up.",
        components: [
          { id: "c1", label: "Battery" },
          { id: "c2", label: "Bulb" },
        ],
        slots: [
          { id: "s1", label: "Power Source" },
          { id: "s2", label: "Load" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "The battery is what pushes the electricity — it always goes in the power source slot.",
      },
    },
    {
      title: "Light the Bulb — With a Switch",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "This circuit also has a switch to turn the bulb on and off.",
        components: [
          { id: "d1", label: "Battery" },
          { id: "d2", label: "Switch" },
          { id: "d3", label: "Bulb" },
        ],
        slots: [
          { id: "t1", label: "Power Source" },
          { id: "t2", label: "On/Off Control" },
          { id: "t3", label: "Load" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "The switch controls whether electricity can flow — it doesn't push the current itself.",
      },
    },
    {
      title: "Two Bulbs, One Battery",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "This circuit lights up two bulbs from one battery, with a switch to control both.",
        components: [
          { id: "e1", label: "Battery" },
          { id: "e2", label: "Switch" },
          { id: "e3", label: "Bulb 1" },
          { id: "e4", label: "Bulb 2" },
        ],
        slots: [
          { id: "v1", label: "Power Source" },
          { id: "v2", label: "On/Off Control" },
          { id: "v3", label: "First Load" },
          { id: "v4", label: "Second Load" },
        ],
        correct_mapping: { v1: "e1", v2: "e2", v3: "e3", v4: "e4" },
        hint: "There's still only one power source and one switch — the two bulbs each just take a load slot.",
      },
    },
  ];

  for (const challenge of circuitChallenges) {
    const exists = await GameContent.findOne({
      game_type: "PHYSICS_CIRCUIT_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_CIRCUIT_BUILDER",
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

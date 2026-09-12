require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// 3rd subject vertical slice (Section 24: prove the universal platform
// runs a 3rd subject with its own genuinely different mechanic — not
// Case Investigation, not a sequencing puzzle. Circuit Builder is a
// pair-mapping interaction: each slot must be assigned its correct
// component).
//
// GRADE CORRECTED (Gap 5, new-curriculum pass): originally seeded at
// Grade 6. Under the current NCF-SE 2023 curriculum (2026-27
// session), Grade 6 Science is "Curiosity", and its confirmed 12
// chapters (Wonderful World of Science; Diversity in Living World;
// Mindful Eating; Exploring Magnets; Measurement of Length and
// Motion; Materials Around Us; Temperature; States of Water; Methods
// of Separation; Living Creatures; Nature's Treasures; Beyond Earth)
// have NO electricity/circuits chapter at all. Circuits now lives at
// Grade 7 — Ch.3, "Electricity - Circuits and their Components" — a
// confirmed, exact match, and this content (battery/switch/resistor/
// two-switch hallway circuit) fits that level well, arguably better
// than Grade 6 anyway. Grade 6's actual Physics content is now
// "Exploring Magnets" — see seedPhysicsMatchGrade6.js.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Physics is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject, with
  // its chapters tagged strand: "Physics" for mastery/analytics. See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Physics content into this shape.
  let subject = await Subject.findOne({ grade: 7, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 7 });
    console.log("Created new Grade 7 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Electric Circuits" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electricity",
      title: "Electric Circuits",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Circuit Components and Function" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Circuit Components and Function",
      explanation_text:
        "A complete circuit needs a power source to push current, a load that uses the energy, and often a control component to start or stop the flow. Each component has one correct role — swapping them breaks the circuit.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `components` are the tappable parts (tray);
  // `slots` are the circuit positions each needs one part assigned
  // to; `correct_mapping` is { slotId: componentId }.
  const circuitChallenges = [
    {
      title: "Light a Single Bulb",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Wire a basic circuit so the bulb lights up.",
        components: [
          { id: "c1", label: "Battery" },
          { id: "c2", label: "Switch" },
          { id: "c3", label: "Bulb" },
        ],
        slots: [
          { id: "s1", label: "Power Source" },
          { id: "s2", label: "Control" },
          { id: "s3", label: "Load" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The power source pushes current, the control turns it on/off, the load uses the energy.",
      },
    },
    {
      title: "Circuit With a Resistor",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "This circuit needs a resistor to protect the bulb from too much current.",
        components: [
          { id: "d1", label: "Battery" },
          { id: "d2", label: "Resistor" },
          { id: "d3", label: "Bulb" },
          { id: "d4", label: "Switch" },
        ],
        slots: [
          { id: "t1", label: "Power Source" },
          { id: "t2", label: "Control" },
          { id: "t3", label: "Current Limiter" },
          { id: "t4", label: "Load" },
        ],
        correct_mapping: { t1: "d1", t2: "d4", t3: "d2", t4: "d3" },
        hint: "The resistor's job is to limit current, not to store or use energy directly.",
      },
    },
    {
      title: "Two-Switch Control Circuit",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "A hallway light needs two switches, one at each end, plus a battery and bulb.",
        components: [
          { id: "u1", label: "Battery" },
          { id: "u2", label: "Switch A" },
          { id: "u3", label: "Switch B" },
          { id: "u4", label: "Bulb" },
        ],
        slots: [
          { id: "v1", label: "Power Source" },
          { id: "v2", label: "First Control Point" },
          { id: "v3", label: "Second Control Point" },
          { id: "v4", label: "Load" },
        ],
        correct_mapping: { v1: "u1", v2: "u2", v3: "u3", v4: "u4" },
        hint: "Both switches sit in the control path, one after the other, before the current reaches the bulb.",
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

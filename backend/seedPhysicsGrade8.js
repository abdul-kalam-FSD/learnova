require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 8 Physics hole in the integrated Science subject —
// Grade 8 previously had Chemistry (Metals and Non-Metals, via
// seedChemistryMatchGrade8.js), but no Physics. Grounded in the
// current "Curiosity" textbook (NCF-SE 2023, 2026-27 session),
// confirmed 13-chapter list, Ch.4 "Electricity: Magnetic and Heating
// Effects" — a real Grade 8 chapter covering what current does beyond
// just lighting a bulb (heating a wire, deflecting a compass needle).
//
// Gap 1 fix: Physics is not a separate top-level Subject below Grade
// 11 — it lives inside the integrated "Science" subject, with
// chapters tagged strand: "Physics" for mastery/analytics.
//
// Reuses PHYSICS_CIRCUIT_BUILDER (same slot/component mapping-
// equality check as the Grade 6 "Electric Circuits" version), stepped
// up from basic power/control/load wiring to circuits built
// specifically to produce a heating or magnetic effect.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 8, name: /science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 8 });
    console.log("Created new Grade 8 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Electricity: Magnetic and Heating Effects" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Physics",
      title: "Electricity: Magnetic and Heating Effects",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Wiring a Circuit for a Specific Effect" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Wiring a Circuit for a Specific Effect",
      explanation_text:
        "Current flowing through a wire can do more than light a bulb — a thin resistive wire heats up (as in an electric heater), and current flowing near a compass needle deflects it (as in an electromagnet). Which effect you get depends on which component sits in the circuit and how it's connected.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as PHYSICS_CIRCUIT_BUILDER elsewhere —
  // `components` are the tappable parts (tray); `slots` are the
  // circuit positions each needs one part assigned to;
  // `correct_mapping` is { slotId: componentId }.
  const circuitChallenges = [
    {
      title: "Build a Simple Electric Heater Circuit",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Wire a circuit so current heats up a coil of resistance wire.",
        components: [
          { id: "c1", label: "Battery" },
          { id: "c2", label: "Switch" },
          { id: "c3", label: "Nichrome Coil" },
        ],
        slots: [
          { id: "s1", label: "Power Source" },
          { id: "s2", label: "Control" },
          { id: "s3", label: "Heating Element" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The coil needs to sit where the bulb usually goes — it's the part that actually produces the heat.",
      },
    },
    {
      title: "Build a Simple Electromagnet",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Wire a circuit so current flowing through a coil turns an iron nail into a temporary magnet.",
        components: [
          { id: "d1", label: "Battery" },
          { id: "d2", label: "Switch" },
          { id: "d3", label: "Coil of Insulated Wire Around an Iron Nail" },
        ],
        slots: [
          { id: "t1", label: "Power Source" },
          { id: "t2", label: "Control" },
          { id: "t3", label: "Electromagnet Coil" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "The coil around the nail is what generates the magnetic field once current flows through it.",
      },
    },
    {
      title: "Fuse-Protected Heating Circuit",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "This heating circuit needs a fuse that will melt and break the circuit if too much current flows, protecting the rest of the wiring.",
        components: [
          { id: "u1", label: "Battery" },
          { id: "u2", label: "Switch" },
          { id: "u3", label: "Fuse Wire" },
          { id: "u4", label: "Heating Coil" },
        ],
        slots: [
          { id: "v1", label: "Power Source" },
          { id: "v2", label: "Control" },
          { id: "v3", label: "Overload Protection" },
          { id: "v4", label: "Heating Element" },
        ],
        correct_mapping: { v1: "u1", v2: "u2", v3: "u3", v4: "u4" },
        hint: "The fuse's job is to be the weakest link on purpose — it should melt before the rest of the wiring overheats.",
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

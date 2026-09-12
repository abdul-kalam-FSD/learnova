require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass: Grade 10 previously had Biology +
// Chemistry only. Physics already exists at Grade 9 (series/parallel
// circuits) and Grade 11/12 (capacitors, diodes) — this fills the
// gap between them. Reuses PHYSICS_CIRCUIT_BUILDER's mapping
// mechanic with the CBSE Class 10 "Effects of Electric Current"
// topic: matching each real-world device to which effect of current
// it relies on.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Gap 1 fix: Physics is not a separate top-level Subject below
  // Grade 11 — it lives inside the integrated "Science" subject
  // (reusing the Subject seeded by seedGrade10.js, matched via
  // {grade, name}), with its chapters tagged strand: "Physics" for
  // mastery/analytics. See
  // migrations/mergeGrades5to10ScienceAndSocialScience.js for the
  // one-time migration that moves any pre-existing standalone
  // Physics content into this shape.
  let subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 10 });
    console.log("Created new Grade 10 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Effects of Electric Current" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electricity",
      title: "Effects of Electric Current",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Heating, Magnetic, and Chemical Effects" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Heating, Magnetic, and Chemical Effects",
      explanation_text:
        "Electric current can do more than just flow through a wire. Passing current through a resistor generates heat (heating effect), passing it through a coiled wire creates a magnetic field (magnetic effect), and passing it through certain liquids causes a chemical reaction (chemical effect). Everyday devices are built around whichever effect suits the job.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const currentEffectChallenges = [
    {
      title: "Match the Device to the Effect",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Three everyday devices rely on different effects of electric current. Match each device to the effect it uses.",
        slots: [
          { id: "s1", label: "Electric heater / toaster" },
          { id: "s2", label: "Electric bell / electromagnet crane" },
          { id: "s3", label: "Electroplating a spoon with silver" },
        ],
        components: [
          { id: "c1", label: "Heating effect — resistance converts electrical energy to heat" },
          { id: "c2", label: "Magnetic effect — current in a coil creates a magnetic field" },
          { id: "c3", label: "Chemical effect — current causes ions to move and deposit metal" },
          { id: "c4", label: "None of these — no current is involved" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Think about what the device is actually doing at the moment it works — producing warmth, pulling metal, or coating a surface.",
      },
    },
    {
      title: "Why Does the Fuse Wire Melt?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "A circuit draws more current than it should. Match each stage to what's physically happening.",
        slots: [
          { id: "s1", label: "Current exceeds the fuse wire's rated value" },
          { id: "s2", label: "Fuse wire heats up rapidly" },
          { id: "s3", label: "Fuse wire melts and breaks" },
        ],
        components: [
          { id: "c1", label: "Excess current flows through the thin fuse wire" },
          { id: "c2", label: "The heating effect (H = I²Rt) generates more heat than the wire can dissipate" },
          { id: "c3", label: "The circuit is broken, stopping current flow and protecting the rest of the circuit" },
          { id: "c4", label: "The wire becomes magnetized and attracts nearby metal" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A fuse is deliberately the weakest link — it's designed to use the heating effect to fail safely before anything else does.",
      },
    },
    {
      title: "Electromagnet Strength: What Changes It?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each change made to a current-carrying coil to its effect on the magnetic field it produces.",
        slots: [
          { id: "s1", label: "Increasing the current through the coil" },
          { id: "s2", label: "Adding more turns to the coil" },
          { id: "s3", label: "Inserting a soft iron core inside the coil" },
        ],
        components: [
          { id: "c1", label: "Magnetic field strength increases" },
          { id: "c2", label: "Magnetic field strength increases further" },
          { id: "c3", label: "Magnetic field strength increases greatly — the core concentrates the field" },
          { id: "c4", label: "Magnetic field strength stays exactly the same" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "All three of these are exactly how a real electromagnet (like the one in an electric bell) is made stronger.",
      },
    },
  ];

  for (const challenge of currentEffectChallenges) {
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

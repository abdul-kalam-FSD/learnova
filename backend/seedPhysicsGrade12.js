require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass, Grade 11-12 gap: Grade 12 previously had
// Biology + Chemistry (just added) only. This is Physics's first
// appearance at Grade 12. Reuses PHYSICS_CIRCUIT_BUILDER's mapping
// mechanic (no code changes) with a genuinely different topic than
// Grade 9's resistor circuits or Grade 11's capacitors — p-n junction
// diode behavior, matching Grade 12's Semiconductor Electronics unit.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 12, name: /physics/i });
  if (!subject) {
    subject = await Subject.create({ name: "Physics", grade: 12 });
    console.log("Created new Grade 12 Physics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Semiconductor Electronics" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electronics",
      title: "Semiconductor Electronics",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "p-n Junction Diode Behavior" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "p-n Junction Diode Behavior",
      explanation_text:
        "A p-n junction diode conducts current easily in one direction (forward bias, p-side connected to the positive terminal) and blocks it almost completely in the other direction (reverse bias). Forward bias narrows the depletion region and lets majority carriers flow across the junction; reverse bias widens it and only a tiny leakage current flows.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // `theme` overrides CircuitBuilder.jsx's default circuit-wiring copy —
  // this chapter classifies diode bias/behavior, it doesn't wire
  // anything, so the on-screen language shouldn't say "circuit".
  const DIODE_THEME = {
    topBarLabel: "Diode Behavior Lab",
    badge: "PHYSICS · SEMICONDUCTOR ELECTRONICS",
    heading: "Classify the Diode Behavior",
    intro:
      "Match each diode setup to what actually happens — get every match right to complete the lab.",
    itemsNoun: "setups to classify",
    objective: "Match each setup to its correct behavior.",
    slotsLabel: "Setups (tap a behavior below, then tap a setup to place it):",
    componentsLabel: "Behaviors:",
    testButtonLabel: "Check Answers",
    testingLabel: "Checking...",
    verdictCorrect: "✓ All classified correctly!",
    verdictIncorrect: "✕ Not quite right yet.",
    whatYouLearned:
      "A p-n junction conducts easily when forward biased (majority carriers flow) and blocks current when reverse biased (only tiny leakage current flows).",
    resultTopBarLabel: "Lab Complete",
    resultBadge: "CONCEPT MASTERED",
    playAnotherLabel: "Try Another Setup",
  };

  const diodeChallenges = [
    {
      title: "Forward or Reverse Bias?",
      difficulty: "medium",
      order_index: 1,
      payload: {
        theme: DIODE_THEME,
        scenario: "Three diode circuits are set up differently. Match each wiring to what actually happens.",
        slots: [
          { id: "s1", label: "p-side connected to battery's positive terminal" },
          { id: "s2", label: "n-side connected to battery's positive terminal" },
          { id: "s3", label: "No battery connected at all" },
        ],
        components: [
          { id: "c1", label: "Forward bias — depletion region narrows, current flows easily" },
          { id: "c2", label: "Reverse bias — depletion region widens, only tiny leakage current flows" },
          { id: "c3", label: "No bias — depletion region stays at its natural equilibrium width" },
          { id: "c4", label: "Forward bias — depletion region widens" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "'Forward' bias means the terminal matching each side's majority charge — positive to p-side, negative to n-side.",
      },
    },
    {
      title: "Reading the I-V Curve",
      difficulty: "hard",
      order_index: 2,
      payload: {
        theme: DIODE_THEME,
        scenario: "A diode's current-voltage graph has different regions. Match each region to its description.",
        slots: [
          { id: "s1", label: "Forward voltage below ~0.7V (silicon)" },
          { id: "s2", label: "Forward voltage above ~0.7V (silicon)" },
          { id: "s3", label: "Reverse voltage, below breakdown" },
        ],
        components: [
          { id: "c1", label: "Almost no current flows — the diode hasn't 'turned on' yet" },
          { id: "c2", label: "Current rises very steeply with small increases in voltage" },
          { id: "c3", label: "A very small, roughly constant reverse saturation current flows" },
          { id: "c4", label: "Current is exactly zero with no exceptions" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Silicon diodes need about 0.7V of forward bias before they conduct significantly — below that, they're nearly off.",
      },
    },
    {
      title: "Half-Wave Rectifier: One Cycle",
      difficulty: "hard",
      order_index: 3,
      payload: {
        theme: DIODE_THEME,
        scenario: "A single diode rectifier is fed an AC input. Match each half of the input cycle to the diode's state and the output.",
        slots: [
          { id: "s1", label: "Input's positive half-cycle (matches diode's forward direction)" },
          { id: "s2", label: "Input's negative half-cycle" },
        ],
        components: [
          { id: "c1", label: "Diode conducts — output follows the input" },
          { id: "c2", label: "Diode blocks — output stays at zero" },
          { id: "c3", label: "Diode conducts — output is inverted" },
          { id: "c4", label: "Diode blocks — output follows the input anyway" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "A single diode only lets current through in one direction — the other half-cycle of the AC input gets cut off entirely, not inverted.",
      },
    },
  ];

  for (const challenge of diodeChallenges) {
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
    } else if (!exists.payload?.theme) {
      exists.payload = { ...exists.payload, theme: challenge.payload.theme };
      exists.markModified("payload");
      await exists.save();
      console.log("Patched theme onto existing GameContent:", exists.title, exists._id);
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

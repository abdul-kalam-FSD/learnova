require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass, Grade 11-12 gap: Physics's first
// appearance above Grade 10. Reuses PHYSICS_CIRCUIT_BUILDER's mapping
// mechanic as-is (no code changes) with an electrostatics/capacitor-
// behavior topic.
//
// Gap 5 fix: originally seeded at Grade 11 (file was named
// seedPhysicsGrade11.js; renamed to match its real grade as part of
// the Gap 8 audit fix). Verified directly —
// Electrostatic Potential and Capacitance is NCERT Class 12 Physics
// Ch.1-2. Class 11 Physics is mechanics/thermodynamics/oscillations/
// waves; there's no electricity or magnetism content at that level
// at all. Moved to Grade 12, alongside the existing Semiconductor
// Electronics chapter from seedPhysicsGrade12.js.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Electrostatics" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electricity and Magnetism",
      title: "Electrostatics",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Capacitor Behavior in Circuits" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Capacitor Behavior in Circuits",
      explanation_text:
        "A capacitor stores charge on two plates separated by an insulator. In series, capacitors share the same charge but split voltage, and their combined capacitance is smaller than the smallest one. In parallel, capacitors share the same voltage but their capacitances simply add, giving a larger combined capacitance.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape matches Circuit Builder: `components` are the
  // tappable answer cards, `slots` are the setups needing one
  // assigned, `correct_mapping` is stripped before the client sees it.
  // `theme` overrides CircuitBuilder.jsx's default circuit-wiring copy —
  // this chapter is about matching capacitor behavior, not wiring
  // anything, so the on-screen language shouldn't say "circuit".
  const CAPACITOR_THEME = {
    topBarLabel: "Capacitance Lab",
    badge: "PHYSICS · ELECTROSTATICS",
    heading: "Match the Capacitor Behavior",
    intro:
      "Match each capacitor scenario to what actually happens — get every match right to complete the lab.",
    itemsNoun: "scenarios to match",
    objective: "Match each scenario to its correct outcome.",
    slotsLabel: "Scenarios (tap an outcome below, then tap a scenario to place it):",
    componentsLabel: "Outcomes:",
    testButtonLabel: "Check Matches",
    testingLabel: "Checking...",
    verdictCorrect: "✓ All matched correctly!",
    verdictIncorrect: "✕ Not quite right yet.",
    whatYouLearned:
      "Capacitance depends on geometry and dielectric, not on the circuit around it — but charge and voltage respond differently depending on whether the battery stays connected.",
    resultTopBarLabel: "Lab Complete",
    resultBadge: "CONCEPT MASTERED",
    playAnotherLabel: "Try Another Scenario",
  };

  const capacitorChallenges = [
    {
      title: "Series vs Parallel: What Changes?",
      difficulty: "medium",
      order_index: 1,
      payload: {
        theme: CAPACITOR_THEME,
        scenario: "Two identical capacitors are connected two different ways. Match each arrangement to what happens to the combined capacitance and charge.",
        slots: [
          { id: "s1", label: "Capacitors in series" },
          { id: "s2", label: "Capacitors in parallel" },
        ],
        components: [
          { id: "c1", label: "Combined capacitance is smaller than either one; same charge on each plate" },
          { id: "c2", label: "Combined capacitance is the sum of both; same voltage across each" },
          { id: "c3", label: "Combined capacitance is larger; same charge on each plate" },
          { id: "c4", label: "Combined capacitance is the sum of both; same charge on each" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "Series capacitors behave oppositely to series resistors — the combined value goes down, not up.",
      },
    },
    {
      title: "What Happens When You Charge a Capacitor?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        theme: CAPACITOR_THEME,
        scenario: "A capacitor is connected to a battery through a resistor. Match each stage to what's happening.",
        slots: [
          { id: "s1", label: "Moment the switch is closed" },
          { id: "s2", label: "A short time later, mid-charging" },
          { id: "s3", label: "Long after the switch was closed" },
        ],
        components: [
          { id: "c1", label: "Current is at its maximum; capacitor voltage is near zero" },
          { id: "c2", label: "Current has dropped; capacitor voltage is rising toward the battery's voltage" },
          { id: "c3", label: "Current has dropped to nearly zero; capacitor voltage matches the battery" },
          { id: "c4", label: "Current is zero; capacitor is fully discharged" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "As the capacitor fills up with charge, it pushes back harder against the battery, so current keeps dropping over time.",
      },
    },
    {
      title: "Effect of a Dielectric",
      difficulty: "hard",
      order_index: 3,
      payload: {
        theme: CAPACITOR_THEME,
        scenario: "A capacitor connected to a battery has a dielectric slab inserted between its plates while still connected. Match each quantity to what happens to it.",
        slots: [
          { id: "s1", label: "Capacitance" },
          { id: "s2", label: "Charge stored (battery still connected, so voltage stays fixed)" },
          { id: "s3", label: "Electric field between the plates" },
        ],
        components: [
          { id: "c1", label: "Increases — the dielectric raises capacitance" },
          { id: "c2", label: "Increases — more charge flows in since Q = CV and V is fixed" },
          { id: "c3", label: "Decreases — the dielectric weakens the field for the same charge" },
          { id: "c4", label: "Stays the same regardless of the dielectric" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "With the battery still connected, voltage can't change — so use Q = CV to reason about charge, and think about what a dielectric does to capacitance first.",
      },
    },
  ];

  for (const challenge of capacitorChallenges) {
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
      // Already seeded before the `theme` copy-override was added —
      // patch it in without touching anything else already stored.
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Content-expansion batch (Grades 11-12 thin-subject pass, closing the
// last gap from the original 12-file plan). Grade 12 Physics previously
// had two chapters: "Semiconductor Electronics" (seedPhysicsGrade12.js)
// and "Electrostatics" (seedPhysicsCapacitorCircuitGrade12.js +
// seedPhysicsCapacitanceSpeedChallenge.js). Adds a third, genuinely
// distinct NCERT Class 12 chapter — "Electromagnetic Induction and
// Alternating Current" — with three concepts.
//
// Reuses PHYSICS_CIRCUIT_BUILDER (no code changes) with a theme
// override, same established pattern as Grade 11's Gravitation batch
// and Grade 12's own Diode/Capacitor chapters. PHYSICS_MATCH was
// considered (it's literally "Magnetism Match") but ruled out for the
// same reason Gravitation ruled it out: PhysicsMatch.jsx hardcodes its
// on-screen copy ("Magnetism Match" / "Match Magnetic or Non-Magnetic")
// with no theme override, which would mislabel EMI/AC content. The AC
// concept (reactance/phase) was deliberately written as qualitative
// matching rather than numeric calculation, since none of the existing
// numeric Speed Challenge mechanics (Ohm's Law / Work-Energy-Power /
// Capacitance) have a theme override either — each hardcodes its own
// topic label ("Quick-Fire Circuit Math" etc.), so none of them fit an
// AC-reactance topic without a mismatched label.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Electromagnetic Induction and Alternating Current" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electricity and Magnetism",
      title: "Electromagnetic Induction and Alternating Current",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  const EMI_AC_THEME = {
    topBarLabel: "Induction Lab",
    badge: "PHYSICS · ELECTROMAGNETIC INDUCTION & AC",
    heading: "Match the Induction Scenario",
    intro: "Match each scenario to what actually happens — get every match right to complete the lab.",
    itemsNoun: "scenarios to match",
    objective: "Match each scenario to its correct outcome.",
    slotsLabel: "Scenarios (tap an outcome below, then tap a scenario to place it):",
    componentsLabel: "Outcomes:",
    testButtonLabel: "Check Matches",
    testingLabel: "Checking...",
    verdictCorrect: "✓ All matched correctly!",
    verdictIncorrect: "✕ Not quite right yet.",
    whatYouLearned:
      "A changing magnetic flux induces an EMF that opposes the change (Lenz's law), and in AC circuits, inductors and capacitors react differently to frequency, creating phase differences between voltage and current.",
    resultTopBarLabel: "Lab Complete",
    resultBadge: "CONCEPT MASTERED",
    playAnotherLabel: "Try Another Scenario",
  };

  // ---- Concept 1: Faraday's Law and Lenz's Law ----
  let faradayConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Faraday's Law and Lenz's Law" });
  if (!faradayConcept) {
    faradayConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Faraday's Law and Lenz's Law",
      explanation_text:
        "Whenever the magnetic flux through a circuit changes, an EMF is induced in it (Faraday's law) — and that induced current always flows in the direction that opposes the change causing it (Lenz's law), which is really just energy conservation in disguise. The size of the induced EMF depends on how FAST the flux changes, not on how much flux is present at any instant — a large, unchanging flux induces nothing.",
    });
    console.log("Created concept:", faradayConcept._id);
  } else {
    console.log("Using existing concept:", faradayConcept._id);
  }

  const faradayChallenges = [
    {
      title: "Which Way Does the Induced Current Flow?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        theme: EMI_AC_THEME,
        scenario: "A bar magnet is moved near a wire loop. Match each situation to what the induced current does.",
        slots: [
          { id: "s1", label: "Magnet's north pole moves toward the loop (flux into the loop increasing)" },
          { id: "s2", label: "Magnet's north pole moves away from the loop (flux into the loop decreasing)" },
          { id: "s3", label: "The magnet is held perfectly still near the loop" },
        ],
        components: [
          { id: "c1", label: "Induced current flows to oppose the increasing flux, creating its own opposing field" },
          { id: "c2", label: "Induced current flows to oppose the decreasing flux, trying to maintain it" },
          { id: "c3", label: "No EMF is induced — no current flows" },
          { id: "c4", label: "Induced current flows in whichever direction increases the flux fastest" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Lenz's law: induced current always opposes the CHANGE in flux, not the flux itself. No change means no induced current at all.",
      },
    },
    {
      title: "What Affects the Size of Induced EMF?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        theme: EMI_AC_THEME,
        scenario: "Match each change to what happens to the induced EMF (EMF = -N × rate of change of flux).",
        slots: [
          { id: "s1", label: "Moving the magnet toward the loop faster than before" },
          { id: "s2", label: "Using a coil with many turns instead of a single loop" },
          { id: "s3", label: "Holding the magnet at a fixed distance (no motion at all)" },
        ],
        components: [
          { id: "c1", label: "Induced EMF increases, since the flux is now changing faster" },
          { id: "c2", label: "Induced EMF increases, since each turn contributes its own EMF" },
          { id: "c3", label: "Induced EMF is zero, since the flux isn't changing" },
          { id: "c4", label: "Induced EMF stays exactly the same no matter how fast the magnet moves" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "EMF depends on the number of turns AND how fast the flux changes — not on how much flux is present at any one moment.",
      },
    },
    {
      title: "Eddy Currents and Damping",
      difficulty: "hard",
      order_index: 3,
      payload: {
        theme: EMI_AC_THEME,
        scenario: "Three plates swing into the same strong magnetic field region. Match each plate to what happens to its motion.",
        slots: [
          { id: "s1", label: "A solid metal plate swinging into the field" },
          { id: "s2", label: "A slotted (comb-shaped) metal plate swinging into the same field" },
          { id: "s3", label: "A non-conducting plastic plate swinging into the same field" },
        ],
        components: [
          { id: "c1", label: "Strong eddy currents form, creating a large opposing force that damps the motion quickly" },
          { id: "c2", label: "The slots break up the eddy current loops, so the damping force is much weaker" },
          { id: "c3", label: "No eddy currents can form at all — motion is undamped by this effect" },
          { id: "c4", label: "Eddy currents form but always assist the plate's motion instead of opposing it" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Eddy currents are induced loops that oppose motion through a field (Lenz's law) — slotting a conductor breaks up those loops, and a non-conductor can't carry any current at all.",
      },
    },
  ];

  for (const challenge of faradayChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_CIRCUIT_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_CIRCUIT_BUILDER",
        concept_id: faradayConcept._id,
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

  // ---- Concept 2: Self and Mutual Inductance ----
  let inductanceConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Self and Mutual Inductance" });
  if (!inductanceConcept) {
    inductanceConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Self and Mutual Inductance",
      explanation_text:
        "A changing current in a coil induces an opposing EMF in that same coil (self-inductance, L) — this is why current through an inductor can't change instantaneously. Mutual inductance (M) describes how a changing current in one coil induces an EMF in a nearby second coil — the working principle behind transformers, which only work on AC because they need a continuously changing current. Energy is stored in an inductor's magnetic field as (1/2)LI², similar to how a capacitor stores energy in its electric field.",
    });
    console.log("Created concept:", inductanceConcept._id);
  } else {
    console.log("Using existing concept:", inductanceConcept._id);
  }

  const inductanceChallenges = [
    {
      title: "Self-Inductance Opposes Change",
      difficulty: "easy",
      order_index: 1,
      payload: {
        theme: EMI_AC_THEME,
        scenario: "Match each situation in an inductor to what its self-induced EMF does.",
        slots: [
          { id: "s1", label: "Current through the inductor is increasing" },
          { id: "s2", label: "Current through the inductor is decreasing" },
          { id: "s3", label: "Current through the inductor is constant (steady state)" },
        ],
        components: [
          { id: "c1", label: "Self-induced EMF opposes the increase, acting like a 'back EMF'" },
          { id: "c2", label: "Self-induced EMF opposes the decrease, trying to keep the current flowing" },
          { id: "c3", label: "No self-induced EMF at all — nothing is changing" },
          { id: "c4", label: "Self-induced EMF always acts to increase the current further" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "An inductor always opposes CHANGE in current, in whichever direction that change happens — it never opposes steady, unchanging current.",
      },
    },
    {
      title: "Mutual Inductance and Transformers",
      difficulty: "medium",
      order_index: 2,
      payload: {
        theme: EMI_AC_THEME,
        scenario: "Match each situation with a primary and secondary coil to what happens in the secondary.",
        slots: [
          { id: "s1", label: "Current in the primary coil is changing" },
          { id: "s2", label: "Current in the primary coil is constant (steady DC)" },
          { id: "s3", label: "The two coils are moved further apart" },
        ],
        components: [
          { id: "c1", label: "An EMF is induced in the secondary coil (mutual induction)" },
          { id: "c2", label: "No EMF is induced in the secondary — there's no changing flux to link to it" },
          { id: "c3", label: "Mutual inductance decreases — weaker coupling means a weaker induced EMF for the same rate of change" },
          { id: "c4", label: "Mutual inductance stays exactly the same no matter the distance between the coils" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Mutual induction needs a CHANGING current in one coil to induce an EMF in the other — this is exactly why a transformer only works on AC, never on steady DC.",
      },
    },
    {
      title: "Energy Stored in an Inductor",
      difficulty: "hard",
      order_index: 3,
      payload: {
        theme: EMI_AC_THEME,
        scenario: "Match each change to what happens to the energy stored in an inductor (energy = (1/2) × L × I²).",
        slots: [
          { id: "s1", label: "Current through the inductor is increased from I to 2I" },
          { id: "s2", label: "An inductor with twice the inductance carries the same current I" },
          { id: "s3", label: "Current through the inductor drops to zero" },
        ],
        components: [
          { id: "c1", label: "Stored energy increases 4 times, since energy depends on the square of the current" },
          { id: "c2", label: "Stored energy doubles, since energy is directly proportional to inductance" },
          { id: "c3", label: "Stored energy drops to zero — no current means no stored magnetic energy" },
          { id: "c4", label: "Stored energy stays exactly the same in every case" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Energy stored in an inductor is (1/2)LI² — it scales directly with L, but with the SQUARE of the current.",
      },
    },
  ];

  for (const challenge of inductanceChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_CIRCUIT_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_CIRCUIT_BUILDER",
        concept_id: inductanceConcept._id,
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

  // ---- Concept 3: AC Circuits — Reactance and Phase Behavior ----
  let acConcept = await Concept.findOne({ chapter_id: chapter._id, title: "AC Circuits: Reactance and Phase Behavior" });
  if (!acConcept) {
    acConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "AC Circuits: Reactance and Phase Behavior",
      explanation_text:
        "In an AC circuit, an inductor's opposition to current (inductive reactance, X_L = ωL) grows with frequency, while a capacitor's opposition (capacitive reactance, X_C = 1/ωC) shrinks with frequency. In a purely resistive circuit, voltage and current stay in phase; across an inductor, current lags voltage by 90°; across a capacitor, current leads voltage by 90°. In a series LCR circuit, resonance occurs at the frequency where X_L exactly equals X_C, leaving only resistance to oppose the current — giving the sharpest current peak in the circuit.",
    });
    console.log("Created concept:", acConcept._id);
  } else {
    console.log("Using existing concept:", acConcept._id);
  }

  const acChallenges = [
    {
      title: "How Reactance Changes with Frequency",
      difficulty: "easy",
      order_index: 1,
      payload: {
        theme: EMI_AC_THEME,
        scenario: "Match each change in AC supply frequency to what happens to the two kinds of reactance.",
        slots: [
          { id: "s1", label: "Frequency of the AC supply is increased" },
          { id: "s2", label: "Frequency of the AC supply is decreased" },
          { id: "s3", label: "The supply is DC (frequency = 0)" },
        ],
        components: [
          { id: "c1", label: "Inductive reactance increases, capacitive reactance decreases" },
          { id: "c2", label: "Inductive reactance decreases, capacitive reactance increases" },
          { id: "c3", label: "Capacitive reactance becomes infinite (blocks DC completely); inductive reactance becomes zero (acts like plain wire)" },
          { id: "c4", label: "Both reactances stay exactly the same regardless of frequency" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "X_L = ωL grows with frequency; X_C = 1/ωC shrinks with frequency. At zero frequency (DC), a capacitor is an open circuit and an inductor is just a plain wire.",
      },
    },
    {
      title: "Voltage-Current Phase Relationships",
      difficulty: "medium",
      order_index: 2,
      payload: {
        theme: EMI_AC_THEME,
        scenario: "Match each type of purely single-element AC circuit to its voltage-current phase relationship.",
        slots: [
          { id: "s1", label: "A purely resistive AC circuit" },
          { id: "s2", label: "A purely inductive AC circuit" },
          { id: "s3", label: "A purely capacitive AC circuit" },
        ],
        components: [
          { id: "c1", label: "Voltage and current are exactly in phase" },
          { id: "c2", label: "Current lags voltage by 90°" },
          { id: "c3", label: "Current leads voltage by 90°" },
          { id: "c4", label: "Voltage and current are always exactly opposite in phase (180° apart)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A memory trick: in an inductor (L), voltage leads current; in a capacitor (C), current leads voltage.",
      },
    },
    {
      title: "Resonance in a Series LCR Circuit",
      difficulty: "hard",
      order_index: 3,
      payload: {
        theme: EMI_AC_THEME,
        scenario: "Match each frequency condition in a series LCR circuit to what happens to its impedance and current.",
        slots: [
          { id: "s1", label: "Frequency is exactly at the resonant frequency (X_L = X_C)" },
          { id: "s2", label: "Frequency is below the resonant frequency" },
          { id: "s3", label: "Frequency is above the resonant frequency" },
        ],
        components: [
          { id: "c1", label: "Impedance is at its minimum (equal to just R), and current is at its maximum" },
          { id: "c2", label: "Capacitive reactance dominates — the circuit behaves more like a capacitive circuit overall" },
          { id: "c3", label: "Inductive reactance dominates — the circuit behaves more like an inductive circuit overall" },
          { id: "c4", label: "Impedance is always at its maximum value regardless of frequency" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "At resonance, X_L and X_C cancel exactly, leaving only resistance R to oppose current — this gives the sharpest current peak anywhere in the circuit's response.",
      },
    },
  ];

  for (const challenge of acChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_CIRCUIT_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_CIRCUIT_BUILDER",
        concept_id: acConcept._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

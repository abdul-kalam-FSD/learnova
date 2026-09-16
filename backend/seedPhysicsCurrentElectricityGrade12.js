require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 12 Physics currently has
// "Semiconductor Electronics" (order_index 1), "Electrostatics"
// (order_index 1, via seedPhysicsCapacitorCircuitGrade12.js) and
// "Electromagnetic Induction and Alternating Current" (order_index 2).
// This adds a genuine third/new NCERT Class 12 Physics chapter, "Current
// Electricity" — resistivity, EMF/internal resistance, and electrical
// power — none of which the platform has covered before at any grade.
//
// PHYSICS_OHMS_LAW_SPEED_CHALLENGE was previously only seeded at Grade
// 10 (seedPhysicsOhmsLawGrade10.js, plain V = I x R and series/parallel
// resistor totals). This reuses the exact same mechanic/scoring
// (MULTI_QUESTION_GAME_TYPES + checkMultiQuestionAttempt, no new backend
// code) for genuinely Grade-12-level quantities the Grade 10 version
// never covered: resistivity (R = \u03c1L/A), EMF and internal resistance
// (V = E \u2212 Ir), and electrical power (P = VI = I\u00b2R).
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Current Electricity" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Electricity and Magnetism",
      title: "Current Electricity",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Resistivity, Length and Area of Cross-Section ----
  let resistivityConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Resistivity, Length and Area of Cross-Section" });
  if (!resistivityConcept) {
    resistivityConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Resistivity, Length and Area of Cross-Section",
      explanation_text:
        "The resistance of a wire depends on the material it's made of (its resistivity, \u03c1) as well as its shape: R = \u03c1L/A, where L is the length and A is the cross-sectional area. A longer wire has more resistance; a thicker wire has less.",
    });
    console.log("Created concept:", resistivityConcept._id);
  } else {
    console.log("Using existing concept:", resistivityConcept._id);
  }

  const resistivityRounds = [
    {
      title: "Speed Round: Basic Resistivity Calculations",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 15,
        hint: "R = \u03c1L / A. Keep the units consistent before multiplying.",
        questions: [
          { id: "q1", prompt: "A wire has resistivity 2 \u03a9m, length 5 m and area 1 m\u00b2. Find its resistance.", unit: "\u03a9", correct_answer: 10 },
          { id: "q2", prompt: "A wire has resistivity 3 \u03a9m, length 4 m and area 2 m\u00b2. Find its resistance.", unit: "\u03a9", correct_answer: 6 },
          { id: "q3", prompt: "A wire has resistivity 4 \u03a9m, length 6 m and area 2 m\u00b2. Find its resistance.", unit: "\u03a9", correct_answer: 12 },
          { id: "q4", prompt: "A wire has resistivity 1 \u03a9m, length 10 m and area 5 m\u00b2. Find its resistance.", unit: "\u03a9", correct_answer: 2 },
        ],
      },
    },
    {
      title: "Speed Round: Doubling Length or Area",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 15,
        hint: "Doubling the length doubles R. Doubling the area halves R.",
        questions: [
          { id: "q1", prompt: "A wire has resistance 8 \u03a9. If its length is doubled (area unchanged), find the new resistance.", unit: "\u03a9", correct_answer: 16 },
          { id: "q2", prompt: "A wire has resistance 12 \u03a9. If its cross-sectional area is doubled (length unchanged), find the new resistance.", unit: "\u03a9", correct_answer: 6 },
          { id: "q3", prompt: "A wire has resistance 20 \u03a9. If its length is halved (area unchanged), find the new resistance.", unit: "\u03a9", correct_answer: 10 },
          { id: "q4", prompt: "A wire has resistance 5 \u03a9. If its area is halved (length unchanged), find the new resistance.", unit: "\u03a9", correct_answer: 10 },
        ],
      },
    },
    {
      title: "Speed Round: Comparing Two Wires",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 18,
        hint: "Compute R = \u03c1L / A for each wire separately, then compare or add as asked.",
        questions: [
          { id: "q1", prompt: "Wire A: \u03c1 = 2 \u03a9m, L = 3 m, A = 1 m\u00b2. Find its resistance.", unit: "\u03a9", correct_answer: 6 },
          { id: "q2", prompt: "Wire B: \u03c1 = 2 \u03a9m, L = 6 m, A = 2 m\u00b2. Find its resistance.", unit: "\u03a9", correct_answer: 6 },
          { id: "q3", prompt: "Wire C: \u03c1 = 5 \u03a9m, L = 4 m, A = 2 m\u00b2. Find its resistance.", unit: "\u03a9", correct_answer: 10 },
          { id: "q4", prompt: "Two wires like Wire C are connected end to end (length doubles, area unchanged). Find the combined resistance.", unit: "\u03a9", correct_answer: 20 },
        ],
      },
    },
  ];

  for (const round of resistivityRounds) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE",
        concept_id: resistivityConcept._id,
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

  // ---- Concept 2: EMF, Internal Resistance and Terminal Voltage ----
  let emfConcept = await Concept.findOne({ chapter_id: chapter._id, title: "EMF, Internal Resistance and Terminal Voltage" });
  if (!emfConcept) {
    emfConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "EMF, Internal Resistance and Terminal Voltage",
      explanation_text:
        "A real battery has EMF (E) but also internal resistance (r), so the voltage it actually delivers to a circuit — the terminal voltage — is less than E once current flows: V = E \u2212 Ir. The larger the current drawn or the internal resistance, the bigger the drop between EMF and terminal voltage.",
    });
    console.log("Created concept:", emfConcept._id);
  } else {
    console.log("Using existing concept:", emfConcept._id);
  }

  const emfRounds = [
    {
      title: "Speed Round: Finding Terminal Voltage",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 15,
        hint: "Terminal voltage V = E \u2212 Ir.",
        questions: [
          { id: "q1", prompt: "A battery has EMF 10 V and internal resistance 1 \u03a9. It delivers a current of 2 A. Find the terminal voltage.", unit: "V", correct_answer: 8 },
          { id: "q2", prompt: "A battery has EMF 12 V and internal resistance 2 \u03a9. It delivers a current of 3 A. Find the terminal voltage.", unit: "V", correct_answer: 6 },
          { id: "q3", prompt: "A battery has EMF 6 V and internal resistance 0.5 \u03a9. It delivers a current of 4 A. Find the terminal voltage.", unit: "V", correct_answer: 4 },
          { id: "q4", prompt: "A battery has EMF 20 V and internal resistance 1 \u03a9. It delivers a current of 5 A. Find the terminal voltage.", unit: "V", correct_answer: 15 },
        ],
      },
    },
    {
      title: "Speed Round: Finding Internal Resistance",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 18,
        hint: "Rearrange V = E \u2212 Ir to get r = (E \u2212 V) / I.",
        questions: [
          { id: "q1", prompt: "A battery has EMF 10 V. Its terminal voltage drops to 8 V while delivering 2 A. Find the internal resistance.", unit: "\u03a9", correct_answer: 1 },
          { id: "q2", prompt: "A battery has EMF 15 V. Its terminal voltage drops to 9 V while delivering 3 A. Find the internal resistance.", unit: "\u03a9", correct_answer: 2 },
          { id: "q3", prompt: "A battery has EMF 9 V. Its terminal voltage drops to 6 V while delivering 3 A. Find the internal resistance.", unit: "\u03a9", correct_answer: 1 },
          { id: "q4", prompt: "A battery has EMF 24 V. Its terminal voltage drops to 20 V while delivering 4 A. Find the internal resistance.", unit: "\u03a9", correct_answer: 1 },
        ],
      },
    },
    {
      title: "Speed Round: Short-Circuit Current",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 18,
        hint: "On a dead short, terminal voltage is 0, so all of E drops across r: E = I x r, meaning I = E / r.",
        questions: [
          { id: "q1", prompt: "A battery has EMF 6 V and internal resistance 2 \u03a9. Find the maximum (short-circuit) current it can deliver.", unit: "A", correct_answer: 3 },
          { id: "q2", prompt: "A battery has EMF 12 V and internal resistance 3 \u03a9. Find the maximum (short-circuit) current it can deliver.", unit: "A", correct_answer: 4 },
          { id: "q3", prompt: "A battery has EMF 20 V and internal resistance 4 \u03a9. Find the maximum (short-circuit) current it can deliver.", unit: "A", correct_answer: 5 },
          { id: "q4", prompt: "A battery has EMF 9 V and internal resistance 1 \u03a9. Find the maximum (short-circuit) current it can deliver.", unit: "A", correct_answer: 9 },
        ],
      },
    },
  ];

  for (const round of emfRounds) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE",
        concept_id: emfConcept._id,
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

  // ---- Concept 3: Electrical Power and Energy in Circuits ----
  let powerConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Electrical Power and Energy in Circuits" });
  if (!powerConcept) {
    powerConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Electrical Power and Energy in Circuits",
      explanation_text:
        "Electrical power delivered to (or dissipated by) a component can be found three equivalent ways: P = VI, P = I\u00b2R, or P = V\u00b2/R. Which form is quickest depends on which two quantities you already know.",
    });
    console.log("Created concept:", powerConcept._id);
  } else {
    console.log("Using existing concept:", powerConcept._id);
  }

  const powerRounds = [
    {
      title: "Speed Round: Power from Voltage and Current",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 12,
        hint: "P = V x I",
        questions: [
          { id: "q1", prompt: "A device runs on 10 V and draws 2 A. Find the power consumed.", unit: "W", correct_answer: 20 },
          { id: "q2", prompt: "A device runs on 12 V and draws 5 A. Find the power consumed.", unit: "W", correct_answer: 60 },
          { id: "q3", prompt: "A device runs on 6 V and draws 4 A. Find the power consumed.", unit: "W", correct_answer: 24 },
          { id: "q4", prompt: "A device runs on 20 V and draws 3 A. Find the power consumed.", unit: "W", correct_answer: 60 },
        ],
      },
    },
    {
      title: "Speed Round: Power from Current and Resistance",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 15,
        hint: "P = I\u00b2R \u2014 square the current first, then multiply by resistance.",
        questions: [
          { id: "q1", prompt: "A 5 \u03a9 resistor carries a current of 2 A. Find the power dissipated.", unit: "W", correct_answer: 20 },
          { id: "q2", prompt: "A 3 \u03a9 resistor carries a current of 4 A. Find the power dissipated.", unit: "W", correct_answer: 48 },
          { id: "q3", prompt: "A 10 \u03a9 resistor carries a current of 3 A. Find the power dissipated.", unit: "W", correct_answer: 90 },
          { id: "q4", prompt: "A 2 \u03a9 resistor carries a current of 5 A. Find the power dissipated.", unit: "W", correct_answer: 50 },
        ],
      },
    },
    {
      title: "Speed Round: Power from Voltage and Resistance",
      difficulty: "hard",
      order_index: 3,
      payload: {
        time_limit_seconds: 18,
        hint: "P = V\u00b2 / R \u2014 square the voltage first, then divide by resistance.",
        questions: [
          { id: "q1", prompt: "A 4 \u03a9 resistor has 8 V across it. Find the power dissipated.", unit: "W", correct_answer: 16 },
          { id: "q2", prompt: "A 2 \u03a9 resistor has 10 V across it. Find the power dissipated.", unit: "W", correct_answer: 50 },
          { id: "q3", prompt: "A 5 \u03a9 resistor has 10 V across it. Find the power dissipated.", unit: "W", correct_answer: 20 },
          { id: "q4", prompt: "A 9 \u03a9 resistor has 18 V across it. Find the power dissipated.", unit: "W", correct_answer: 36 },
        ],
      },
    },
  ];

  for (const round of powerRounds) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE", title: round.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE",
        concept_id: powerConcept._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

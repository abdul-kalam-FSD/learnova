require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 4 (content expansion only). Grade 11 Physics currently has
// "Work, Energy and Power" (order_index 1) and "Gravitation" (order_index
// 2) — see seedPhysicsGrade11b.js / seedPhysicsGrade11Batch2.js. This adds
// a genuine third NCERT Class 11 Physics chapter, "Laws of Motion"
// (momentum form of Newton's Second Law, friction, circular dynamics),
// distinct from Grade 9's more basic "How Forces Affect Motion" chapter
// (balanced/unbalanced forces, qualitative Newton's laws via PHYSICS_MATCH
// + PHYSICS_FORCE_SIMULATOR's own first use — see seedPhysicsForceSimulatorGrade9.js).
//
// Reuses PHYSICS_FORCE_SIMULATOR as-is: same force_n/mass_kg slider
// exploration ending in a numeric acceleration prediction, checked by
// gameControllers.js's shared "MATH_NUMBER_MACHINE || PHYSICS_FORCE_SIMULATOR"
// strict-equality branch. No new backend logic. Concept titles/wording are
// deliberately different from the Grade 9 concept so mastery tracking and
// the duplicate-title audit both treat this as new, grade-11-appropriate
// content (momentum, friction, circular motion) rather than a rehash.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /physics/i });
  if (!subject) {
    subject = await Subject.create({ name: "Physics", grade: 11 });
    console.log("Created new Grade 11 Physics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Laws of Motion" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Mechanics",
      title: "Laws of Motion",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---- Concept 1: Second Law via Rate of Change of Momentum ----
  let momentumConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Second Law via Rate of Change of Momentum" });
  if (!momentumConcept) {
    momentumConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Second Law via Rate of Change of Momentum",
      explanation_text:
        "Newton's Second Law, in its full form, says force equals the rate of change of momentum: F = dp/dt. For an object of constant mass, this reduces to the familiar F = ma. A larger net force produces a larger acceleration for the same mass, and the same force produces less acceleration on a larger mass.",
    });
    console.log("Created concept:", momentumConcept._id);
  } else {
    console.log("Using existing concept:", momentumConcept._id);
  }

  const momentumChallenges = [
    {
      title: "Predict: Ball Struck by a Bat",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_text: "A cricket ball of mass 2 kg (game-scaled) is struck with a net force of 8 N.",
        force_n: 8,
        mass_kg: 2,
        explore_min_force: 1,
        explore_max_force: 12,
        explore_min_mass: 1,
        explore_max_mass: 10,
        correct_answer: 4,
        unit: "m/s\u00b2",
        hint: "acceleration = Force \u00f7 Mass",
      },
    },
    {
      title: "Predict: Loaded Trolley on a Ramp",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_text: "A trolley of mass 6 kg experiences a net force of 18 N along a ramp.",
        force_n: 18,
        mass_kg: 6,
        explore_min_force: 1,
        explore_max_force: 25,
        explore_min_mass: 1,
        explore_max_mass: 15,
        correct_answer: 3,
        unit: "m/s\u00b2",
        hint: "acceleration = Force \u00f7 Mass",
      },
    },
    {
      title: "Predict: Rocket Sled Test",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_text: "A test sled of mass 50 kg is driven by a net thrust of 400 N.",
        force_n: 400,
        mass_kg: 50,
        explore_min_force: 50,
        explore_max_force: 500,
        explore_min_mass: 10,
        explore_max_mass: 100,
        correct_answer: 8,
        unit: "m/s\u00b2",
        hint: "acceleration = Force \u00f7 Mass",
      },
    },
  ];

  for (const challenge of momentumChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_FORCE_SIMULATOR", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_FORCE_SIMULATOR",
        concept_id: momentumConcept._id,
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

  // ---- Concept 2: Motion With Friction Opposing the Applied Force ----
  let frictionConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Motion With Friction Opposing the Applied Force" });
  if (!frictionConcept) {
    frictionConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Motion With Friction Opposing the Applied Force",
      explanation_text:
        "When an object moves against friction, the NET force driving its acceleration is the applied force minus the opposing frictional force — not the applied force alone. Once that net force is known, the same F = ma relationship gives the resulting acceleration.",
    });
    console.log("Created concept:", frictionConcept._id);
  } else {
    console.log("Using existing concept:", frictionConcept._id);
  }

  const frictionChallenges = [
    {
      title: "Predict: Crate Dragged Across a Floor",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_text: "A 4 kg crate is pushed with 20 N of applied force; friction opposes it with 4 N, leaving a net force of 16 N.",
        force_n: 16,
        mass_kg: 4,
        explore_min_force: 1,
        explore_max_force: 25,
        explore_min_mass: 1,
        explore_max_mass: 12,
        correct_answer: 4,
        unit: "m/s\u00b2",
        hint: "Net force = applied force \u2212 friction. Then acceleration = Net force \u00f7 Mass.",
      },
    },
    {
      title: "Predict: Suitcase on a Rough Floor",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_text: "A 5 kg suitcase is pulled with 30 N of applied force; friction opposes it with 10 N, leaving a net force of 20 N.",
        force_n: 20,
        mass_kg: 5,
        explore_min_force: 1,
        explore_max_force: 35,
        explore_min_mass: 1,
        explore_max_mass: 15,
        correct_answer: 4,
        unit: "m/s\u00b2",
        hint: "Net force = applied force \u2212 friction. Then acceleration = Net force \u00f7 Mass.",
      },
    },
    {
      title: "Predict: Heavy Box on a Loading Dock",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_text: "A 10 kg box is pushed with 90 N of applied force; friction opposes it with 30 N, leaving a net force of 60 N.",
        force_n: 60,
        mass_kg: 10,
        explore_min_force: 10,
        explore_max_force: 100,
        explore_min_mass: 1,
        explore_max_mass: 20,
        correct_answer: 6,
        unit: "m/s\u00b2",
        hint: "Net force = applied force \u2212 friction. Then acceleration = Net force \u00f7 Mass.",
      },
    },
  ];

  for (const challenge of frictionChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_FORCE_SIMULATOR", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_FORCE_SIMULATOR",
        concept_id: frictionConcept._id,
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

  // ---- Concept 3: Circular Motion and Centripetal Force ----
  let circularConcept = await Concept.findOne({ chapter_id: chapter._id, title: "Circular Motion and Centripetal Force" });
  if (!circularConcept) {
    circularConcept = await Concept.create({
      chapter_id: chapter._id,
      title: "Circular Motion and Centripetal Force",
      explanation_text:
        "An object moving in a circle at constant speed is still accelerating, because its direction keeps changing. This centripetal acceleration always points toward the center of the circle and is produced by a centripetal force. The same F = ma relationship applies: the required centripetal force divided by the object's mass gives the centripetal acceleration.",
    });
    console.log("Created concept:", circularConcept._id);
  } else {
    console.log("Using existing concept:", circularConcept._id);
  }

  const circularChallenges = [
    {
      title: "Predict: Car Rounding a Banked Curve",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_text: "A 3 kg model car on a test track needs a centripetal force of 12 N to stay on a curve.",
        force_n: 12,
        mass_kg: 3,
        explore_min_force: 1,
        explore_max_force: 20,
        explore_min_mass: 1,
        explore_max_mass: 10,
        correct_answer: 4,
        unit: "m/s\u00b2",
        hint: "Centripetal acceleration = Centripetal force \u00f7 Mass.",
      },
    },
    {
      title: "Predict: Stone Whirled on a String",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_text: "A 2 kg stone is whirled in a horizontal circle by a string providing 18 N of tension as centripetal force.",
        force_n: 18,
        mass_kg: 2,
        explore_min_force: 1,
        explore_max_force: 25,
        explore_min_mass: 1,
        explore_max_mass: 10,
        correct_answer: 9,
        unit: "m/s\u00b2",
        hint: "Centripetal acceleration = Centripetal force \u00f7 Mass.",
      },
    },
    {
      title: "Predict: Satellite in Low Circular Orbit",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_text: "A 20 kg satellite model requires 100 N of centripetal force to hold its circular path in the simulation.",
        force_n: 100,
        mass_kg: 20,
        explore_min_force: 10,
        explore_max_force: 150,
        explore_min_mass: 5,
        explore_max_mass: 40,
        correct_answer: 5,
        unit: "m/s\u00b2",
        hint: "Centripetal acceleration = Centripetal force \u00f7 Mass.",
      },
    },
  ];

  for (const challenge of circularChallenges) {
    const exists = await GameContent.findOne({ game_type: "PHYSICS_FORCE_SIMULATOR", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_FORCE_SIMULATOR",
        concept_id: circularConcept._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

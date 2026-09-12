require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Adds Force & Motion Simulator (PHYSICS_FORCE_SIMULATOR) content to
// the SAME Grade 9 "How Forces Affect Motion" chapter that
// seedPhysicsGrade9b.js already seeds with PHYSICS_MATCH — this is a
// second, deeper mechanic for the same chapter, not a new chapter,
// same as how Grade 6 has both Circuit Builder (Electric Circuits)
// and Magnetism Match (Exploring Magnets) as siblings.
//
// PHYSICS_MATCH already covers qualitative Newton's-law recognition
// (which law does this scenario illustrate). This adds the
// quantitative side that was missing platform-wide for Physics: F =
// ma, explored via parameter sliders + a prediction, instead of
// another Match/Builder — see gameTypeRegistry.js and checkAttempt's
// PHYSICS_FORCE_SIMULATOR branch (reuses MATH_NUMBER_MACHINE's plain
// numeric-equality check).
//
// New Concept (not reusing the existing "Balanced Forces..." concept)
// since this is specifically Newton's Second Law in numeric form —
// keeps mastery tracking granular per NCERT sub-topic like the rest
// of this chapter's siblings already do.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 9, name: /science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 9 });
    console.log("Created new Grade 9 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "How Forces Affect Motion" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Physics",
      title: "How Forces Affect Motion",
      order_index: 1,
      strand: "Physics",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Newton's Second Law: Force, Mass and Acceleration",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Newton's Second Law: Force, Mass and Acceleration",
      explanation_text:
        "Newton's Second Law says the acceleration produced by a net force is directly proportional to the force and inversely proportional to the object's mass: acceleration = Force / Mass (a = F/m). Push a cart harder and it speeds up faster; load more mass onto it and the same push speeds it up less.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // Every force_n / mass_kg pair below divides evenly, same "clean
  // whole-number answer" spirit as MATH_NUMBER_MACHINE's equations,
  // so the student is checking real F=ma arithmetic, not fighting
  // decimal rounding.
  const scenarios = [
    {
      title: "Predict: Trolley Push",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_text: "A shopping trolley of mass 2 kg is pushed with a steady force of 6 N across a smooth floor.",
        force_n: 6,
        mass_kg: 2,
        explore_min_force: 1,
        explore_max_force: 10,
        explore_min_mass: 1,
        explore_max_mass: 10,
        correct_answer: 3,
        unit: "m/s\u00b2",
        hint: "acceleration = Force \u00f7 Mass",
      },
    },
    {
      title: "Predict: Loaded Cart",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_text: "A delivery cart of mass 4 kg is pushed with a force of 20 N.",
        force_n: 20,
        mass_kg: 4,
        explore_min_force: 1,
        explore_max_force: 20,
        explore_min_mass: 1,
        explore_max_mass: 10,
        correct_answer: 5,
        unit: "m/s\u00b2",
        hint: "The same rule applies even with bigger numbers: acceleration = Force \u00f7 Mass",
      },
    },
    {
      title: "Predict: Heavy Crate",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_text: "A heavy crate of mass 6 kg is pulled with a force of 24 N across a warehouse floor.",
        force_n: 24,
        mass_kg: 6,
        explore_min_force: 1,
        explore_max_force: 30,
        explore_min_mass: 1,
        explore_max_mass: 15,
        correct_answer: 4,
        unit: "m/s\u00b2",
        hint: "Divide the force by the mass, same as before — bigger numbers, same rule.",
      },
    },
  ];

  for (const scenario of scenarios) {
    const exists = await GameContent.findOne({
      game_type: "PHYSICS_FORCE_SIMULATOR",
      title: scenario.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_FORCE_SIMULATOR",
        concept_id: concept._id,
        title: scenario.title,
        difficulty: scenario.difficulty,
        order_index: scenario.order_index,
        payload: scenario.payload,
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

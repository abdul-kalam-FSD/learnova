require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the actual Grade 11 Physics hole. Grade 11 previously had
// Biology (7 batch files, fully seeded — see seedGrade11.js through
// seedGrade11_batch7.js) and Chemistry (via seedChemistryGrade11.js),
// but no Physics at all. The file named seedPhysicsGrade11.js is
// mislabeled the same way the old seedPhysicsGrade9.js was — its
// Subject.findOne/create calls actually target { grade: 12,
// name: /physics/i }, so it seeds Grade 12 content ("Electrostatics"),
// not Grade 11.
//
// Grounded in the current NCERT Class 11 Physics textbook (Physics
// Part I, unchanged core mechanics sequence for the 2026-27 CBSE
// session), Chapter 5 "Work, Energy and Power" — a real Grade 11
// chapter distinct from the Grade 12 electrostatics/semiconductor
// content already seeded, and from Grade 9's more basic "How Forces
// Affect Motion" chapter (balanced/unbalanced forces, Newton's three
// laws) already seeded at that level.
//
// Standalone "Physics" Subject at Grade 11 — matches the pattern
// already used for Grade 11 Biology/Chemistry and Grade 12 Physics,
// consistent with the master prompt's Grade 11-12 elective/stream
// architecture (Physics is a separate top-level Subject at this
// level, unlike Grades 4-10 where it's a strand inside "Science").
//
// Reuses PHYSICS_MATCH (same slot/component mapping-equality check
// as the Grade 6 "Magnetic or Non-Magnetic" and Grade 9 "How Forces
// Affect Motion" versions), applied to classifying energy-transfer
// scenarios instead of magnetism or force type.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Work, Energy and Power" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Mechanics",
      title: "Work, Energy and Power",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Kinetic Energy, Potential Energy, and the Work-Energy Theorem" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Kinetic Energy, Potential Energy, and the Work-Energy Theorem",
      explanation_text:
        "Work is done on an object when a force moves it through a distance, and that work changes the object's energy. Kinetic energy depends on motion (speed), potential energy depends on position (like height in a gravitational field), and the work-energy theorem ties them together: the net work done on an object equals its change in kinetic energy.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same slot/component mapping-equality check as
  // PHYSICS_MATCH elsewhere — student matches each scenario (slot) to
  // the energy concept it illustrates (component).
  const energyMatchChallenges = [
    {
      title: "Match: Kinetic or Potential Energy",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each situation to the type of energy the object mainly has at that moment.",
        slots: [
          { id: "s1", label: "A ball held stationary at the top of a cliff" },
          { id: "s2", label: "A car speeding down a highway" },
          { id: "s3", label: "A stretched bow, held ready to fire" },
        ],
        components: [
          { id: "c1", label: "Gravitational Potential Energy" },
          { id: "c2", label: "Kinetic Energy" },
          { id: "c3", label: "Elastic Potential Energy" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ask whether the energy comes from motion, from height, or from being stretched/compressed.",
      },
    },
    {
      title: "Match: Scenario to the Work-Energy Theorem",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each scenario to what the work-energy theorem predicts will happen.",
        slots: [
          { id: "s1", label: "A net force acts on a moving object in the same direction it's moving" },
          { id: "s2", label: "A net force acts on a moving object in the opposite direction to its motion" },
          { id: "s3", label: "The forces on a moving object are perfectly balanced (zero net force)" },
        ],
        components: [
          { id: "c1", label: "Kinetic energy increases" },
          { id: "c2", label: "Kinetic energy decreases" },
          { id: "c3", label: "Kinetic energy stays the same" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Positive work done on an object increases its kinetic energy; negative work decreases it; zero net work leaves it unchanged.",
      },
    },
    {
      title: "Match: Energy Concept to Real-World Machine",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "Match each real-world example to the energy or power concept it demonstrates — extra options are listed to test your reasoning.",
        slots: [
          { id: "s1", label: "A crane that lifts the same load twice as fast uses twice the power to do it" },
          { id: "s2", label: "A pendulum swings back and forth, trading height for speed and back again" },
          { id: "s3", label: "A roller coaster car released from rest at the top reaches its fastest point at the bottom of the first hill" },
        ],
        components: [
          { id: "c1", label: "Power = Work Done / Time Taken" },
          { id: "c2", label: "Conservation of Mechanical Energy" },
          { id: "c3", label: "Work-Energy Theorem — all potential energy converts to kinetic energy" },
          { id: "c4", label: "Energy is being created by the machine" },
          { id: "c5", label: "The object's mass is changing during motion" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "c4 and c5 describe things that don't actually happen in these examples — energy is conserved and mass stays constant throughout.",
      },
    },
  ];

  for (const challenge of energyMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "PHYSICS_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "PHYSICS_MATCH",
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

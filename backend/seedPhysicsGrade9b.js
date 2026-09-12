require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the actual Grade 9 Physics hole in the integrated Science
// subject. The existing seedPhysicsGrade9.js is mislabeled — despite
// its filename, its Subject.findOne/create calls target { grade: 10,
// name: "Science" }, so it seeds Grade 10 content, not Grade 9.
// Grade 9 itself had Biology (Cell Biology, Diversity, via
// seedGrade9.js/seedGrade9_batch2.js) and Chemistry (via
// seedChemistryGrade9.js/seedChemistryMoleculeBuilder.js), but no
// Physics.
//
// Grounded in the current NCERT Class 9 Science textbook,
// "Exploration" (NCF-SE 2023, 2026-27 session, replacing the older
// combined Class 9 Science book) — confirmed 13-chapter list, Ch.6
// "How Forces Affect Motion", covering balanced vs. unbalanced
// forces, friction, and Newton's three laws of motion.
//
// Gap 1 fix: Physics is not a separate top-level Subject below Grade
// 11 — it lives inside the integrated "Science" subject, with
// chapters tagged strand: "Physics" for mastery/analytics.
//
// Reuses PHYSICS_MATCH (same slot/component mapping-equality check as
// the Grade 6 "Magnetic or Non-Magnetic" version), applied to
// classifying force scenarios by which of Newton's laws or force
// concepts they illustrate, instead of magnetism.
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

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Balanced Forces, Unbalanced Forces, and Newton's Laws" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Balanced Forces, Unbalanced Forces, and Newton's Laws",
      explanation_text:
        "When forces on an object are balanced, its motion doesn't change; when they're unbalanced, the object speeds up, slows down, or changes direction. Newton's three laws describe this precisely: an object keeps its state of motion unless a net force acts on it, a net force produces acceleration in proportion to the object's mass, and every force has an equal and opposite reaction force.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same slot/component mapping-equality check as
  // PHYSICS_MATCH elsewhere — student matches each scenario (slot) to
  // the force concept it illustrates (component).
  const forceMatchChallenges = [
    {
      title: "Match: Balanced or Unbalanced Force",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each situation to whether the forces on the object are balanced or unbalanced.",
        slots: [
          { id: "s1", label: "A book resting still on a table" },
          { id: "s2", label: "A ball rolling faster down a slope" },
          { id: "s3", label: "A car moving at a constant speed on a flat road" },
        ],
        components: [
          { id: "c1", label: "Balanced Forces" },
          { id: "c2", label: "Unbalanced Forces" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1" },
        hint: "If the speed or direction is changing, the forces can't be balanced.",
      },
    },
    {
      title: "Match: Scenario to Newton's Law",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each everyday scenario to the Newton's law of motion it best illustrates.",
        slots: [
          { id: "s1", label: "Passengers jerk forward when a bus suddenly stops" },
          { id: "s2", label: "A heavier trolley needs a bigger push to reach the same speed as a lighter one" },
          { id: "s3", label: "A swimmer pushes water backward to move forward" },
        ],
        components: [
          { id: "c1", label: "First Law (Inertia)" },
          { id: "c2", label: "Second Law (Force = Mass x Acceleration)" },
          { id: "c3", label: "Third Law (Action-Reaction)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ask what's really happening: is it about resisting a change in motion, about how much force is needed for a given mass, or about a paired force pushing back?",
      },
    },
    {
      title: "Match: Force Concept to Real-World Example",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "Match each real-world example to the force concept it demonstrates — extra options are listed to test your reasoning.",
        slots: [
          { id: "s1", label: "A rocket launches upward as burning gases shoot downward" },
          { id: "s2", label: "It's harder to push a loaded trolley than an empty one to the same speed" },
          { id: "s3", label: "A hockey puck keeps sliding on ice long after being hit" },
        ],
        components: [
          { id: "c1", label: "Newton's Third Law — action and reaction forces" },
          { id: "c2", label: "Newton's Second Law — force needed depends on mass" },
          { id: "c3", label: "Newton's First Law — inertia keeps it moving with little friction" },
          { id: "c4", label: "Balanced Forces — nothing is accelerating here" },
          { id: "c5", label: "Gravity acting alone, with no other force involved" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "c4 and c5 describe situations that aren't actually happening in these examples — match each one to what's truly causing the motion described.",
      },
    },
  ];

  for (const challenge of forceMatchChallenges) {
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

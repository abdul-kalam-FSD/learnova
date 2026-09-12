require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Second mechanic for the "Simple Equations" topic (Section 18: multiple
// mechanics per topic — Equation Builder already covers reading/writing
// equation syntax; this one covers actually solving for the unknown).
// Reuses the existing Grade 6 Mathematics subject + Simple Equations
// chapter from seedMathEquationBuilder.js, but its own concept, since
// "arrange the syntax" and "solve for x" are different learning
// objectives even inside the same chapter.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 7 });
    console.log("Created new Grade 6 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Simple Equations" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Simple Equations",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Solving for the Unknown" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Solving for the Unknown",
      explanation_text:
        "Solving an equation means finding the number that makes both sides equal. Do the opposite operation to both sides — if the equation adds 5, subtract 5 to find the unknown.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `equation_label` is just the display text (student
  // never sees `correct_answer` — sanitizePayloadForClient strips it,
  // same as every other answer-key field). `dial_min`/`dial_max` bound
  // the machine's number dial in the UI.
  const machineLevels = [
    {
      title: "Machine: x + 5 = 12",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "x + 5 = 12",
        dial_min: 0,
        dial_max: 20,
        correct_answer: 7,
        hint: "Undo the +5 by subtracting 5 from 12.",
      },
    },
    {
      title: "Machine: 3 × n = 21",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "3 × n = 21",
        dial_min: 0,
        dial_max: 20,
        correct_answer: 7,
        hint: "Undo the ×3 by dividing 21 by 3.",
      },
    },
    {
      title: "Machine: 2y - 4 = 10",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label: "2y - 4 = 10",
        dial_min: 0,
        dial_max: 20,
        correct_answer: 7,
        hint: "Undo the -4 first (add 4 to both sides), then undo the ×2.",
      },
    },
  ];

  for (const level of machineLevels) {
    const exists = await GameContent.findOne({
      game_type: "MATH_NUMBER_MACHINE",
      title: level.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
        concept_id: concept._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
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

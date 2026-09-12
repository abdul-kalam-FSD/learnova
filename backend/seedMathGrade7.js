require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass: Grade 7 previously had History + Tamil
// only, no Mathematics at all (Math otherwise exists at Grades 4, 5,
// 6, 9). Reuses MATH_NUMBER_MACHINE's numeric-equality mechanic as-is
// (no code changes — dial_min/dial_max are read generically by the
// frontend, negative bounds work the same as positive ones) with the
// Grade 7 topic of solving simple equations involving negative
// integers, the natural next step after Grade 6's positive-only
// equations.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: /math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 7 });
    console.log("Created new Grade 7 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Integers" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Number Systems",
      title: "Integers",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Solving Equations with Negative Integers" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Solving Equations with Negative Integers",
      explanation_text:
        "Integers include negative numbers, and equations can have negative solutions too. The same rule still applies — do the same operation to both sides to isolate the unknown — but watch the sign carefully: subtracting a larger number from a smaller one, or dividing by a negative, can flip the answer's sign.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const machineLevels = [
    {
      title: "Machine: x + 8 = 3",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "x + 8 = 3",
        dial_min: -20,
        dial_max: 20,
        correct_answer: -5,
        hint: "Undo the +8 by subtracting 8 from 3 — the result lands below zero.",
      },
    },
    {
      title: "Machine: n - 6 = -10",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "n - 6 = -10",
        dial_min: -20,
        dial_max: 20,
        correct_answer: -4,
        hint: "Undo the -6 by adding 6 to -10.",
      },
    },
    {
      title: "Machine: -3 × y = 15",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label: "-3 × y = 15",
        dial_min: -20,
        dial_max: 20,
        correct_answer: -5,
        hint: "Undo the ×(-3) by dividing 15 by -3 — a positive divided by a negative gives a negative result.",
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

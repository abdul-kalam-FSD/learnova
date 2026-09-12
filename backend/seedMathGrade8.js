require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass: Grade 8 previously had no Mathematics
// content at all (Math otherwise exists at Grades 4, 5, 6, 7, 9).
// Grounded in the current NCERT Class 8 Maths textbook, "Ganita
// Prakash" (NCF-SE 2023, 2026-27 session, published in two parts) —
// Part 1, Chapter 1, "A Square and A Cube", a confirmed real chapter
// covering perfect squares, perfect cubes, square roots, and cube
// roots.
//
// Reuses MATH_NUMBER_MACHINE's numeric-equality mechanic as-is (no
// code changes — the same dial_min/dial_max/correct_answer shape
// used for Grade 6/7's equations works equally well for "solve for
// the unknown" framed as a square/cube fact rather than a linear
// equation).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 8, name: /math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 8 });
    console.log("Created new Grade 8 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "A Square and A Cube" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Number Systems",
      title: "A Square and A Cube",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Squares, Cubes, and Their Roots" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Squares, Cubes, and Their Roots",
      explanation_text:
        "Squaring a number means multiplying it by itself, and cubing means multiplying it by itself twice more. A square root undoes squaring, and a cube root undoes cubing — so if 6 × 6 = 36, then the square root of 36 is 6, and the same relationship holds for cubes.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const machineLevels = [
    {
      title: "Machine: 7² = ?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "7² = ?",
        dial_min: 0,
        dial_max: 100,
        correct_answer: 49,
        hint: "Squaring 7 means multiplying it by itself: 7 × 7.",
      },
    },
    {
      title: "Machine: √81 = ?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "√81 = ?",
        dial_min: 0,
        dial_max: 20,
        correct_answer: 9,
        hint: "Find the number that, multiplied by itself, gives 81.",
      },
    },
    {
      title: "Machine: ∛64 = ?",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label: "∛64 = ?",
        dial_min: 0,
        dial_max: 20,
        correct_answer: 4,
        hint: "Find the number that, multiplied by itself twice more (n × n × n), gives 64.",
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

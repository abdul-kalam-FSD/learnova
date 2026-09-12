require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 12 Mathematics hole flagged in the guest-mode audit:
// Grade 12 had Physics/Chemistry/Biology content but no Mathematics
// at all, which meant no real "Science (PCM)" stream could exist at
// Grade 12 (seedStreams.js explicitly skips creating one until this
// gap is filled).
//
// Grounded in the current NCERT Class 12 Mathematics Part I, Chapter
// 4 "Determinants" — chosen because it's a self-contained, purely
// numeric-answer topic (unlike Continuity/Differentiability or
// Vector Algebra, which need graphing/3D interaction this project
// doesn't have a game mechanic for yet), so it maps cleanly onto the
// existing MATH_NUMBER_MACHINE mechanic already used for Grade 11
// Mathematics (Sets) without inventing a new interaction.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 12, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 12 });
    console.log("Created new Grade 12 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Determinants" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Determinants",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Calculating the Determinant of a 2x2 and 3x3 Matrix",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Calculating the Determinant of a 2x2 and 3x3 Matrix",
      explanation_text:
        "For a 2x2 matrix [[a, b], [c, d]], the determinant is ad - bc. For a 3x3 matrix, expand along the first row: multiply each entry by the determinant of the 2x2 matrix left after removing its row and column, alternating + and - signs, then sum the three results. A determinant of zero means the matrix has no inverse.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const machineLevels = [
    {
      title: "Machine: 2x2 Determinant",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "Matrix [[4, 3], [2, 5]]. What is the determinant?",
        dial_min: -20,
        dial_max: 20,
        correct_answer: 14,
        hint: "For [[a, b], [c, d]], the determinant is a×d - b×c: (4×5) - (3×2).",
      },
    },
    {
      title: "Machine: 2x2 Determinant with Negatives",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "Matrix [[-3, 6], [4, -2]]. What is the determinant?",
        dial_min: -40,
        dial_max: 40,
        correct_answer: -18,
        hint: "(-3 × -2) - (6 × 4) = 6 - 24.",
      },
    },
    {
      title: "Machine: 3x3 Determinant by First-Row Expansion",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label:
          "Matrix [[1, 2, 3], [0, 1, 4], [5, 6, 0]]. What is the determinant?",
        dial_min: -50,
        dial_max: 50,
        correct_answer: 1,
        hint: "Expand along the first row: 1×(1×0 - 4×6) - 2×(0×0 - 4×5) + 3×(0×6 - 1×5) = 1×(-24) - 2×(-20) + 3×(-5).",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Mechanic-diversity fix: Grade 12 Mathematics ("Determinants",
// seeded by seedMathGrade12.js) previously had only MATH_NUMBER_
// MACHINE — every challenge was "compute this numeric determinant".
// This reuses the existing chapter, adds a new Concept, and seeds
// MATH_EQUATION_BUILDER content (already registered — see
// seedMathEquationBuilder.js for Grade 9/10 usage) so students also
// practice the *structure* of the determinant/cofactor formulas
// themselves, not just plugging in numbers. Reuses the generic
// order-family check in gameControllers.js (same orderedPieceIds ===
// correct_order rule as CS_CODE_ORDER_BUILDER), no new backend or
// frontend code needed — MATH_EQUATION_BUILDER already has a
// frontend component (EquationBuilder.jsx) and route.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 12, name: /mathematics|math/i });
  if (!subject) {
    throw new Error("Grade 12 Mathematics subject not found — run seedMathGrade12.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Determinants" });
  if (!chapter) {
    throw new Error("Chapter 'Determinants' not found — run seedMathGrade12.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Building the Determinant and Cofactor Formulas",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building the Determinant and Cofactor Formulas",
      explanation_text:
        "Computing a determinant's numeric value is one skill — knowing the formula's structure well enough to assemble it from scratch is another. The 2x2 formula, the first-row cofactor expansion, and the cofactor's own sign rule each have a fixed structure worth being able to build, not just apply.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const equationChallenges = [
    {
      title: "Build: Determinant Formula for a 2x2 Matrix",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scrambled_pieces: [
          { id: "p3", label: "d" },
          { id: "p1", label: "a" },
          { id: "p6", label: "b" },
          { id: "p2", label: "×" },
          { id: "p4", label: "−" },
          { id: "p7", label: "c" },
          { id: "p5", label: "×" },
        ],
        correct_order: ["p1", "p2", "p3", "p4", "p6", "p5", "p7"],
        hint: "For [[a, b], [c, d]], multiply the top-left-to-bottom-right diagonal first, then subtract the other diagonal's product.",
      },
    },
    {
      title: "Build: Cofactor Expansion Formula (3x3, First Row)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scrambled_pieces: [
          { id: "q3", label: "a12 × C12" },
          { id: "q1", label: "a11 × C11" },
          { id: "q4", label: "+" },
          { id: "q5", label: "a13 × C13" },
          { id: "q2", label: "+" },
        ],
        correct_order: ["q1", "q2", "q3", "q4", "q5"],
        hint: "The cofactor C₁ⱼ already carries its own sign — that's why every term in the first-row expansion is added, never subtracted directly.",
      },
    },
    {
      title: "Build: Definition of a Cofactor",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scrambled_pieces: [
          { id: "r4", label: "×" },
          { id: "r1", label: "Cij" },
          { id: "r5", label: "Mij" },
          { id: "r2", label: "=" },
          { id: "r3", label: "(−1)^(i+j)" },
        ],
        correct_order: ["r1", "r2", "r3", "r4", "r5"],
        hint: "The cofactor equals the minor multiplied by a sign that depends on whether i+j is even (+1) or odd (−1).",
      },
    },
  ];

  for (const challenge of equationChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_BUILDER",
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

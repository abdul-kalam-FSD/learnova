require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Continues the Grade 11 Math sequence (14-chapter core, 2026-27
// CBSE session). Chapter 4, next after Sets, Relations and
// Functions, and Trigonometric Functions: Complex Numbers and
// Quadratic Equations.
//
// Content-only pass — no new game_type. Reuses MATH_EQUATION_BUILDER,
// the same mechanic seedMathGrade10.js used for real quadratic
// equations, but here applied to a natural next step within the same
// mechanic: ordering the solving steps that lead to a quadratic's
// complex roots (discriminant negative), rather than just arranging
// an equation into standard form. Same ordered-sequence check,
// genuinely different task shape.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 11, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 11 });
    console.log("Created new Grade 11 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Complex Numbers and Quadratic Equations" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Complex Numbers and Quadratic Equations",
      order_index: 4,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Complex Roots of a Quadratic Equation" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Complex Roots of a Quadratic Equation",
      explanation_text:
        "When a quadratic equation's discriminant (b² - 4ac) is negative, it has no real roots — but it does have two roots in the complex numbers, where i = √-1. The quadratic formula still works the same way; the only difference is that the square root of a negative number under it becomes a multiple of i instead of a real number.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape matches Equation Builder: `scrambled_pieces` are the
  // tappable step cards, `correct_order` is the true left-to-right
  // sequence of solving steps, stripped before the client sees it.
  const equationChallenges = [
    {
      title: "Solve: x² + 4 = 0",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scrambled_pieces: [
          { id: "l3", label: "x = ±√(-4)" },
          { id: "l1", label: "x² + 4 = 0" },
          { id: "l4", label: "x = ±2i" },
          { id: "l2", label: "x² = -4" },
        ],
        correct_order: ["l1", "l2", "l3", "l4"],
        hint: "Isolate x² first, then take the square root of both sides — a negative under the root becomes a multiple of i.",
      },
    },
    {
      title: "Solve: x² - 2x + 5 = 0",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scrambled_pieces: [
          { id: "m2", label: "x = [2 ± √(4 - 20)] / 2" },
          { id: "m1", label: "a = 1, b = -2, c = 5" },
          { id: "m4", label: "x = 1 ± 2i" },
          { id: "m3", label: "x = [2 ± √(-16)] / 2 = [2 ± 4i] / 2" },
        ],
        correct_order: ["m1", "m2", "m3", "m4"],
        hint: "Identify a, b, c first, substitute into the quadratic formula, then simplify the square root of the negative discriminant into a multiple of i.",
      },
    },
    {
      title: "Solve: 2x² + 2x + 5 = 0",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scrambled_pieces: [
          { id: "n1", label: "a = 2, b = 2, c = 5" },
          { id: "n4", label: "x = [-2 ± 6i] / 4 = -1/2 ± (3/2)i" },
          { id: "n2", label: "x = [-2 ± √(4 - 40)] / 4" },
          { id: "n3", label: "x = [-2 ± √(-36)] / 4 = [-2 ± 6i] / 4" },
        ],
        correct_order: ["n1", "n2", "n3", "n4"],
        hint: "After simplifying √(-36) to 6i, both terms in the numerator can be divided by the common factor with the denominator to reach simplest form.",
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

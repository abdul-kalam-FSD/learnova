require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Continues the Grade 11 Math sequence (14-chapter core, 2026-27
// CBSE session). Chapter 7, next after Permutations and
// Combinations: Binomial Theorem.
//
// New game_type this pass: MATH_PASCAL_TRIANGLE_BUILD. Genuinely new
// mechanic (chosen over reusing Match/Speed Challenge) — the point of
// this concept is *seeing* how each row builds from the one above it,
// which a static match or MCQ round can't show. On the backend it
// reuses the existing order-sensitive Builder scoring group (same
// checkAttempt branch as Equation Builder/Timeline Builder —
// orderedPieceIds vs correct_order), since "place these coefficient
// tiles left-to-right in the correct row" is a genuine fit for that
// exact shape. No new backend scoring code.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Binomial Theorem" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Binomial Theorem",
      order_index: 7,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Pascal's Triangle and Binomial Coefficients" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Pascal's Triangle and Binomial Coefficients",
      explanation_text:
        "The Binomial Theorem expands (a + b)^n as a sum of terms nC0·a^n + nC1·a^(n-1)b + ... + nCn·b^n, where each coefficient nCr is a binomial coefficient. These coefficients form Pascal's Triangle: row n holds nC0, nC1, ..., nCn, and every entry (except the 1s at the edges) equals the sum of the two entries directly above it. The general term, or (r+1)th term, of the expansion is T(r+1) = nCr · a^(n-r) · b^r.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- PASCAL'S TRIANGLE BUILDER (GameType: MATH_PASCAL_TRIANGLE_BUILD) ----------
  // payload shape: prior_rows are shown read-only as the pyramid
  // above; scrambled_pieces are the tiles the student places in
  // order; correct_order is the target row left-to-right. Scored by
  // the shared order-sensitive Builder check (same as
  // MATH_EQUATION_BUILDER) — no new backend logic.
  const pascalTriangleLevels = [
    {
      title: "Build Row 3 — (a + b)³",
      difficulty: "easy",
      order_index: 1,
      payload: {
        prior_rows: [
          [1],
          [1, 1],
          [1, 2, 1],
        ],
        hint: "Each number is the sum of the two above it. The first and last of every row are always 1.",
        scrambled_pieces: [
          { id: "p1", label: "3" },
          { id: "p2", label: "1" },
          { id: "p3", label: "1" },
          { id: "p4", label: "3" },
        ],
        correct_order: ["p2", "p1", "p4", "p3"],
      },
    },
    {
      title: "Build Row 4 — (a + b)⁴",
      difficulty: "easy",
      order_index: 2,
      payload: {
        prior_rows: [
          [1],
          [1, 1],
          [1, 2, 1],
          [1, 3, 3, 1],
        ],
        hint: "1+3=4, 3+3=6, 3+1=4 — add each adjacent pair from the row above.",
        scrambled_pieces: [
          { id: "p1", label: "6" },
          { id: "p2", label: "1" },
          { id: "p3", label: "4" },
          { id: "p4", label: "1" },
          { id: "p5", label: "4" },
        ],
        correct_order: ["p2", "p3", "p1", "p5", "p4"],
      },
    },
    {
      title: "Build Row 5 — (a + b)⁵",
      difficulty: "medium",
      order_index: 3,
      payload: {
        prior_rows: [
          [1],
          [1, 1],
          [1, 2, 1],
          [1, 3, 3, 1],
          [1, 4, 6, 4, 1],
        ],
        hint: "This row is nC0..nC5 for n=5. Check: 4+6=10, 6+4=10 — the middle of the row is the largest.",
        scrambled_pieces: [
          { id: "p1", label: "10" },
          { id: "p2", label: "1" },
          { id: "p3", label: "5" },
          { id: "p4", label: "1" },
          { id: "p5", label: "10" },
          { id: "p6", label: "5" },
        ],
        correct_order: ["p2", "p3", "p1", "p5", "p6", "p4"],
      },
    },
    {
      title: "Build Row 6 — (a + b)⁶",
      difficulty: "hard",
      order_index: 4,
      payload: {
        prior_rows: [
          [1],
          [1, 1],
          [1, 2, 1],
          [1, 3, 3, 1],
          [1, 4, 6, 4, 1],
          [1, 5, 10, 10, 5, 1],
        ],
        hint: "5+10=15, 10+10=20 — the middle term (20) is 6C3, the largest binomial coefficient in this row.",
        scrambled_pieces: [
          { id: "p1", label: "15" },
          { id: "p2", label: "1" },
          { id: "p3", label: "6" },
          { id: "p4", label: "1" },
          { id: "p5", label: "20" },
          { id: "p6", label: "6" },
          { id: "p7", label: "15" },
        ],
        correct_order: ["p2", "p3", "p1", "p5", "p7", "p6", "p4"],
      },
    },
  ];

  for (const level of pascalTriangleLevels) {
    const exists = await GameContent.findOne({
      game_type: "MATH_PASCAL_TRIANGLE_BUILD",
      title: level.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_PASCAL_TRIANGLE_BUILD",
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

  console.log("Pascal's Triangle Builder seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

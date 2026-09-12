require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 5 Mathematics — Chapter 2 of the Grade 5 vertical slice.
// Bridges Grade 4's "Shapes All Around" (naming only, no measurement)
// to Grade 6's "Perimeter and Construction" (which requires inferring
// equal opposite sides before picking pieces). Here the correct pieces
// are given directly — the skill being built is just "add up the sides",
// not yet "figure out which sides must be equal". Reuses
// MATH_GEOMETRY_BUILDER — a genuine fit, not reuse for convenience.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 5 });
    console.log("Created new Grade 5 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Perimeter and Shapes" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Geometry Basics",
      title: "Perimeter and Shapes",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Finding the Perimeter" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Finding the Perimeter",
      explanation_text:
        "The perimeter of a shape is the total distance all the way around it — just add up the length of every side. A triangle has 3 sides to add, a square has 4 equal sides, and a pentagon has 5 sides. Once you're comfortable adding up given side lengths, the next step is figuring out which sides must match before you can add them.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- GEOMETRY BUILDER challenges (GameType: MATH_GEOMETRY_BUILDER) ----------
  // Correct pieces are exactly the shape's sides — the challenge is
  // picking them out from distractors and adding correctly, not
  // inferring which sides must be equal (that's Grade 6).
  const geometryBuilderChallenges = [
    {
      title: "Find the Triangle's Perimeter (Grade 5)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target: { shape: "triangle", perimeter: 12, unit: "cm" },
        pieces: [
          { id: "p1", length: 3 },
          { id: "p2", length: 4 },
          { id: "p3", length: 5 },
          { id: "p4", length: 7 },
        ],
        correct_piece_ids: ["p1", "p2", "p3"],
        hint: "A triangle has 3 sides. Add up 3, 4, and 5.",
      },
    },
    {
      title: "Find the Square's Perimeter (Grade 5)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target: { shape: "square", perimeter: 16, unit: "cm" },
        pieces: [
          { id: "p1", length: 4 },
          { id: "p2", length: 4 },
          { id: "p3", length: 4 },
          { id: "p4", length: 4 },
          { id: "p5", length: 6 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4"],
        hint: "A square has 4 equal sides. If each side is 4cm, what's 4 + 4 + 4 + 4?",
      },
    },
    {
      title: "Find the Pentagon's Perimeter (Grade 5)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target: { shape: "pentagon", perimeter: 20, unit: "cm" },
        pieces: [
          { id: "p1", length: 4 },
          { id: "p2", length: 4 },
          { id: "p3", length: 4 },
          { id: "p4", length: 4 },
          { id: "p5", length: 4 },
          { id: "p6", length: 8 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4", "p5"],
        hint: "A pentagon has 5 sides — add up all five 4cm pieces.",
      },
    },
  ];

  for (const challenge of geometryBuilderChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_GEOMETRY_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_GEOMETRY_BUILDER",
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

  console.log("Grade 5 Mathematics — Perimeter and Shapes seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

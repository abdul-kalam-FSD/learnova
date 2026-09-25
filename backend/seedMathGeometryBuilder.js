require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Second mechanic in the Geometry family (after Shape Match). Reuses
// the "Geometry" chapter created by seedGeometryGrade6.js, adds a
// new concept for perimeter/construction since it's a different
// learning objective from shape classification.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 6 });
    console.log("Created new Grade 6 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Perimeter and Area" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Perimeter and Area",
      order_index: 6,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Perimeter and Construction" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Perimeter and Construction",
      explanation_text:
        "The perimeter of a shape is the total length of all its sides added together. To construct a shape with a given perimeter, pick side lengths that add up exactly to the target — and, for shapes like rectangles, keep opposite sides equal.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- GEOMETRY BUILDER challenges (GameType: MATH_GEOMETRY_BUILDER) ----------
  // payload shape: same subset-sum pattern as Fraction Builder — the
  // student is given `pieces` (side lengths) and must pick the subset
  // that sums to the target shape's perimeter. `target.shape` drives
  // the header ShapeIcon; correctness of the *shape* (equal sides for
  // a rectangle, valid triangle inequality, etc.) is guaranteed by
  // how `correct_piece_ids` was chosen here, not checked at runtime —
  // same trust boundary as Fraction Builder's target fraction.
  const geometryBuilderChallenges = [
    {
      title: "Build a Triangle (Perimeter 15cm)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target: { shape: "triangle", perimeter: 15, unit: "cm" },
        pieces: [
          { id: "p1", length: 4 },
          { id: "p2", length: 5 },
          { id: "p3", length: 6 },
          { id: "p4", length: 8 },
        ],
        correct_piece_ids: ["p1", "p2", "p3"],
        hint: "A triangle has 3 sides — find three lengths here that add up to 15cm.",
      },
    },
    {
      title: "Build a Rectangle (Perimeter 20cm)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target: { shape: "rectangle", perimeter: 20, unit: "cm" },
        pieces: [
          { id: "p1", length: 6 },
          { id: "p2", length: 6 },
          { id: "p3", length: 4 },
          { id: "p4", length: 4 },
          { id: "p5", length: 5 },
          { id: "p6", length: 3 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4"],
        hint: "A rectangle needs two pairs of equal opposite sides — find two lengths that repeat and add up to 20cm.",
      },
    },
    {
      title: "Build a Regular Pentagon (Perimeter 25cm)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target: { shape: "pentagon", perimeter: 25, unit: "cm" },
        pieces: [
          { id: "p1", length: 5 },
          { id: "p2", length: 5 },
          { id: "p3", length: 5 },
          { id: "p4", length: 5 },
          { id: "p5", length: 5 },
          { id: "p6", length: 6 },
          { id: "p7", length: 4 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4", "p5"],
        hint: "A regular pentagon has 5 equal sides — 5 equal lengths that add up to 25cm.",
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

  console.log("Geometry Builder seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

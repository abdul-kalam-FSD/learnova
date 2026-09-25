require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Vertical-slice seed for the new Geometry chapter (Section 4 —
// Mathematics Geometry Builder family), first mechanic: Shape Match.
// Reuses the existing Grade 6 Mathematics subject (same one Fractions
// and Equations live under) — only the chapter/concept are new.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Playing with Constructions" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ganita Prakash",
      title: "Playing with Constructions",
      order_index: 8,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Classifying Shapes" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Classifying Shapes",
      explanation_text:
        "2D shapes can be classified by their number of sides and by defining properties such as equal sides or right angles. A triangle has 3 sides, a quadrilateral 4 and a pentagon 5; a square has four equal sides and four right angles, and a rectangle has equal opposite sides and four right angles.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // ---------- SHAPE MATCH challenges (GameType: MATH_SHAPE_MATCH) ----------
  // payload shape: student matches each shape (slot, rendered as an
  // SVG visual via `shape`) to its correct property (component) —
  // same mapping-equality pattern as Fraction Match, just with a
  // shape icon standing in for the slot's text label.
  const shapeMatchChallenges = [
    {
      title: "Match: Shape to Sides",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each shape to its number of sides.",
        slots: [
          { id: "s1", shape: "triangle", label: "Triangle" },
          { id: "s2", shape: "square", label: "Square" },
          { id: "s3", shape: "pentagon", label: "Pentagon" },
        ],
        components: [
          { id: "c4", label: "6 sides" },
          { id: "c3", label: "5 sides" },
          { id: "c2", label: "4 sides" },
          { id: "c1", label: "3 sides" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Count the straight edges around each shape.",
      },
    },
    {
      title: "Match: Quadrilateral Properties",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each quadrilateral to its defining property.",
        slots: [
          { id: "s1", shape: "square", label: "Square" },
          { id: "s2", shape: "rectangle", label: "Rectangle" },
          { id: "s3", shape: "rhombus", label: "Rhombus" },
        ],
        components: [
          { id: "c4", label: "Opposite sides equal, opposite angles equal" },
          { id: "c3", label: "All sides equal, opposite angles equal" },
          { id: "c2", label: "Opposite sides equal, all angles 90°" },
          { id: "c1", label: "All sides equal, all angles 90°" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Check side lengths first, then check if the angles are 90°.",
      },
    },
  ];

  for (const challenge of shapeMatchChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_SHAPE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_SHAPE_MATCH",
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

  console.log("Geometry Grade 6 (Shape Match) seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

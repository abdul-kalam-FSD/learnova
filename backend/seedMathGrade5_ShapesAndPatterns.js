require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 7 "Shapes and
// Patterns" (2026-27 session).
//
// IMPORTANT CORRECTION TO THE PHASE 1 AUDIT: Phase 1 guessed this
// chapter was the closest (if imperfect) match to the existing
// "Perimeter and Shapes" chapter. A current CBSE school's verified
// 2026-27 academic calendar shows this is wrong — that school's
// calendar explicitly pairs NCERT Chapter 7 "Shapes and Patterns"
// with repeating-pattern/tiling activities (rangoli with square,
// circle, triangle; tiling without gaps) and an introduction to
// acute/right/obtuse angle types, while it separately pairs NCERT
// Chapter 11 "Grandmother's Quilt" with the "Perimeter of rectilinear
// figures" topic. So the existing "Perimeter and Shapes" chapter is
// actually the closer match to Chapter 11, not Chapter 7 — see
// seedMathGrade5_GrandmothersQuilt.js, which expands that chapter
// with a sibling concept instead. This file creates Chapter 7 as a
// genuinely new, separate chapter about shape properties, repeating
// patterns, and angle-type identification (not perimeter).
//
// Reuses MATH_SHAPE_MATCH (the same generic mapping mechanic used for
// Grade 4 symmetry and this batch's Angles as Turns) — a natural fit
// for classifying shapes/patterns/angle types. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Shapes and Patterns" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Geometry Basics",
      title: "Shapes and Patterns",
      order_index: 7,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Repeating Patterns and Shape Properties",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Repeating Patterns and Shape Properties",
      explanation_text:
        "Shapes like squares, circles, and triangles can be arranged into repeating patterns — like a rangoli design or floor tiling — where the same shape or group of shapes repeats with no gaps or overlaps. Squares and equilateral triangles tile perfectly on their own because their angles fit together evenly around a point; circles alone always leave gaps. Noticing what repeats, and how shapes' corners and sides fit together, is the heart of pattern-making.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const patternChallenges = [
    {
      title: "Match: What Comes Next in the Pattern?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each repeating pattern to the shape that comes next.",
        slots: [
          { id: "s1", label: "Circle, Square, Circle, Square, Circle, ___" },
          { id: "s2", label: "Triangle, Triangle, Circle, Triangle, Triangle, ___" },
          { id: "s3", label: "Square, Circle, Triangle, Square, Circle, ___" },
        ],
        components: [
          { id: "c1", label: "Square" },
          { id: "c2", label: "Circle" },
          { id: "c3", label: "Triangle" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Find the group of shapes that repeats, then check where you are inside that repeating group.",
      },
    },
    {
      title: "Match: Which Shapes Tile Without Gaps?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each shape to whether it can tile a floor with no gaps or overlaps, using only that one shape.",
        slots: [
          { id: "s1", label: "Squares" },
          { id: "s2", label: "Circles" },
          { id: "s3", label: "Equilateral triangles" },
        ],
        components: [
          { id: "c1", label: "Yes — their corners fit together perfectly around a point" },
          { id: "c2", label: "No — round edges always leave curved gaps between them" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c1" },
        hint: "Think about what happens at the corners where several copies of the shape meet — do the angles add up to fill the space exactly?",
      },
    },
    {
      title: "Match: Rangoli Shape to Its Number of Corners",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each shape used in a rangoli design to how many corners (vertices) it has.",
        slots: [
          { id: "s1", label: "Triangle" },
          { id: "s2", label: "Square" },
          { id: "s3", label: "Pentagon" },
          { id: "s4", label: "Circle" },
        ],
        components: [
          { id: "c1", label: "3 corners" },
          { id: "c2", label: "4 corners" },
          { id: "c3", label: "5 corners" },
          { id: "c4", label: "0 corners — no straight sides at all" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3", s4: "c4" },
        hint: "Count the number of straight sides a shape has — that's usually the same as its number of corners.",
      },
    },
  ];

  for (const challenge of patternChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_SHAPE_MATCH", title: challenge.title });
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

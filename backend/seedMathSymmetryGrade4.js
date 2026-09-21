require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 11
// "Fun with Symmetry" — symmetric vs non-symmetric figures, lines of
// symmetry, mirror images).
//
// NOTE on mechanic choice (documented per the "prefer extending an
// existing mechanic" rule): no existing game_type is a dedicated
// symmetry-classification mechanic. Rather than inventing a new
// game_type, this reuses MATH_SHAPE_MATCH's existing generic
// slots/components/correct_mapping structure (already used for
// shape-naming in seedMathGrade4.js) and points it at a symmetry
// classification task instead, using only the shape set that
// mechanic already supports (circle, square, triangle, rectangle,
// pentagon). This is an extension of an existing payload shape, not
// a new game_type — flagged here for your review in case the
// frontend's MATH_SHAPE_MATCH component assumes shape-NAME matching
// specifically and would need a small render-mode addition to
// support this use.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: /mathematics/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 4 });
    console.log("Created new Grade 4 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Fun with Symmetry" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Fun with Symmetry",
      order_index: 11,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Symmetry and Lines of Symmetry" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Symmetry and Lines of Symmetry",
      explanation_text:
        "A shape is symmetric if you can fold it along a line so that both halves match exactly — that fold line is called a line of symmetry. A circle has many lines of symmetry (any line through its centre), a square has 4, and an equilateral triangle has 3. Some shapes, like a scalene triangle with three different side lengths, have no line of symmetry at all.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const shapeMatchChallenges = [
    {
      title: "Match: Shape to Its Number of Symmetry Lines",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each shape to how many lines of symmetry it has.",
        slots: [
          { id: "s1", shape: "circle", label: "Circle" },
          { id: "s2", shape: "square", label: "Square" },
          { id: "s3", shape: "triangle", label: "Equilateral triangle (all sides equal)" },
        ],
        components: [
          { id: "c1", label: "Many (infinite) lines of symmetry" },
          { id: "c2", label: "4 lines of symmetry" },
          { id: "c3", label: "3 lines of symmetry" },
          { id: "c4", label: "0 lines of symmetry" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "The more evenly balanced a shape's sides and angles are, the more ways it can be folded to match itself.",
      },
    },
    {
      title: "Match: Symmetric or Not?",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each shape to whether it is symmetric or not.",
        slots: [
          { id: "s1", shape: "rectangle", label: "Rectangle (opposite sides equal)" },
          { id: "s2", shape: "pentagon", label: "Regular pentagon (all sides and angles equal)" },
          { id: "s3", shape: "triangle", label: "Scalene triangle (all three sides different lengths)" },
        ],
        components: [
          { id: "c1", label: "Symmetric — matches along a line through the middle of two opposite sides" },
          { id: "c2", label: "Symmetric — matches along several different lines because all sides/angles are equal" },
          { id: "c3", label: "Not symmetric — no line makes both halves match" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "If every side length is different, folding it in half will never make the two sides match exactly.",
      },
    },
    {
      title: "Match: Mirror Image Halves",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each shape to the correct description of its mirror-image halves.",
        slots: [
          { id: "s1", shape: "square", label: "Square folded along a line through the middle of two opposite sides" },
          { id: "s2", shape: "circle", label: "Circle folded along any line through its centre" },
          { id: "s3", shape: "rectangle", label: "Rectangle folded along its shorter diagonal" },
        ],
        components: [
          { id: "c1", label: "Both halves match exactly — this is a line of symmetry" },
          { id: "c2", label: "Both halves match exactly, and this works for every such line" },
          { id: "c3", label: "The two halves do NOT match — this is not a line of symmetry" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A rectangle's diagonal fold usually produces two triangles that are the same size but face different ways — check if they line up when flipped.",
      },
    },
  ];

  for (const challenge of shapeMatchChallenges) {
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

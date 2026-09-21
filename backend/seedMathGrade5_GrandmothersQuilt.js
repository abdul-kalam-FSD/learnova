require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 Mathematics — Maths Mela Chapter 11
// "Grandmother's Quilt" (2026-27 session).
//
// This is the corrected E-2-style treatment for Math (see the note in
// seedMathGrade5_ShapesAndPatterns.js): a current CBSE school's
// verified 2026-27 academic calendar shows NCERT Chapter 11
// "Grandmother's Quilt" is actually the perimeter-of-rectilinear-
// figures chapter, not Chapter 7 "Shapes and Patterns". That means
// the EXISTING "Perimeter and Shapes" chapter (built before this
// audit, teaching perimeter of squares/rectangles/triangles/
// pentagons) is the real, if incompletely scoped, match for Chapter
// 11 — not an unmapped/wrong-mapping chapter as Phase 1 first
// guessed. Following the same "keep the chapter, do not rename it,
// add a sibling concept" pattern used for Circuits/Perimeter in the
// approved decisions, this file adds ONE new concept to the existing
// "Perimeter and Shapes" chapter (found via findOne, not renamed) for
// the harder Grandmother's-Quilt-appropriate skill: perimeter of
// combined/irregular rectilinear shapes (an L-shaped or quilt-block
// figure made of straight edges only), building on the chapter's
// existing single-shape perimeter concept.
//
// Reuses MATH_GEOMETRY_BUILDER, the same subset-sum "pick the side
// lengths that make up the perimeter" mechanic already used by this
// chapter's existing concept. No new mechanic needed, and no existing
// GameContent is touched.
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

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Perimeter and Shapes" });
  if (!chapter) {
    console.error(
      "ERROR: expected chapter 'Perimeter and Shapes' to already exist (created by seedMathGrade5_Geometry.js). Run that seed first."
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({
    chapter_id: chapter._id,
    title: "Perimeter of Combined and Irregular Rectilinear Shapes",
  });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Perimeter of Combined and Irregular Rectilinear Shapes",
      explanation_text:
        "A quilt block, like an L-shaped piece of fabric, is made only of straight edges but isn't a simple square, rectangle, or triangle. To find its perimeter, walk around the whole outside edge and add up the length of every straight side — including the ones that aren't given directly, which you can often work out from the sides you do know (an L-shape's missing edges add up to match the two outer sides they replace).",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const quiltChallenges = [
    {
      title: "Build: An L-Shaped Quilt Block's Perimeter",
      difficulty: "easy",
      order_index: 4,
      payload: {
        target: { shape: "L-shaped quilt block", perimeter: 20, unit: "cm" },
        pieces: [
          { id: "p1", length: 6 },
          { id: "p2", length: 4 },
          { id: "p3", length: 3 },
          { id: "p4", length: 2 },
          { id: "p5", length: 3 },
          { id: "p6", length: 2 },
          { id: "p7", length: 10 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4", "p5", "p6"],
        hint: "Walk all the way around the outside edge of the shape — every side counts once, even the shorter inner ones.",
      },
    },
    {
      title: "Build: A Cross-Shaped Quilt Block's Perimeter",
      difficulty: "medium",
      order_index: 5,
      payload: {
        target: { shape: "cross-shaped quilt block (5 equal small squares)", perimeter: 60, unit: "cm" },
        pieces: [
          { id: "p1", length: 5 },
          { id: "p2", length: 5 },
          { id: "p3", length: 5 },
          { id: "p4", length: 5 },
          { id: "p5", length: 5 },
          { id: "p6", length: 5 },
          { id: "p7", length: 5 },
          { id: "p8", length: 5 },
          { id: "p9", length: 5 },
          { id: "p10", length: 5 },
          { id: "p11", length: 5 },
          { id: "p12", length: 5 },
          { id: "p13", length: 25 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11", "p12"],
        hint: "Only the sides on the very outside boundary of the cross count — count each of the 12 outer edges once.",
      },
    },
    {
      title: "Build: Finding a Missing Side of a Quilt Block",
      difficulty: "hard",
      order_index: 6,
      payload: {
        target: { shape: "step-shaped quilt block", perimeter: 34, unit: "cm" },
        pieces: [
          { id: "p1", length: 10 },
          { id: "p2", length: 4 },
          { id: "p3", length: 3 },
          { id: "p4", length: 3 },
          { id: "p5", length: 7 },
          { id: "p6", length: 7 },
          { id: "p7", length: 5 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4", "p5", "p6"],
        hint: "Add up the four known sides first, subtract that from the total perimeter, then split what's left evenly between the two remaining equal sides.",
      },
    },
  ];

  for (const challenge of quiltChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_GEOMETRY_BUILDER", title: challenge.title });
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

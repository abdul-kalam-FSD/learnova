require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 6 Mathematics - Learnova enrichment: polygon angle sums (moved out of "Classifying Shapes")
// Generated content for the current 2026-27 Grade 6 curriculum. Idempotent:
// every Chapter/Concept/GameContent is looked up before it is created
// (GameContent is keyed on {game_type, title}), so re-running is safe.
// All reused mechanics keep their existing technical game_type (see the
// Phase 1 audit, GLOBAL-2); no new mechanic or shared UI/scoring change.
// Kept as enrichment, not tagged to any grade other than 6 and not silently deleted.

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

  // ---------- Chapter 12: Geometry Extensions ----------
  let chapter12 = await Chapter.findOne({ subject_id: subject._id, title: "Geometry Extensions" });
  if (!chapter12) {
    chapter12 = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Learnova Enrichment",
      title: "Geometry Extensions",
      order_index: 12,
    });
    console.log("Created chapter:", chapter12._id);
  } else {
    console.log("Using existing chapter:", chapter12._id);
  }

  let concept12_1 = await Concept.findOne({ chapter_id: chapter12._id, title: "Angle Sums of Polygons (Enrichment)" });
  if (!concept12_1) {
    concept12_1 = await Concept.create({
      chapter_id: chapter12._id,
      title: "Angle Sums of Polygons (Enrichment)",
      explanation_text:
        "Enrichment beyond the verified Grade 6 scope: the interior angles of a triangle add up to 180° and of a quadrilateral to 360°, and every extra side adds another 180°.",
    });
    console.log("Created concept:", concept12_1._id);
  } else {
    console.log("Using existing concept:", concept12_1._id);
  }

  const levels12_1_MATH_SHAPE_MATCH = [
    {
      title: "Match: Shape to Angle Sum",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "Match each shape to the sum of its interior angles.",
        slots: [
          {
            id: "s1",
            shape: "triangle",
            label: "Triangle",
          },
          {
            id: "s2",
            shape: "rectangle",
            label: "Rectangle",
          },
          {
            id: "s3",
            shape: "hexagon",
            label: "Hexagon",
          },
        ],
        components: [
          {
            id: "c4",
            label: "540°",
          },
          {
            id: "c3",
            label: "720°",
          },
          {
            id: "c2",
            label: "360°",
          },
          {
            id: "c1",
            label: "180°",
          },
        ],
        correct_mapping: {
          s1: "c1",
          s2: "c2",
          s3: "c3",
        },
        hint: "Every extra side adds another 180° to the total.",
      },
    },
  ];
  for (const challenge of levels12_1_MATH_SHAPE_MATCH) {
    const exists = await GameContent.findOne({
      game_type: "MATH_SHAPE_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_SHAPE_MATCH",
        concept_id: concept12_1._id,
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

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

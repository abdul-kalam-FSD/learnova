require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 vertical slice (closing the Grade 4/5 content gap — the
// grade-band engineering (gradeBandConfig.js) already supported
// GRADE_4_5 with no content behind it). Reuses MATH_SHAPE_MATCH
// (same mechanic as Grade 6 Geometry) with a simpler concept: just
// naming each shape, no side-counting abstraction yet.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Shapes All Around" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Geometry Basics",
      title: "Shapes All Around",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Naming Basic Shapes" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Naming Basic Shapes",
      explanation_text:
        "Every shape has a name based on how many straight sides it has. A triangle has 3 sides, a square and rectangle both have 4 sides, and a pentagon has 5 sides. Learning to spot these shapes around you is the first step before counting sides or measuring angles.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `slots` are shapes shown to the student; `components`
  // are name cards; `correct_mapping` is { slotId: componentId }.
  const shapeChallenges = [
    {
      title: "Match the Shape to Its Name — Set 1",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Drag the correct name onto each shape.",
        slots: [
          { id: "s1", shape: "triangle", label: "Shape 1" },
          { id: "s2", shape: "circle", label: "Shape 2" },
          { id: "s3", shape: "square", label: "Shape 3" },
        ],
        components: [
          { id: "c1", label: "Triangle" },
          { id: "c2", label: "Circle" },
          { id: "c3", label: "Square" },
          { id: "c4", label: "Pentagon" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A triangle has 3 corners, a circle has none, and a square has 4 equal sides.",
      },
    },
    {
      title: "Match the Shape to Its Name — Set 2",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "This time there's a rectangle and a pentagon too.",
        slots: [
          { id: "t1", shape: "rectangle", label: "Shape 1" },
          { id: "t2", shape: "pentagon", label: "Shape 2" },
          { id: "t3", shape: "square", label: "Shape 3" },
          { id: "t4", shape: "triangle", label: "Shape 4" },
        ],
        components: [
          { id: "d1", label: "Rectangle" },
          { id: "d2", label: "Pentagon" },
          { id: "d3", label: "Square" },
          { id: "d4", label: "Triangle" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3", t4: "d4" },
        hint: "A rectangle looks like a stretched square — 4 sides, but not all equal.",
      },
    },
    {
      title: "Shapes in the Classroom",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "These shapes are drawn based on real classroom objects — match each to its name.",
        slots: [
          { id: "u1", shape: "rectangle", label: "The door" },
          { id: "u2", shape: "circle", label: "The clock" },
          { id: "u3", shape: "triangle", label: "The set-square corner" },
          { id: "u4", shape: "square", label: "The chalkboard eraser end" },
        ],
        components: [
          { id: "e1", label: "Circle" },
          { id: "e2", label: "Triangle" },
          { id: "e3", label: "Rectangle" },
          { id: "e4", label: "Square" },
        ],
        correct_mapping: { u1: "e3", u2: "e1", u3: "e2", u4: "e4" },
        hint: "Think about how many straight edges each real object's outline has.",
      },
    },
  ];

  for (const challenge of shapeChallenges) {
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

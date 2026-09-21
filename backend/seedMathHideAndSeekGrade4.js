require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 2
// "Hide and Seek" — position, spatial reasoning and an early,
// concrete introduction to perimeter via boundary/edge-tracing
// tasks). Reuses MATH_GEOMETRY_BUILDER (build a shape from given
// side lengths that add up to a target perimeter) — same generic
// "pick pieces that fit the target" mechanic as the Grade 6/7
// geometry version, just with smaller, whole-number lengths
// appropriate for Grade 4. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Hide and Seek" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Hide and Seek",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Tracing a Boundary and Measuring Around It" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Tracing a Boundary and Measuring Around It",
      explanation_text:
        "The distance all the way around the outside edge of a shape is called its perimeter. To find it, add up the length of every side. A shape can have the same perimeter made up of different combinations of side lengths — what matters is that they add up to the total distance around the boundary.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const geometryBuilderChallenges = [
    {
      title: "Build a Triangle Boundary (Perimeter 12cm)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target: { shape: "triangle", perimeter: 12, unit: "cm" },
        pieces: [
          { id: "p1", length: 3 },
          { id: "p2", length: 4 },
          { id: "p3", length: 5 },
          { id: "p4", length: 6 },
        ],
        correct_piece_ids: ["p1", "p2", "p3"],
        hint: "A triangle boundary has 3 sides — find three lengths here that add up to 12cm.",
      },
    },
    {
      title: "Build a Square Field (Perimeter 16cm)",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target: { shape: "square", perimeter: 16, unit: "cm" },
        pieces: [
          { id: "p1", length: 4 },
          { id: "p2", length: 4 },
          { id: "p3", length: 4 },
          { id: "p4", length: 4 },
          { id: "p5", length: 5 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4"],
        hint: "A square boundary has 4 equal sides — find four matching lengths that add up to 16cm.",
      },
    },
    {
      title: "Build a Rectangle Garden (Perimeter 18cm)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target: { shape: "rectangle", perimeter: 18, unit: "cm" },
        pieces: [
          { id: "p1", length: 5 },
          { id: "p2", length: 5 },
          { id: "p3", length: 4 },
          { id: "p4", length: 4 },
          { id: "p5", length: 3 },
          { id: "p6", length: 6 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4"],
        hint: "A rectangle boundary needs two pairs of equal opposite sides that add up to 18cm.",
      },
    },
  ];

  for (const challenge of geometryBuilderChallenges) {
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

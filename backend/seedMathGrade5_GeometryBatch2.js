require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 6 (Grade 4-5 curriculum depth audit). "Finding the Perimeter"
// (Grade 5 Mathematics, seedMathGrade5_Geometry.js) covers a
// scalene-looking triangle (sides given individually) and two
// all-equal-sided shapes (square, pentagon) across its 3 existing
// rounds — but never a shape with two DIFFERENT side lengths repeated
// in pairs, i.e. a plain rectangle, which is one of the most common
// real-world perimeter problems at this level and a natural midpoint
// between "all sides different" and "all sides equal." The file's own
// existing comment explicitly scopes this concept to picking correct
// side pieces and adding them (not inferring which sides must be
// equal — that stays a Grade 6 skill), and a rectangle fits that same
// scope perfectly since all 4 side lengths are still given directly.
// This adds 1 more MATH_GEOMETRY_BUILDER round to the SAME existing
// concept. Same pieces/correct_piece_ids payload shape as the
// original 3 rounds — no new mechanic, and no scope creep into
// Grade 6's equal-side-inference skill. Errors out if the subject/
// chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: /mathematics|math/i });
  if (!subject) {
    console.error("Grade 5 Mathematics subject not found — run seedMathGrade5_Geometry.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Perimeter and Shapes" });
  if (!chapter) {
    console.error('Chapter "Perimeter and Shapes" not found — run seedMathGrade5_Geometry.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Finding the Perimeter" });
  if (!concept) {
    console.error('Concept "Finding the Perimeter" not found — run seedMathGrade5_Geometry.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Find the Rectangle's Perimeter (Grade 5)",
      difficulty: "medium",
      order_index: 4,
      payload: {
        target: { shape: "rectangle", perimeter: 18, unit: "cm" },
        pieces: [
          { id: "p1", length: 6 },
          { id: "p2", length: 3 },
          { id: "p3", length: 6 },
          { id: "p4", length: 3 },
          { id: "p5", length: 5 },
        ],
        correct_piece_ids: ["p1", "p2", "p3", "p4"],
        hint: "A rectangle has 2 long sides the same length and 2 short sides the same length. Add 6 + 3 + 6 + 3.",
      },
    },
  ];

  for (const challenge of newChallenges) {
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

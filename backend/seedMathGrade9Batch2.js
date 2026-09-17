require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Equations with Terms on Both Sides"
// (Grade 9 Mathematics, seedMathGrade9.js) only has 2 GameContent
// items. This adds 2 more MATH_EQUATION_BUILDER challenges to the
// SAME existing concept, with two new equations distinct from the
// original pair. Same scrambled_pieces/correct_order payload shape —
// no new mechanic. Errors out if the subject/chapter/concept don't
// already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 9, name: /mathematics|math/i });
  if (!subject) {
    console.error("Grade 9 Mathematics subject not found — run seedMathGrade9.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Linear Equations" });
  if (!chapter) {
    console.error('Chapter "Linear Equations" not found — run seedMathGrade9.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Equations with Terms on Both Sides" });
  if (!concept) {
    console.error('Concept "Equations with Terms on Both Sides" not found — run seedMathGrade9.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Build: 3x + 2 = x + 8",
      difficulty: "easy",
      order_index: 3,
      payload: {
        scrambled_pieces: [
          { id: "g3", label: "=" },
          { id: "g1", label: "3x" },
          { id: "g6", label: "8" },
          { id: "g4", label: "x" },
          { id: "g2", label: "+ 2" },
          { id: "g5", label: "+" },
        ],
        correct_order: ["g1", "g2", "g3", "g4", "g5", "g6"],
        hint: "Everything before the equals sign is the left side, everything after is the right side.",
      },
    },
    {
      title: "Build: 7a - 5 = 2a + 15",
      difficulty: "hard",
      order_index: 4,
      payload: {
        scrambled_pieces: [
          { id: "h4", label: "2a" },
          { id: "h1", label: "7a" },
          { id: "h6", label: "15" },
          { id: "h3", label: "=" },
          { id: "h2", label: "- 5" },
          { id: "h5", label: "+" },
        ],
        correct_order: ["h1", "h2", "h3", "h4", "h5", "h6"],
        hint: "Keep the subtraction and addition attached to the term that follows them, in order.",
      },
    },
  ];

  for (const challenge of newChallenges) {
    const exists = await GameContent.findOne({ game_type: "MATH_EQUATION_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_BUILDER",
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

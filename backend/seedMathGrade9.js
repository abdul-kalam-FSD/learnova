require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade-coverage gap-fill: Mathematics previously only had content at
// Grade 6. Reuses the existing MATH_EQUATION_BUILDER mechanic/frontend
// (no code changes needed) with a Grade 9-appropriate topic — linear
// equations with terms on both sides, rather than Grade 6's simple
// one-step equations.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 9, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 9 });
    console.log("Created new Grade 9 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Linear Equations" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Linear Equations",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Equations with Terms on Both Sides" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Equations with Terms on Both Sides",
      explanation_text:
        "A linear equation can have the variable and constants on both sides, like '2x + 3 = x + 7'. Writing it correctly means keeping every term in its place — the equation isn't solved yet, just built in the right order.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as Grade 6's Equation Builder —
  // `scrambled_pieces` shuffled, `correct_order` (stripped before
  // the client sees it) is the true left-to-right order of the
  // equation's pieces.
  const equationChallenges = [
    {
      title: "Build: 2x + 3 = x + 7",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scrambled_pieces: [
          { id: "e3", label: "=" },
          { id: "e1", label: "2x" },
          { id: "e5", label: "7" },
          { id: "e4", label: "x" },
          { id: "e2", label: "+ 3" },
          { id: "e6", label: "+" },
        ],
        correct_order: ["e1", "e2", "e3", "e4", "e6", "e5"],
        hint: "Everything before the equals sign is the left side, everything after is the right side.",
      },
    },
    {
      title: "Build: 5y - 4 = 3y + 10",
      difficulty: "hard",
      order_index: 2,
      payload: {
        scrambled_pieces: [
          { id: "f4", label: "3y" },
          { id: "f1", label: "5y" },
          { id: "f6", label: "10" },
          { id: "f3", label: "=" },
          { id: "f2", label: "- 4" },
          { id: "f5", label: "+" },
        ],
        correct_order: ["f1", "f2", "f3", "f4", "f5", "f6"],
        hint: "Keep the subtraction and addition attached to the term that follows them, in order.",
      },
    },
  ];

  for (const challenge of equationChallenges) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_BUILDER",
      title: challenge.title,
    });
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

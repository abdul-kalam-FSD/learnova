require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 10 currently has no Mathematics content. Reuses
// the existing MATH_EQUATION_BUILDER mechanic (same ordered-pieces
// check as the Grade 6/9 versions — see seedMathGrade9.js) with the
// natural next NCERT Class 10 topic after Grade 9's linear equations:
// quadratic equations in standard form.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 10, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 10 });
    console.log("Created new Grade 10 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Quadratic Equations" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Quadratic Equations",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Standard Form of a Quadratic Equation" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Standard Form of a Quadratic Equation",
      explanation_text:
        "A quadratic equation written in standard form always follows the same order: the squared term first, then the linear term, then the constant, set equal to zero — ax\u00B2 + bx + c = 0. Rearranging an equation into this form is a separate step from actually solving it, and getting the term order right matters before you can factor or apply the quadratic formula.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same as Grade 6/9's Equation Builder —
  // `scrambled_pieces` shuffled, `correct_order` (stripped before
  // the client sees it) is the true left-to-right order of the
  // equation's pieces in standard form.
  const equationChallenges = [
    {
      title: "Build: x\u00B2 - 5x + 6 = 0",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scrambled_pieces: [
          { id: "l3", label: "= 0" },
          { id: "l1", label: "x\u00B2" },
          { id: "l2", label: "- 5x + 6" },
        ],
        correct_order: ["l1", "l2", "l3"],
        hint: "Standard form always starts with the squared term, then the linear and constant terms, then '= 0'.",
      },
    },
    {
      title: "Build: 2x\u00B2 + 3x - 5 = 0",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scrambled_pieces: [
          { id: "m2", label: "+ 3x - 5" },
          { id: "m3", label: "= 0" },
          { id: "m1", label: "2x\u00B2" },
        ],
        correct_order: ["m1", "m2", "m3"],
        hint: "The coefficient stays attached to its squared term, and that term still comes first.",
      },
    },
    {
      title: "Build: x\u00B2 - 9 = 0 (from x\u00B2 = 9)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scrambled_pieces: [
          { id: "n3", label: "= 0" },
          { id: "n1", label: "x\u00B2" },
          { id: "n2", label: "- 9" },
        ],
        correct_order: ["n1", "n2", "n3"],
        hint: "Move the 9 to the other side first — standard form always has zero on the right.",
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

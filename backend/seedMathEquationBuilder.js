require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Second Math mechanic (Section 18: multiple mechanics per topic).
// Reuses the existing Grade 6 Mathematics subject from
// seedMathGrade6.js, but its own chapter/concept — this is algebra
// syntax, not fractions.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 7 });
    console.log("Created new Grade 6 Mathematics subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Simple Equations" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algebra",
      title: "Simple Equations",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading and Writing Equations" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading and Writing Equations",
      explanation_text:
        "An equation is a statement that two expressions are equal, written left to right with an equals sign in the middle. The order of the pieces matters — 'x + 5 = 12' and '5 = x + 12' are not the same statement.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `scrambled_pieces` shown to the student in shuffled
  // order; student places them into slots left-to-right; `correct_order`
  // is the piece-id sequence that reads as a valid equation.
  const equationChallenges = [
    {
      title: "Build: x + 5 = 12",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scrambled_pieces: [
          { id: "e1", label: "12" },
          { id: "e2", label: "x" },
          { id: "e3", label: "=" },
          { id: "e4", label: "+" },
          { id: "e5", label: "5" },
        ],
        correct_order: ["e2", "e4", "e5", "e3", "e1"],
        hint: "Start with the unknown 'x', then the operation, then what it equals.",
      },
    },
    {
      title: "Build: 2 + y = 9",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scrambled_pieces: [
          { id: "f1", label: "y" },
          { id: "f2", label: "9" },
          { id: "f3", label: "=" },
          { id: "f4", label: "2" },
          { id: "f5", label: "+" },
        ],
        correct_order: ["f4", "f5", "f1", "f3", "f2"],
        hint: "The number can come before the letter too — read the sentence version first.",
      },
    },
    {
      title: "Build: n - 4 = 6",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scrambled_pieces: [
          { id: "g1", label: "6" },
          { id: "g2", label: "-" },
          { id: "g3", label: "n" },
          { id: "g4", label: "=" },
          { id: "g5", label: "4" },
        ],
        correct_order: ["g3", "g2", "g5", "g4", "g1"],
        hint: "Subtraction order matters — 'n - 4' is not the same as '4 - n'.",
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

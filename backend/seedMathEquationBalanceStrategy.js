require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fifth mechanic for the "Simple Equations" topic (doc's MATH STRATEGY
// CHALLENGE — limited moves, must choose the optimal solution — same
// idea Fraction Strategy Challenge used for Fractions, applied here to
// balancing an equation instead of picking fraction pieces). Reuses
// the existing Grade 7 Mathematics subject + Simple Equations chapter,
// its own concept: this is about *choosing the right operations in the
// right order*, distinct from Number Machine (just dial in the final
// answer) and Equation Speed Calculation (same, but timed).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: /mathematics|math/i });
  if (!subject) {
    subject = await Subject.create({ name: "Mathematics", grade: 7 });
    console.log("Created new Grade 7 Mathematics subject:", subject._id);
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

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Balancing Both Sides" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Balancing Both Sides",
      explanation_text:
        "Whatever you do to one side of an equation, you must do to the other — and doing it in the right order gets you to x in the fewest steps.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `initial_equation` is {a, b, c} meaning "a*x + b = c"
  // (client only needs `equation_label` to display it — the a/b/c
  // triple drives the real check server-side, see checkAttempt's
  // MATH_EQUATION_BALANCE_STRATEGY branch). `available_ops` includes
  // decoy operations that would NOT reduce to "1x + 0 = c" within
  // max_moves. There's no stored "correct sequence" at all — any
  // sequence that actually balances the equation within budget passes.
  const balanceLevels = [
    {
      title: "Balance: 2x + 3 = 11",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "2x + 3 = 11",
        initial_equation: { a: 2, b: 3, c: 11 },
        max_moves: 2,
        hint: "Undo the +3 first, then undo the ×2 — order matters.",
        available_ops: [
          { id: "op1", op: "subtract", value: 3, label: "−3 both sides" },
          { id: "op2", op: "divide", value: 2, label: "÷2 both sides" },
          { id: "op3", op: "add", value: 3, label: "+3 both sides" },
          { id: "op4", op: "multiply", value: 2, label: "×2 both sides" },
        ],
      },
    },
    {
      title: "Balance: 3x − 4 = 11",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "3x − 4 = 11",
        initial_equation: { a: 3, b: -4, c: 11 },
        max_moves: 2,
        hint: "Undo the −4 by adding, then undo the ×3 by dividing.",
        available_ops: [
          { id: "op1", op: "add", value: 4, label: "+4 both sides" },
          { id: "op2", op: "divide", value: 3, label: "÷3 both sides" },
          { id: "op3", op: "subtract", value: 4, label: "−4 both sides" },
          { id: "op4", op: "multiply", value: 3, label: "×3 both sides" },
        ],
      },
    },
    {
      title: "Balance: x/2 + 4 = 10",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label: "x/2 + 4 = 10",
        initial_equation: { a: 0.5, b: 4, c: 10 },
        max_moves: 2,
        hint: "Undo the +4 first, then undo the ÷2 by multiplying.",
        available_ops: [
          { id: "op1", op: "subtract", value: 4, label: "−4 both sides" },
          { id: "op2", op: "multiply", value: 2, label: "×2 both sides" },
          { id: "op3", op: "add", value: 4, label: "+4 both sides" },
          { id: "op4", op: "divide", value: 2, label: "÷2 both sides" },
        ],
      },
    },
  ];

  for (const level of balanceLevels) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_BALANCE_STRATEGY",
      title: level.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_BALANCE_STRATEGY",
        concept_id: concept._id,
        title: level.title,
        difficulty: level.difficulty,
        order_index: level.order_index,
        payload: level.payload,
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

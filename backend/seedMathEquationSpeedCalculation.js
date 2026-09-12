require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Third mechanic for the "Simple Equations" topic (doc's SPEED
// CALCULATION — "short timed calculation challenge"). Equation
// Builder covers syntax, Number Machine covers solving one equation
// carefully; this is rapid-fire mixed practice once the skill is
// familiar, under a per-question timer. Reuses the existing Grade 6
// Mathematics subject + Simple Equations chapter, its own concept
// since "solve quickly under time pressure" is a different objective
// than either of the other two.
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

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Fast Equation Solving" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Fast Equation Solving",
      explanation_text:
        "Once you can solve an equation carefully, practice doing it quickly — the same undo-the-operation approach, just faster.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // Same batch-of-questions payload shape as the Fraction rounds
  // (reuses MULTI_QUESTION_GAME_TYPES / checkMultiQuestionAttempt),
  // but each question is typed-number (`correct_answer`) instead of
  // multiple-choice (`correct_option_id`) — checkMultiQuestionAttempt
  // now handles both shapes.
  const speedRounds = [
    {
      title: "Speed Round: Warm-Up",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 10,
        hint: "Undo the operation — subtract what's added, divide what's multiplied.",
        questions: [
          { id: "q1", equation_label: "x + 3 = 9", correct_answer: 6 },
          { id: "q2", equation_label: "n - 2 = 5", correct_answer: 7 },
          { id: "q3", equation_label: "2y = 10", correct_answer: 5 },
          { id: "q4", equation_label: "a + 7 = 12", correct_answer: 5 },
          { id: "q5", equation_label: "b - 4 = 6", correct_answer: 10 },
        ],
      },
    },
    {
      title: "Speed Round: Mixed Operations",
      difficulty: "medium",
      order_index: 2,
      payload: {
        time_limit_seconds: 8,
        hint: "Watch the operator carefully — + and × undo differently.",
        questions: [
          { id: "q1", equation_label: "4x = 24", correct_answer: 6 },
          { id: "q2", equation_label: "n + 9 = 15", correct_answer: 6 },
          { id: "q3", equation_label: "y - 5 = 3", correct_answer: 8 },
          { id: "q4", equation_label: "3a = 21", correct_answer: 7 },
          { id: "q5", equation_label: "b + 6 = 14", correct_answer: 8 },
          { id: "q6", equation_label: "c - 8 = 2", correct_answer: 10 },
        ],
      },
    },
  ];

  for (const round of speedRounds) {
    const exists = await GameContent.findOne({
      game_type: "MATH_EQUATION_SPEED_CALCULATION",
      title: round.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_EQUATION_SPEED_CALCULATION",
        concept_id: concept._id,
        title: round.title,
        difficulty: round.difficulty,
        order_index: round.order_index,
        payload: round.payload,
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

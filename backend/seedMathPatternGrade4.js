require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 3
// "Pattern Around Us" — identifying, extending and creating number
// and shape patterns). Reuses MATH_NUMBER_MACHINE's numeric
// dial-answer mechanic (same as the Grade 6-11 versions) — finding
// the next number in a pattern is exactly the "give the one right
// number" interaction the Number Machine already does. No new
// mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Pattern Around Us" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Pattern Around Us",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Finding and Extending Number Patterns" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Finding and Extending Number Patterns",
      explanation_text:
        "A pattern is a sequence that follows a rule you can spot by looking at how each number changes from the one before it. Once you find the rule — like 'add 3 each time' or 'double each time' — you can use it to work out what comes next, even far beyond the numbers you were given.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const machineLevels = [
    {
      title: "Machine: Counting by 3s",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "The pattern is 3, 6, 9, 12, ___. What comes next?",
        dial_min: 0,
        dial_max: 30,
        correct_answer: 15,
        hint: "Each number is 3 more than the one before it.",
      },
    },
    {
      title: "Machine: A Shrinking Pattern",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "The pattern is 40, 35, 30, 25, ___. What comes next?",
        dial_min: 0,
        dial_max: 50,
        correct_answer: 20,
        hint: "This pattern goes down by the same amount each time — find that amount first.",
      },
    },
    {
      title: "Machine: A Doubling Pattern",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label: "The pattern is 2, 4, 8, 16, ___. What comes next?",
        dial_min: 0,
        dial_max: 60,
        correct_answer: 32,
        hint: "This isn't adding the same number each time — check whether each number is related to the last by multiplying.",
      },
    },
  ];

  for (const level of machineLevels) {
    const exists = await GameContent.findOne({ game_type: "MATH_NUMBER_MACHINE", title: level.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "MATH_NUMBER_MACHINE",
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

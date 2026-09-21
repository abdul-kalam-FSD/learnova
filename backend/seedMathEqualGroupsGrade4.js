require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 9
// "Equal Groups" — multiplication built up from repeated equal
// groups, the counterpart to Chapter 5's equal-sharing division).
// Reuses MATH_NUMBER_MACHINE's numeric dial-answer mechanic. No new
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Equal Groups" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Equal Groups",
      order_index: 9,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Multiplication as Equal Groups" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Multiplication as Equal Groups",
      explanation_text:
        "Multiplication is a fast way to add the same number again and again. If there are 6 boxes with 4 apples in each box, instead of adding 4+4+4+4+4+4, you can multiply 6 times 4 to get 24 apples straightaway. The two numbers being multiplied are the number of equal groups and the amount in each group.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const machineLevels = [
    {
      title: "Machine: Boxes of Apples",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "There are 6 boxes with 4 apples in each box. How many apples in total?",
        dial_min: 0,
        dial_max: 40,
        correct_answer: 24,
        hint: "Multiply the number of boxes by the number of apples in each box.",
      },
    },
    {
      title: "Machine: Rows of Chairs",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "A hall has 8 rows of chairs, with 9 chairs in each row. How many chairs in total?",
        dial_min: 0,
        dial_max: 100,
        correct_answer: 72,
        hint: "8 rows times 9 chairs in each row.",
      },
    },
    {
      title: "Machine: Packs of Pencils",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label: "A shop has 12 packs of pencils, with 7 pencils in each pack. How many pencils in total?",
        dial_min: 0,
        dial_max: 120,
        correct_answer: 84,
        hint: "Break 12 into 10 + 2, multiply each part by 7, then add the results together.",
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

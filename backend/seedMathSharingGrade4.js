require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Maths Mela Chapter 5
// "Sharing and Measuring" — equal sharing/division and an intro to
// measurement). Reuses MATH_NUMBER_MACHINE's numeric dial-answer
// mechanic for the sharing/division part — the same one-right-number
// interaction used for the Pattern chapter. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Sharing and Measuring" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Maths Mela",
      title: "Sharing and Measuring",
      order_index: 5,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Equal Sharing and Simple Division" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Equal Sharing and Simple Division",
      explanation_text:
        "Sharing something equally among a group is division. If 12 sweets are shared equally among 4 children, each child gets 12 divided by 4, which is 3 sweets. The total amount stays the same — only how many equal groups it's split into changes how much each group gets.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const machineLevels = [
    {
      title: "Machine: Sharing Sweets Equally",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "12 sweets are shared equally among 4 children. How many sweets does each child get?",
        dial_min: 0,
        dial_max: 15,
        correct_answer: 3,
        hint: "Divide the total number of sweets by the number of children.",
      },
    },
    {
      title: "Machine: Sharing Pencils in Groups",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "24 pencils are packed equally into 6 boxes. How many pencils go in each box?",
        dial_min: 0,
        dial_max: 30,
        correct_answer: 4,
        hint: "Divide the total number of pencils by the number of boxes.",
      },
    },
    {
      title: "Machine: Sharing Leftover Amounts",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label: "35 mangoes are shared equally among 5 baskets. How many mangoes go in each basket?",
        dial_min: 0,
        dial_max: 40,
        correct_answer: 7,
        hint: "Try dividing 35 by 5 — think of groups of 5 counted up to 35.",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 second mechanic: reuses the existing "Loops with a Decision
// Inside" chapter from seedCSGrade7.js, adds a new Concept +
// CS_CODE_ORDER_BUILDER content — building a correct REPEAT-with-IF
// sequence instead of spotting a wrong IF condition inside a loop.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: /computer science/i });
  if (!subject) {
    throw new Error("Grade 7 Computer Science subject not found — run seedCSGrade7.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Loops with a Decision Inside" });
  if (!chapter) {
    throw new Error("Chapter 'Loops with a Decision Inside' not found — run seedCSGrade7.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Loop with a Decision Inside" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Loop with a Decision Inside",
      explanation_text:
        "When a decision has to be made on every repeat, the REPEAT line comes first, and the IF checks belong inside it — checked fresh for each item, not written before the loop starts.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const orderChallenges = [
    {
      title: "Order: Sorting Books by Size",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines to sort every book on the shelf by size using a loop with a decision inside.",
        scrambled_lines: [
          { id: "a2", label: "  IF the book is large, THEN put it in the large pile" },
          { id: "a1", label: "REPEAT for every book on the shelf:" },
          { id: "a3", label: "  IF the book is small, THEN put it in the small pile" },
        ],
        correct_order: ["a1", "a2", "a3"],
        hint: "The loop has to start before any single book can be checked and sorted.",
      },
    },
    {
      title: "Order: Grading Quiz Answers",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines to grade every answer on the quiz using a loop with a decision inside.",
        scrambled_lines: [
          { id: "b3", label: "  IF the answer does not match the answer key, THEN mark it wrong" },
          { id: "b1", label: "REPEAT for every answer on the quiz:" },
          { id: "b2", label: "  IF the answer matches the answer key, THEN mark it correct" },
        ],
        correct_order: ["b1", "b2", "b3"],
        hint: "Each answer has to be reached by the loop before it can be compared to the answer key.",
      },
    },
    {
      title: "Order: Watering Plants by Dryness",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines to water every plant that needs it, using a loop with a decision inside.",
        scrambled_lines: [
          { id: "c2", label: "  CHECK if the soil feels dry" },
          { id: "c1", label: "REPEAT for every plant in the garden:" },
          { id: "c3", label: "  IF the soil feels dry, THEN water the plant" },
        ],
        correct_order: ["c1", "c2", "c3"],
        hint: "The soil has to be checked before the program can decide whether to water that plant.",
      },
    },
  ];

  for (const challenge of orderChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CS_CODE_ORDER_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_CODE_ORDER_BUILDER",
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

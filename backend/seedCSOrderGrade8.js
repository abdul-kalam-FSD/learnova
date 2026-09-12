require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 8 second mechanic: reuses the existing "Programming
// Fundamentals" chapter from seedCSGrade8.js, adds a new Concept +
// CS_CODE_ORDER_BUILDER content — building correct SET/IF/FOR
// pseudocode algorithms from scratch instead of spotting a bug in one.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 8, name: /computer science/i });
  if (!subject) {
    throw new Error("Grade 8 Computer Science subject not found — run seedCSGrade8.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Programming Fundamentals" });
  if (!chapter) {
    throw new Error("Chapter 'Programming Fundamentals' not found — run seedCSGrade8.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building Algorithms in the Right Order" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building Algorithms in the Right Order",
      explanation_text:
        "An algorithm's lines have to run in an order that makes sense: a variable must be SET before it's compared or printed, and a FOR loop must be started before anything inside it can run.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const orderChallenges = [
    {
      title: "Order: Find the Largest of Three",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines to correctly find the largest of a, b and c.",
        scrambled_lines: [
          { id: "a3", label: "PRINT max" },
          { id: "a1", label: "SET max = a" },
          { id: "a2", label: "IF b > max THEN SET max = b" },
        ],
        correct_order: ["a1", "a2", "a3"],
        hint: "max needs a starting value before it can be compared to anything, and everything has to be decided before it's printed.",
      },
    },
    {
      title: "Order: Swap Two Variables",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines to correctly swap the values of x and y using a temporary variable.",
        scrambled_lines: [
          { id: "b3", label: "SET x = y" },
          { id: "b1", label: "SET temp = x" },
          { id: "b4", label: "SET y = temp" },
        ],
        correct_order: ["b1", "b3", "b4"],
        hint: "x's original value must be saved in temp before x gets overwritten, or it's lost for good.",
      },
    },
    {
      title: "Order: Sum of a List",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines to correctly add up every number in a list.",
        scrambled_lines: [
          { id: "c4", label: "PRINT total" },
          { id: "c1", label: "SET total = 0" },
          { id: "c3", label: "  SET total = total + number" },
          { id: "c2", label: "FOR each number IN list" },
        ],
        correct_order: ["c1", "c2", "c3", "c4"],
        hint: "total must start at 0 before the loop begins, and the loop must finish adding every number before the total is printed.",
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

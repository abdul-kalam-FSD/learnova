require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 10 second mechanic: reuses the existing "Functions and
// Parameters" chapter from seedCSGrade10.js, adds a new Concept +
// CS_CODE_ORDER_BUILDER content — building a correct parameterised
// function from scrambled lines instead of spotting a wrong line in one.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /computer science/i });
  if (!subject) {
    throw new Error("Grade 10 Computer Science subject not found — run seedCSGrade10.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Functions and Parameters" });
  if (!chapter) {
    throw new Error("Chapter 'Functions and Parameters' not found — run seedCSGrade10.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Function with Parameters" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Function with Parameters",
      explanation_text:
        "A function that takes parameters still has to do its calculation before it returns a result — and any IF check that decides the answer has to run before the RETURN that depends on it.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const orderChallenges = [
    {
      title: "Build: Function to Calculate Area",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines to build a function that correctly returns the area of a rectangle.",
        scrambled_lines: [
          { id: "a2", label: "  SET area = length * width" },
          { id: "a1", label: "FUNCTION calculateArea(length, width):" },
          { id: "a3", label: "  RETURN area" },
        ],
        correct_order: ["a1", "a2", "a3"],
        hint: "area has to be calculated from length and width before it can be returned.",
      },
    },
    {
      title: "Build: Function to Find the Average",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines to build a function that correctly returns the average of a and b.",
        scrambled_lines: [
          { id: "b3", label: "  RETURN total / 2" },
          { id: "b1", label: "FUNCTION calculateAverage(a, b):" },
          { id: "b2", label: "  SET total = a + b" },
        ],
        correct_order: ["b1", "b2", "b3"],
        hint: "The numbers have to be added into total first, then divided, before the average can be returned.",
      },
    },
    {
      title: "Build: Function to Check if a Number is Even",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines to build a function that correctly returns TRUE if a number is even, and FALSE otherwise.",
        scrambled_lines: [
          { id: "c4", label: "  IF remainder is not 0, THEN RETURN FALSE" },
          { id: "c1", label: "FUNCTION isEven(number):" },
          { id: "c2", label: "  SET remainder = number MOD 2" },
          { id: "c3", label: "  IF remainder is 0, THEN RETURN TRUE" },
        ],
        correct_order: ["c1", "c2", "c3", "c4"],
        hint: "remainder has to be calculated before either IF check can use it, and both possible outcomes need their own RETURN.",
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

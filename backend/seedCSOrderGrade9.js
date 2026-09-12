require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 9 second mechanic: reuses the existing "Functions and Return
// Values" chapter from seedCSGrade9.js, adds a new Concept +
// CS_CODE_ORDER_BUILDER content — building a correct function from
// scrambled lines instead of spotting a wrong RETURN.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 9, name: /computer science/i });
  if (!subject) {
    throw new Error("Grade 9 Computer Science subject not found — run seedCSGrade9.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Functions and Return Values" });
  if (!chapter) {
    throw new Error("Chapter 'Functions and Return Values' not found — run seedCSGrade9.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Function That Returns the Right Value" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Function That Returns the Right Value",
      explanation_text:
        "A function has to do its work — setting or checking values — before it can RETURN the right one, and it always needs FUNCTION and END FUNCTION as its first and last lines.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const orderChallenges = [
    {
      title: "Build: Function to Double a Number",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these lines to build a function that correctly returns double the value of n.",
        scrambled_lines: [
          { id: "a3", label: "RETURN result" },
          { id: "a1", label: "FUNCTION double(n)" },
          { id: "a4", label: "END FUNCTION" },
          { id: "a2", label: "SET result = n + n" },
        ],
        correct_order: ["a1", "a2", "a3", "a4"],
        hint: "result has to be calculated before it can be returned, and END FUNCTION always comes last.",
      },
    },
    {
      title: "Build: Function to Find the Average",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these lines to build a function that correctly returns the average of a and b.",
        scrambled_lines: [
          { id: "b4", label: "END FUNCTION" },
          { id: "b1", label: "FUNCTION average(a, b)" },
          { id: "b3", label: "RETURN total / 2" },
          { id: "b2", label: "SET total = a + b" },
        ],
        correct_order: ["b1", "b2", "b3", "b4"],
        hint: "The numbers must be added together before their average can be worked out and returned.",
      },
    },
    {
      title: "Build: Function to Check for Even Numbers",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these lines to build a function that correctly returns TRUE if a number is even, and FALSE otherwise.",
        scrambled_lines: [
          { id: "c3", label: "  RETURN TRUE" },
          { id: "c1", label: "FUNCTION isEven(number)" },
          { id: "c5", label: "RETURN FALSE" },
          { id: "c2", label: "IF number MOD 2 == 0 THEN" },
          { id: "c4", label: "END IF" },
        ],
        correct_order: ["c1", "c2", "c3", "c4", "c5"],
        hint: "The IF check comes first; if it's true the function can return early, but a fallback RETURN FALSE is still needed for when it's false.",
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

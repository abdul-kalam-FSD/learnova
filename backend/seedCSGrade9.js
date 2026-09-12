require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass: Grade 9 previously had no Computer
// Science at all (CS otherwise exists at Grades 4-8). Sits above
// Grade 8's FOR-loop-with-IF-inside pseudocode (seedCSGrade8.js):
// introduces functions with parameters and return values, a genuine
// step up from loop/condition debugging to reasoning about what a
// function actually hands back to whoever called it.
//
// Reuses CS_DEBUGGING_LAB (same single-choice "find the one wrong
// line" check as every earlier grade's version) — no code changes
// needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 9, name: /computer science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Computer Science", grade: 9 });
    console.log("Created new Grade 9 Computer Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Functions and Return Values" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algorithms",
      title: "Functions and Return Values",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Debugging What a Function Returns" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Debugging What a Function Returns",
      explanation_text:
        "A function takes some input, does its work, and hands back exactly one result with RETURN. A common bug is doing all the right work but returning the wrong variable — or returning too early, before the work is finished.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const debugChallenges = [
    {
      title: "Bug: Function to Double a Number",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This function should take a number and return double its value.",
        code_lines: [
          { id: "l1", code_text: "FUNCTION double(n)" },
          { id: "l2", code_text: "SET result = n + n" },
          { id: "l3", code_text: "RETURN n" },
          { id: "l4", code_text: "END FUNCTION" },
        ],
        correct_hotspot_id: "l3",
        hint: "The function calculated the right value and stored it in `result` — but which variable does it actually return?",
      },
    },
    {
      title: "Bug: Function to Find the Average",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This function should return the average of two numbers, a and b.",
        code_lines: [
          { id: "m1", code_text: "FUNCTION average(a, b)" },
          { id: "m2", code_text: "SET total = a + b" },
          { id: "m3", code_text: "RETURN total" },
          { id: "m4", code_text: "END FUNCTION" },
        ],
        correct_hotspot_id: "m3",
        hint: "An average needs one more step after adding the numbers together — does this return the total, or the average?",
      },
    },
    {
      title: "Bug: Function to Check for Even Numbers",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This function should return TRUE if a number is even, and FALSE otherwise.",
        code_lines: [
          { id: "n1", code_text: "FUNCTION isEven(number)" },
          { id: "n2", code_text: "IF number MOD 2 == 0 THEN" },
          { id: "n3", code_text: "RETURN TRUE" },
          { id: "n4", code_text: "END IF" },
          { id: "n5", code_text: "RETURN TRUE" },
          { id: "n6", code_text: "END FUNCTION" },
        ],
        correct_hotspot_id: "n5",
        hint: "If the number is odd, the IF block is skipped entirely — what should the function return in that case?",
      },
    },
  ];

  for (const challenge of debugChallenges) {
    const exists = await GameContent.findOne({
      game_type: "CS_DEBUGGING_LAB",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CS_DEBUGGING_LAB",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// First Computer Science vertical slice — the last of Section 27's
// eight target subjects. Debugging Lab reuses the exact same
// single-choice check as BIO_VIRTUAL_LAB (see checkAttempt in
// gameControllers.js): tapping the one buggy line among several is
// the same "did they pick the correct id" logic as tapping the
// correct microscope hotspot, just a BUILD/DEBUG/LOGIC fantasy
// instead of a lab specimen (Section 30).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 8, name: /computer science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Computer Science", grade: 8 });
    console.log("Created new Grade 8 Computer Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Programming Fundamentals" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algorithms",
      title: "Programming Fundamentals",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Debugging Algorithms" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Debugging Algorithms",
      explanation_text:
        "Debugging means tracing an algorithm step by step to find where its logic breaks the intended result — often a single wrong comparison, an unswapped variable, or a loop that starts or ends on the wrong value.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `code_lines` is the full pseudocode listing;
  // `correct_hotspot_id` (stripped before the client sees it) names
  // the one line id that contains the actual bug.
  const debugChallenges = [
    {
      title: "Bug: Find the Largest of Three",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "This should print the largest of a, b, and c — but it doesn't always.",
        code_lines: [
          { id: "l1", code_text: "SET max = a" },
          { id: "l2", code_text: "IF b > max THEN SET max = a" },
          { id: "l3", code_text: "IF c > max THEN SET max = c" },
          { id: "l4", code_text: "PRINT max" },
        ],
        correct_hotspot_id: "l2",
        hint: "Look at what each comparison actually assigns when it's true — does it assign the value it just compared?",
      },
    },
    {
      title: "Bug: Swap Two Variables",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "This should swap the values of x and y using a temporary variable.",
        code_lines: [
          { id: "m1", code_text: "SET temp = x" },
          { id: "m2", code_text: "SET x = y" },
          { id: "m3", code_text: "SET y = x" },
        ],
        correct_hotspot_id: "m3",
        hint: "By the time this line runs, does the original value of x still exist anywhere?",
      },
    },
    {
      title: "Bug: Sum of a List",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "This should add up every number in the list and print the total.",
        code_lines: [
          { id: "n1", code_text: "SET total = 0" },
          { id: "n2", code_text: "FOR each number IN list" },
          { id: "n3", code_text: "SET total = number" },
          { id: "n4", code_text: "END FOR" },
          { id: "n5", code_text: "PRINT total" },
        ],
        correct_hotspot_id: "n3",
        hint: "Adding up a running total means each step should build on the previous total, not replace it.",
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

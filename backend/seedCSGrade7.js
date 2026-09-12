require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 7 currently has no Computer Science content.
// Sits between Grade 6's plain IF version (seedCSGrade6.js) and
// Grade 8's real-pseudocode version (seedCSGrade8.js): combines a
// REPEAT loop with an IF check inside it — still "unplugged" plain-
// English steps, but now two constructs interacting, the natural
// bridge toward Grade 8's FOR-loop-with-IF-inside pseudocode.
//
// Reuses CS_DEBUGGING_LAB (same single-choice "find the one wrong
// line" check as the Grade 4/5/6/8 versions).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: /computer science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Computer Science", grade: 7 });
    console.log("Created new Grade 7 Computer Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Loops with a Decision Inside" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Algorithms",
      title: "Loops with a Decision Inside",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Checking a Condition on Every Repeat" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Checking a Condition on Every Repeat",
      explanation_text:
        "When an IF check sits inside a REPEAT block, that check runs again on every single repeat — not just once. If a step inside the loop tests the wrong condition, or does the wrong thing when the condition is true, the mistake happens every time the loop repeats, not just once.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const debugChallenges = [
    {
      title: "Bug: Sorting Books by Size",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "These steps should put each book into a 'large' or 'small' pile as you go through the shelf — but one step inside the loop is wrong.",
        code_lines: [
          { id: "l1", code_text: "REPEAT for every book on the shelf:" },
          { id: "l2", code_text: "  IF the book is large, THEN put it in the large pile" },
          { id: "l3", code_text: "  IF the book is small, THEN put it in the large pile" },
        ],
        correct_hotspot_id: "l3",
        hint: "Should a small book end up in the same pile as a large one?",
      },
    },
    {
      title: "Bug: Grading Quiz Answers",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "These steps should mark each answer correct or wrong as you check the whole quiz — but one step inside the loop is wrong.",
        code_lines: [
          { id: "m1", code_text: "REPEAT for every answer on the quiz:" },
          { id: "m2", code_text: "  IF the answer matches the answer key, THEN mark it correct" },
          { id: "m3", code_text: "  IF the answer does not match the answer key, THEN mark it correct" },
        ],
        correct_hotspot_id: "m3",
        hint: "If an answer doesn't match the key, should it really be marked correct?",
      },
    },
    {
      title: "Bug: Watering Plants by Dryness",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "These steps should check each plant in the garden and water only the dry ones — but one step inside the loop checks the wrong thing.",
        code_lines: [
          { id: "n1", code_text: "REPEAT for every plant in the garden:" },
          { id: "n2", code_text: "  IF the soil feels dry, THEN water the plant" },
          { id: "n3", code_text: "  IF the plant looks tall, THEN water the plant" },
        ],
        correct_hotspot_id: "n3",
        hint: "Does a plant's height actually tell you whether it needs water right now?",
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

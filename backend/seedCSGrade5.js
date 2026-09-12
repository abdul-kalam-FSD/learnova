require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 5 currently has no Computer Science content at
// all. This sits between Grade 4's plain ordered-steps version
// (seedCSGrade4.js) and Grade 8's real-pseudocode version
// (seedCSGrade8.js): still "unplugged" (no real code), but
// introduces a REPEAT block — the standard next step after plain
// sequencing in CS-Unplugged-style curricula widely used in Indian
// schools at this age, ahead of real programming constructs.
//
// Reuses CS_DEBUGGING_LAB (same single-choice "find the one wrong
// line" check as the Grade 4/8 versions).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /computer science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Computer Science", grade: 5 });
    console.log("Created new Grade 5 Computer Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Repeating Steps with a Loop" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Thinking Like a Computer",
      title: "Repeating Steps with a Loop",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Spotting the Wrong Step in a Loop" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Spotting the Wrong Step in a Loop",
      explanation_text:
        "Instead of writing the same step over and over, we can use a REPEAT block to say 'do these steps several times.' A REPEAT block only works correctly if the steps inside it are the right ones, in the right order — one wrong or misplaced step inside the loop repeats the mistake every single time.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const debugChallenges = [
    {
      title: "Bug: Watering Five Plants",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "These steps should water 5 plants one at a time — but one step inside the REPEAT block is wrong.",
        code_lines: [
          { id: "l1", code_text: "REPEAT 5 times:" },
          { id: "l2", code_text: "  STEP: Walk to the next plant" },
          { id: "l3", code_text: "  STEP: Pour water into the pot" },
          { id: "l4", code_text: "  STEP: Empty the watering can onto the floor" },
        ],
        correct_hotspot_id: "l4",
        hint: "Would emptying the can onto the floor help water any plant?",
      },
    },
    {
      title: "Bug: Folding Ten Paper Boats",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "These steps should fold 10 paper boats — but one step inside the REPEAT block is out of order.",
        code_lines: [
          { id: "m1", code_text: "REPEAT 10 times:" },
          { id: "m2", code_text: "  STEP: Fold the paper into a boat shape" },
          { id: "m3", code_text: "  STEP: Take a new sheet of paper" },
          { id: "m4", code_text: "  STEP: Place the finished boat on the table" },
        ],
        correct_hotspot_id: "m2",
        hint: "Can you fold a boat shape before you've even taken the paper?",
      },
    },
    {
      title: "Bug: Practising Times Tables",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "These steps should let a student practise the 4 times table from 4x1 to 4x10 — but one step doesn't belong inside the REPEAT block.",
        code_lines: [
          { id: "n1", code_text: "REPEAT 10 times:" },
          { id: "n2", code_text: "  STEP: Say the next multiple of 4 out loud" },
          { id: "n3", code_text: "  STEP: Write the answer on paper" },
          { id: "n4", code_text: "  STEP: Close the notebook for the day" },
        ],
        correct_hotspot_id: "n4",
        hint: "This step only makes sense once, at the very end — not every single time through the loop.",
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

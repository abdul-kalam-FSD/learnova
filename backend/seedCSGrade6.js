require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 6 currently has no Computer Science content.
// Sits between Grade 5's REPEAT-block version (seedCSGrade5.js) and
// Grade 8's real-pseudocode version (seedCSGrade8.js): introduces
// IF/THEN conditional logic, still "unplugged" (plain-English steps,
// no variables yet) rather than real pseudocode.
//
// Reuses CS_DEBUGGING_LAB (same single-choice "find the one wrong
// line" check as the Grade 4/5/8 versions).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /computer science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Computer Science", grade: 6 });
    console.log("Created new Grade 6 Computer Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Making Decisions with IF" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Thinking Like a Computer",
      title: "Making Decisions with IF",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Spotting the Wrong Action in an IF Step" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Spotting the Wrong Action in an IF Step",
      explanation_text:
        "An IF step only carries out its action when its condition is true — 'IF it is raining, THEN take an umbrella.' If the action listed doesn't actually match or make sense for the condition, the instructions will tell you to do the wrong thing at the wrong time, even if every other step is fine.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const debugChallenges = [
    {
      title: "Bug: Getting Dressed for the Weather",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "These steps should help you dress correctly for the weather — but one IF step's action is wrong.",
        code_lines: [
          { id: "l1", code_text: "CHECK the weather outside" },
          { id: "l2", code_text: "IF it is raining, THEN wear sunglasses" },
          { id: "l3", code_text: "IF it is cold, THEN wear a jacket" },
          { id: "l4", code_text: "IF it is sunny, THEN wear sunglasses" },
        ],
        correct_hotspot_id: "l2",
        hint: "Would sunglasses actually help you on a rainy day?",
      },
    },
    {
      title: "Bug: Deciding What to Pack",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "These steps should help pack the right item for a school trip — but one IF step's action doesn't match its condition.",
        code_lines: [
          { id: "m1", code_text: "IF the trip is to the beach, THEN pack a swimsuit" },
          { id: "m2", code_text: "IF the trip is to the museum, THEN pack a swimsuit" },
          { id: "m3", code_text: "IF the trip is to the mountains, THEN pack a warm jacket" },
        ],
        correct_hotspot_id: "m2",
        hint: "Would you need a swimsuit for a museum visit?",
      },
    },
    {
      title: "Bug: Choosing a Snack",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "These steps should pick a snack based on how hungry you are — but one IF step's action is mismatched.",
        code_lines: [
          { id: "n1", code_text: "IF you are very hungry, THEN eat a full meal" },
          { id: "n2", code_text: "IF you are a little hungry, THEN eat a full meal" },
          { id: "n3", code_text: "IF you are not hungry at all, THEN eat nothing" },
        ],
        correct_hotspot_id: "n2",
        hint: "Should being 'a little' hungry lead to the same action as being 'very' hungry?",
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

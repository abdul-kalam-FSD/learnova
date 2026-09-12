require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 vertical slice. Reuses CS_DEBUGGING_LAB (same
// single-choice "find the one wrong line" check as the Grade 8
// pseudocode version), applied to "unplugged" everyday step lists
// instead of real pseudocode — a standard way computing is
// introduced before students can read code at all.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: /computer science/i });
  if (!subject) {
    subject = await Subject.create({ name: "Computer Science", grade: 4 });
    console.log("Created new Grade 4 Computer Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Following Steps in Order" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Thinking Like a Computer",
      title: "Following Steps in Order",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Spotting the Wrong Step" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Spotting the Wrong Step",
      explanation_text:
        "A set of instructions — like a computer program or a recipe — only works if every step is in the right place and makes sense. If one step is out of order or just wrong, the whole set of instructions breaks, even if every other step is correct.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const debugChallenges = [
    {
      title: "Bug: Getting Ready for School",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "These are the steps to get ready for school — but one step is in the wrong place.",
        code_lines: [
          { id: "l1", code_text: "STEP 1: Wake up" },
          { id: "l2", code_text: "STEP 2: Put on your school uniform" },
          { id: "l3", code_text: "STEP 3: Brush your teeth" },
          { id: "l4", code_text: "STEP 4: Eat breakfast" },
        ],
        correct_hotspot_id: "l2",
        hint: "Think about what you'd do right after eating breakfast — would you already be dressed by then?",
      },
    },
    {
      title: "Bug: Watering a Plant",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "These steps should water a plant — but one step doesn't make sense here.",
        code_lines: [
          { id: "m1", code_text: "STEP 1: Fill a watering can with water" },
          { id: "m2", code_text: "STEP 2: Walk to the plant" },
          { id: "m3", code_text: "STEP 3: Pour water into the pot" },
          { id: "m4", code_text: "STEP 4: Fill the watering can again" },
        ],
        correct_hotspot_id: "m4",
        hint: "Once you've already watered the plant, is there a reason to refill the can again right away?",
      },
    },
    {
      title: "Bug: Making a Sandwich",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "These steps should make a sandwich — but one step is out of order.",
        code_lines: [
          { id: "n1", code_text: "STEP 1: Get two slices of bread" },
          { id: "n2", code_text: "STEP 2: Put the two slices together" },
          { id: "n3", code_text: "STEP 3: Spread jam on one slice" },
          { id: "n4", code_text: "STEP 4: Place the sandwich on a plate" },
        ],
        correct_hotspot_id: "n2",
        hint: "Would spreading jam still make sense if the two slices are already stuck together?",
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

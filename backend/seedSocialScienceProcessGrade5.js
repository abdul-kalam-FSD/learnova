require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Social Science second mechanic for Grade 5: reuses the
// existing "Sharing What We Have Fairly" chapter from seedSocialScienceGrade5.js
// (currently SOCIAL_SCIENCE_CIVIC_DECISION only, a single-choice
// scenario pick), adds a new Concept + SOCIAL_SCIENCE_PROCESS_
// BUILDER content — arranging the steps of a real civic process
// into the order they actually happen. Reuses the generic order-
// family check in gameControllers.js (same orderedPieceIds ===
// correct_order rule as CS_CODE_ORDER_BUILDER / HISTORY_TIMELINE_
// BUILDER), no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: "EVS" });
  if (!subject) {
    throw new Error("Grade 5 Social Science subject not found — run seedSocialScienceGrade5.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Sharing What We Have Fairly" });
  if (!chapter) {
    throw new Error("Chapter 'Sharing What We Have Fairly' not found — run seedSocialScienceGrade5.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Putting Fair-Sharing Steps in the Right Order" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Putting Fair-Sharing Steps in the Right Order",
      explanation_text: "Sharing something fairly isn't just one decision — it's a process. You have to understand what's available and who needs it before you can actually divide it fairly.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const processChallenges = [
    {
      title: "Process: Sharing Classroom Supplies Fairly",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order you would fairly share classroom supplies.",
        scrambled_steps: [
          { id: "st4", label: "Ask the group what to do if the supplies don't divide evenly" },
          { id: "st3", label: "Divide the supplies as equally as possible among everyone" },
          { id: "st2", label: "Count how many supplies are actually available" },
          { id: "st1", label: "Count how many students need the shared supplies" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You need both counts — how many people and how many supplies — before you can even start dividing.",
      },
    },
    {
      title: "Process: Resolving a Disagreement Over a Shared Resource",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order you would resolve a disagreement fairly.",
        scrambled_steps: [
          { id: "st4", label: "Check if everyone accepts the solution before moving on" },
          { id: "st3", label: "Suggest a solution that gives each side a fair share" },
          { id: "st2", label: "Identify what both sides actually agree on" },
          { id: "st1", label: "Listen carefully to what each side wants and why" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You can't propose a fair solution until you've actually listened to both sides first.",
      },
    },
    {
      title: "Process: Planning a Fair Water-Sharing Schedule",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order you would plan a fair water-sharing schedule for a village.",
        scrambled_steps: [
          { id: "st4", label: "Adjust the schedule if the water supply changes with the seasons" },
          { id: "st3", label: "Create a fair schedule so every group gets a turn" },
          { id: "st2", label: "List every family or group that needs water from the same source" },
          { id: "st1", label: "Find out how much water the village actually has available" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You have to know the total supply and every group's need before you can build a schedule — and a schedule can only be adjusted once it already exists.",
      },
    },
  ];

  for (const challenge of processChallenges) {
    const exists = await GameContent.findOne({
      game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER",
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

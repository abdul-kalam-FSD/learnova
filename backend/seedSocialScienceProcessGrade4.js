require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Social Science second mechanic for Grade 4: reuses the
// existing "Being a Good Citizen" chapter from seedSocialScienceGrade4.js
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

  const subject = await Subject.findOne({ grade: 4, name: /social science/i });
  if (!subject) {
    throw new Error("Grade 4 Social Science subject not found — run seedSocialScienceGrade4.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Being a Good Citizen" });
  if (!chapter) {
    throw new Error("Chapter 'Being a Good Citizen' not found — run seedSocialScienceGrade4.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Putting Good Citizenship Steps in the Right Order" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Putting Good Citizenship Steps in the Right Order",
      explanation_text: "Being a good citizen often means taking a series of steps, not just one action. Noticing a problem comes before reporting it, and asking before acting comes before doing something on your own.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const processChallenges = [
    {
      title: "Process: Helping a Lost Classmate",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order you would actually help a lost classmate.",
        scrambled_steps: [
          { id: "st4", label: "Tell a teacher if you're still not sure where they need to go" },
          { id: "st3", label: "Walk with them to the right classroom or office" },
          { id: "st2", label: "Politely ask if they need help finding their way" },
          { id: "st1", label: "Notice that a classmate looks lost and worried" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You can't offer to help until you've noticed there's a problem in the first place.",
      },
    },
    {
      title: "Process: Organizing a Class Cleanup",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order you would organize a class cleanup.",
        scrambled_steps: [
          { id: "st4", label: "Put all the cleaning tools back where they belong" },
          { id: "st3", label: "Collect the trash and recyclables separately" },
          { id: "st2", label: "Divide the classroom into small areas for different groups" },
          { id: "st1", label: "Ask the teacher for permission to clean up the classroom area" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Permission has to come first, and putting tools away is always the very last step.",
      },
    },
    {
      title: "Process: Reporting a Broken Streetlight",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order you would report a broken streetlight.",
        scrambled_steps: [
          { id: "st4", label: "Ask them to report it to the local municipal office" },
          { id: "st3", label: "Tell a parent or guardian about what you noticed" },
          { id: "st2", label: "Note down the exact location or the nearest landmark" },
          { id: "st1", label: "Notice that a streetlight near your home is not working" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You need to know exactly where the problem is before you can tell anyone about it, and a child would ask an adult before contacting the municipal office directly.",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Social Science second mechanic for Grade 9: reuses the
// existing "Civics and Local Governance" chapter from seedSocialScienceGrade9.js
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

  const subject = await Subject.findOne({ grade: 9, name: /social science/i });
  if (!subject) {
    throw new Error("Grade 9 Social Science subject not found — run seedSocialScienceGrade9.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Civics and Local Governance" });
  if (!chapter) {
    throw new Error("Chapter 'Civics and Local Governance' not found — run seedSocialScienceGrade9.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Putting Local Governance Steps in the Right Order" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Putting Local Governance Steps in the Right Order",
      explanation_text: "Local governance decisions follow a formal process, not a single vote out of nowhere. A proposal has to be raised and discussed before it can be approved and acted on.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const processChallenges = [
    {
      title: "Process: How a Local Council Considers a New Proposal",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order a local council actually considers a new proposal.",
        scrambled_steps: [
          { id: "st4", label: "If approved, the local government implements the new rule or project" },
          { id: "st3", label: "Council members vote on whether to approve the proposal" },
          { id: "st2", label: "The council discusses the proposal in a public meeting" },
          { id: "st1", label: "A resident or council member proposes a new local rule or project" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "A proposal has to exist before it can be discussed, and it has to be approved before it can be implemented.",
      },
    },
    {
      title: "Process: How Citizens Can Raise a Local Issue",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order citizens would actually raise a local issue.",
        scrambled_steps: [
          { id: "st4", label: "Follow up to see what action the local government takes" },
          { id: "st3", label: "Present the issue formally to the local council or representative" },
          { id: "st2", label: "Gather support from other residents who share the concern" },
          { id: "st1", label: "Identify a specific problem affecting the local community" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You need a clear problem and community support before formally presenting it, and following up naturally comes last.",
      },
    },
    {
      title: "Process: How a Local Government Budget Gets Approved",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order a local government budget actually gets approved.",
        scrambled_steps: [
          { id: "st4", label: "The council votes to approve the final budget before it takes effect" },
          { id: "st3", label: "The council debates and adjusts the budget in public sessions" },
          { id: "st2", label: "The council reviews the requests against the total available revenue" },
          { id: "st1", label: "Local departments submit their funding requests for the coming year" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Requests have to be submitted before they can be reviewed, and debate and adjustment happen before the final vote.",
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

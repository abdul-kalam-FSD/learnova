require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Social Science second mechanic for Grade 10: reuses the
// existing "Protecting Consumer Rights" chapter from seedSocialScienceGrade10.js
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

  const subject = await Subject.findOne({ grade: 10, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 10 Social Science subject not found — run seedSocialScienceGrade10.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Protecting Consumer Rights" });
  if (!chapter) {
    throw new Error("Chapter 'Protecting Consumer Rights' not found — run seedSocialScienceGrade10.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Putting Consumer Rights Steps in the Right Order" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Putting Consumer Rights Steps in the Right Order",
      explanation_text: "Protecting your rights as a consumer follows a process too — most disputes should be resolved directly with the seller before they're escalated to a formal complaint or a consumer court.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const processChallenges = [
    {
      title: "Process: Filing a Simple Consumer Complaint",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order you would file a simple consumer complaint.",
        scrambled_steps: [
          { id: "st4", label: "Escalate to a consumer forum if the seller does not respond fairly" },
          { id: "st3", label: "Ask for a replacement, repair, or refund as appropriate" },
          { id: "st2", label: "Contact the seller or manufacturer to explain the problem" },
          { id: "st1", label: "Keep the receipt or proof of purchase for the faulty product" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You need proof of purchase before you can make a complaint, and escalating is always the last resort.",
      },
    },
    {
      title: "Process: Checking a Product Before Buying",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order you would sensibly check a product before buying it.",
        scrambled_steps: [
          { id: "st4", label: "Read the warranty or return policy before completing the purchase" },
          { id: "st3", label: "Compare the price with similar products from other sellers" },
          { id: "st2", label: "Look for a proper quality or safety certification mark" },
          { id: "st1", label: "Check the product's expiry date or manufacturing details" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Checking that the product is even safe and genuine comes first — the purchase decision itself comes only after all the checks.",
      },
    },
    {
      title: "Process: Taking a Complaint to a Consumer Court",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order you would actually take a complaint to a consumer court.",
        scrambled_steps: [
          { id: "st4", label: "Attend the hearing and present the evidence to support the complaint" },
          { id: "st3", label: "File a formal complaint with the appropriate consumer forum or court" },
          { id: "st2", label: "Gather all evidence, receipts and written communication about the issue" },
          { id: "st1", label: "Attempt to resolve the issue directly with the seller first" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Consumer courts expect you to have tried resolving the issue directly first, and you need your evidence gathered before you can file a formal complaint.",
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

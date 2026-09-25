require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Social Science second mechanic for Grade 6: reuses the
// existing "Understanding and Respecting Diversity" chapter from seedSocialScienceGrade6.js
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

  const subject = await Subject.findOne({ grade: 6, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 6 Social Science subject not found — run seedSocialScienceGrade6.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Unity in Diversity, or 'Many in the One'" });
  if (!chapter) {
    throw new Error("Chapter 'Understanding and Respecting Diversity' not found — run seedSocialScienceGrade6.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Putting Steps for Respecting Diversity in the Right Order" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Putting Steps for Respecting Diversity in the Right Order",
      explanation_text: "Respecting diversity in practice is a series of actions, not a single choice. Noticing and understanding usually come before responding, and responding comes before organizing something bigger.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const processChallenges = [
    {
      title: "Process: Welcoming a New Classmate",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these steps in the order you would welcome a new classmate from a different background.",
        scrambled_steps: [
          { id: "st4", label: "Ask them about their culture only if they seem happy to share" },
          { id: "st3", label: "Invite them to join your group during class activities" },
          { id: "st2", label: "Introduce yourself and ask about their interests" },
          { id: "st1", label: "Notice that a new classmate has just joined your class" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You have to notice someone is new before you can introduce yourself, and an invitation to your group naturally comes before deeper conversation.",
      },
    },
    {
      title: "Process: Responding to an Unkind Comment",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these steps in the order you would respond to an unkind comment about someone's culture.",
        scrambled_steps: [
          { id: "st4", label: "Tell a teacher if the unkind comments continue" },
          { id: "st3", label: "Support the classmate who was affected by the comment" },
          { id: "st2", label: "Calmly explain why the comment was not okay" },
          { id: "st1", label: "Recognize that the comment was hurtful or unfair" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "You need to recognize the harm before you can respond to it, and telling a teacher is a last step if the problem doesn't stop.",
      },
    },
    {
      title: "Process: Organizing an Inclusive Class Festival",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these steps in the order you would organize an inclusive class festival.",
        scrambled_steps: [
          { id: "st4", label: "Reflect as a class on what everyone learned from each other" },
          { id: "st3", label: "Make sure every student has a chance to participate, not just a few" },
          { id: "st2", label: "Plan activities or food that represent several different cultures fairly" },
          { id: "st1", label: "Ask classmates from different backgrounds what they'd like to share" },
        ],
        correct_order: ["st1","st2","st3","st4"],
        hint: "Planning has to be based on what people actually want to share, and reflection can only happen after the event itself.",
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

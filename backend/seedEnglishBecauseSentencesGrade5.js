require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 English — Decision A-1 (APPROVED): skill-based
// chapter inspired by Santoor Unit 4 "Ups and Downs" (Chapters 7-8,
// "Gilli Danda" and "The Decision of the Panchayat" — a village game
// story and a story about a community's fair decision-making).
// Transferable skill: building "because" cause-and-reason sentences,
// the language needed to explain why a decision was made — a genuine
// grammar/sentence-construction skill drawn from this unit's theme,
// not a comprehension quiz on the two specific stories.
//
// Reuses ENGLISH_SENTENCE_BUILDER. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 5 });
    console.log("Created new Grade 5 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Explaining Decisions with 'Because'" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Sentence Construction",
      title: "Explaining Decisions with 'Because'",
      order_index: 5,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building Cause-and-Reason Sentences with 'Because'" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building Cause-and-Reason Sentences with 'Because'",
      explanation_text:
        "'Because' joins a result to its reason in one sentence — 'The panchayat fined him because he broke the rule' tells you both what happened and why in a single, clear statement. The part before 'because' is the result or decision; the part after it explains the reason.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const becauseChallenges = [
    {
      title: "Build: The Team Lost Because They Broke a Rule",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered cause-and-reason sentence.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "team" },
          { id: "w3", label: "lost" },
          { id: "w4", label: "the" },
          { id: "w5", label: "game" },
          { id: "w6", label: "because" },
          { id: "w7", label: "they" },
          { id: "w8", label: "broke" },
          { id: "w9", label: "a" },
          { id: "w10", label: "rule." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10"],
        hint: "State the result first (they lost), then use 'because' to explain the reason.",
      },
    },
    {
      title: "Build: The Panchayat Made a Fair Decision Because Both Sides Were Heard",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered cause-and-reason sentence.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "panchayat" },
          { id: "w3", label: "made" },
          { id: "w4", label: "a" },
          { id: "w5", label: "fair" },
          { id: "w6", label: "decision" },
          { id: "w7", label: "because" },
          { id: "w8", label: "both" },
          { id: "w9", label: "sides" },
          { id: "w10", label: "were" },
          { id: "w11", label: "heard." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "The decision (result) comes first; the reason it was fair comes after 'because'.",
      },
    },
    {
      title: "Build: The Boy Practised Every Day Because He Wanted to Win",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered cause-and-reason sentence.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "boy" },
          { id: "w3", label: "practised" },
          { id: "w4", label: "gilli" },
          { id: "w5", label: "danda" },
          { id: "w6", label: "every" },
          { id: "w7", label: "day" },
          { id: "w8", label: "because" },
          { id: "w9", label: "he" },
          { id: "w10", label: "wanted" },
          { id: "w11", label: "to" },
          { id: "w12", label: "win." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12"],
        hint: "Keep the action and how often it happened together first ('practised...every day'), then explain why with 'because'.",
      },
    },
  ];

  for (const challenge of becauseChallenges) {
    const exists = await GameContent.findOne({ game_type: "ENGLISH_SENTENCE_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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

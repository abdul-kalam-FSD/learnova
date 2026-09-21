require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 5
// "The Old Stag", Unit 2 "My Beautiful World"). Content verified: a
// kind, popular old stag falls sick and can't visit his forest
// friends; his well-wishing visitors unknowingly eat all the tender
// grass on his hillock, and realise they've harmed the very friend
// they meant to help. Reuses ENGLISH_SENTENCE_BUILDER. No new
// mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 4 });
    console.log("Created new Grade 4 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Old Stag" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "My Beautiful World",
      title: "The Old Stag",
      order_index: 5,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading for Unintended Consequences of Care" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading for Unintended Consequences of Care",
      explanation_text:
        "The kind old stag was popular with every animal in the forest, but when he fell sick and couldn't leave his hillock, his many well-wishing visitors slowly ate up all the tender grass that grew there — without meaning to, their care had harmed the very friend they wanted to help. The story teaches that even good intentions need to be balanced with awareness of their effect.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: The Kind Old Stag",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "old" },
          { id: "w3", label: "stag" },
          { id: "w4", label: "was" },
          { id: "w5", label: "kind" },
          { id: "w6", label: "and" },
          { id: "w7", label: "friendly." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "Who is being described comes first, then what he was like.",
      },
    },
    {
      title: "Build: Too Sick to Walk",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "He" },
          { id: "w2", label: "became" },
          { id: "w3", label: "too" },
          { id: "w4", label: "weak" },
          { id: "w5", label: "to" },
          { id: "w6", label: "walk" },
          { id: "w7", label: "down" },
          { id: "w8", label: "the" },
          { id: "w9", label: "hillock." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9"],
        hint: "Say who and what happened to him, then what he could no longer do.",
      },
    },
    {
      title: "Build: The Friends Realise Their Mistake",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "animals" },
          { id: "w3", label: "felt" },
          { id: "w4", label: "sorry" },
          { id: "w5", label: "for" },
          { id: "w6", label: "eating" },
          { id: "w7", label: "all" },
          { id: "w8", label: "his" },
          { id: "w9", label: "grass." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9"],
        hint: "Who felt sorry comes first, then what they felt sorry about.",
      },
    },
  ];

  for (const challenge of sentenceChallenges) {
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

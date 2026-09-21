require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 2
// "The Tinkling Bells", Unit 1 "My Land"). Content verified: a
// story about Chinna and his pet kid (a young goat) named Tara,
// teaching honesty and family support. Reuses
// ENGLISH_SENTENCE_BUILDER. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Tinkling Bells" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "My Land",
      title: "The Tinkling Bells",
      order_index: 2,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading for Honesty and Family Care" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading for Honesty and Family Care",
      explanation_text:
        "This story follows Chinna and his pet kid (a young goat) named Tara, and teaches the value of honesty and caring for family. A 'kid' in this story doesn't mean a child — it's the word for a baby goat, a good example of how the same word can mean different things depending on context.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Chinna's Pet Goat",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Chinna" },
          { id: "w2", label: "loved" },
          { id: "w3", label: "his" },
          { id: "w4", label: "pet" },
          { id: "w5", label: "kid," },
          { id: "w6", label: "Tara." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6"],
        hint: "Who is doing the loving comes first, then the action, then who is loved.",
      },
    },
    {
      title: "Build: A Baby Goat is a Kid",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "A" },
          { id: "w2", label: "baby" },
          { id: "w3", label: "goat" },
          { id: "w4", label: "is" },
          { id: "w5", label: "called" },
          { id: "w6", label: "a" },
          { id: "w7", label: "kid." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "Start with what is being named, then say what it's called.",
      },
    },
    {
      title: "Build: Honesty Matters Most",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Being" },
          { id: "w2", label: "honest" },
          { id: "w3", label: "matters" },
          { id: "w4", label: "even" },
          { id: "w5", label: "when" },
          { id: "w6", label: "no" },
          { id: "w7", label: "one" },
          { id: "w8", label: "is" },
          { id: "w9", label: "watching." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9"],
        hint: "State the value first ('being honest matters'), then the condition that makes the point stronger.",
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

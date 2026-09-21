require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 11
// "A Journey to the Magical Mountains", Unit 4 "Up High"). Content
// verified directly from the official NCERT textbook PDF: Minam, a
// young girl living at the base of the Himalayas, treks with her
// grandfather (a former Sherpa) — they stop by a river for lunch
// and watch fish, climb higher and see yaks (which give milk, wool
// and carry loads), reach snow for the first time and build a
// snowman, and her grandfather teaches her to respect and protect
// the mountains. Reuses ENGLISH_SENTENCE_BUILDER. No new mechanic
// needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "A Journey to the Magical Mountains" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Up High",
      title: "A Journey to the Magical Mountains",
      order_index: 11,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading About Minam's Himalayan Trek" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading About Minam's Himalayan Trek",
      explanation_text:
        "Minam treks into the Himalayas with her grandfather, a former Sherpa. They stop by a clear river for lunch, climb higher and spot yaks — animals that give the mountain people milk and wool and help carry heavy loads — and finally reach snow, which Minam has never seen before, where they build a snowman together. Her grandfather ends the journey by teaching her to always respect and protect the mountains.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Minam's Grandfather Was a Sherpa",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Minam's" },
          { id: "w2", label: "grandfather" },
          { id: "w3", label: "had" },
          { id: "w4", label: "once" },
          { id: "w5", label: "been" },
          { id: "w6", label: "a" },
          { id: "w7", label: "Sherpa." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "Who comes first, then what he used to be.",
      },
    },
    {
      title: "Build: What Yaks Give the Mountain People",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Yaks" },
          { id: "w2", label: "give" },
          { id: "w3", label: "milk," },
          { id: "w4", label: "wool" },
          { id: "w5", label: "and" },
          { id: "w6", label: "help" },
          { id: "w7", label: "carry" },
          { id: "w8", label: "loads." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
        hint: "Who gives comes first, then the list of three things they provide.",
      },
    },
    {
      title: "Build: Seeing Snow for the First Time",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Minam" },
          { id: "w2", label: "had" },
          { id: "w3", label: "never" },
          { id: "w4", label: "seen" },
          { id: "w5", label: "so" },
          { id: "w6", label: "much" },
          { id: "w7", label: "snow" },
          { id: "w8", label: "before." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
        hint: "Who is the subject, then 'had never seen', then how much, then what, then when.",
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

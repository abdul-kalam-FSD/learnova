require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 1
// "Together We Can", Unit 1 "My Land"). Content verified: a poem
// about teamwork, unity and cooperation, touching India's diversity
// of festivals, food and traditions. Reuses
// ENGLISH_SENTENCE_BUILDER's generic word-ordering mechanic. No new
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Together We Can" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "My Land",
      title: "Together We Can",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading for Teamwork and Unity" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading for Teamwork and Unity",
      explanation_text:
        "This poem celebrates how people achieve more by working together than alone, and it celebrates India's diversity of festivals, food and traditions as a source of unity, not division. Reading it closely, and building well-ordered sentences about it, helps you practise both comprehension and correct English word order at the same time.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Working as a Team",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Together," },
          { id: "w2", label: "we" },
          { id: "w3", label: "can" },
          { id: "w4", label: "achieve" },
          { id: "w5", label: "more." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5"],
        hint: "The poem's title itself is close to the answer — start with the idea of doing things together.",
      },
    },
    {
      title: "Build: India's Many Festivals",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "India" },
          { id: "w2", label: "celebrates" },
          { id: "w3", label: "many" },
          { id: "w4", label: "different" },
          { id: "w5", label: "festivals." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5"],
        hint: "Who is doing the celebrating comes first, then the action, then what is celebrated.",
      },
    },
    {
      title: "Build: Standing Together in Unity",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Even" },
          { id: "w2", label: "with" },
          { id: "w3", label: "our" },
          { id: "w4", label: "differences," },
          { id: "w5", label: "we" },
          { id: "w6", label: "stand" },
          { id: "w7", label: "together." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "The sentence first admits a contrast ('even with...') before stating what still happens despite it.",
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

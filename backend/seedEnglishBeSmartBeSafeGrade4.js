require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 3
// "Be Smart, Be Safe", Unit 1 "My Land"). Content verified: road
// safety rules — zebra crossings, traffic lights, footpaths,
// holding an adult's hand, reflective stickers, staying alert.
// Reuses ENGLISH_SENTENCE_BUILDER. No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Be Smart, Be Safe" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "My Land",
      title: "Be Smart, Be Safe",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading and Writing Road Safety Rules" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading and Writing Road Safety Rules",
      explanation_text:
        "This chapter covers road safety rules: using the zebra crossing, obeying traffic lights, walking on the footpath, holding an adult's hand near roads, wearing reflective stickers when it's dark, and staying alert. Turning each rule into a well-ordered sentence is good practice for both road safety and correct English word order.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Use the Zebra Crossing",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Always" },
          { id: "w2", label: "use" },
          { id: "w3", label: "the" },
          { id: "w4", label: "zebra" },
          { id: "w5", label: "crossing." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5"],
        hint: "Start with the word that means 'every time', then the action, then what to use.",
      },
    },
    {
      title: "Build: Hold an Adult's Hand",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Hold" },
          { id: "w2", label: "an" },
          { id: "w3", label: "adult's" },
          { id: "w4", label: "hand" },
          { id: "w5", label: "near" },
          { id: "w6", label: "busy" },
          { id: "w7", label: "roads." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "Start with the instruction itself, then say where it applies.",
      },
    },
    {
      title: "Build: Stay Alert and Wear Reflective Stickers",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Stay" },
          { id: "w2", label: "alert" },
          { id: "w3", label: "and" },
          { id: "w4", label: "wear" },
          { id: "w5", label: "reflective" },
          { id: "w6", label: "stickers" },
          { id: "w7", label: "after" },
          { id: "w8", label: "dark." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
        hint: "Two instructions joined by 'and' — keep each instruction's own word order intact.",
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

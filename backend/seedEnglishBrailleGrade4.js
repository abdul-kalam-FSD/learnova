require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 6
// "Braille", Unit 2 "My Beautiful World").
//
// *** LOWER-CONFIDENCE CHAPTER ***
// The chapter's existence, title, unit and position (Ch 6 of 12)
// are independently confirmed across multiple sources. The
// *textbook's own specific narrative/wording* is NOT verified —
// only the well-documented real-world subject matter (Louis
// Braille invented a tactile reading/writing system for people who
// are blind, using raised dot patterns, in the early 1800s). This
// content sticks to those externally-verifiable facts rather than
// inventing textbook-specific story details. Please review before
// treating this as textbook-accurate.
//
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Braille" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "My Beautiful World",
      title: "Braille",
      order_index: 6,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading About a System for Reading Without Sight" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading About a System for Reading Without Sight",
      explanation_text:
        "Braille is a system of raised dots that lets people who are blind read and write by touch instead of sight, using their fingertips to feel patterns of dots that stand for letters. It was invented in the early 1800s and is still used worldwide today, a good example of how a clever idea can open up reading to everyone.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Reading with Fingertips",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Braille" },
          { id: "w2", label: "is" },
          { id: "w3", label: "read" },
          { id: "w4", label: "with" },
          { id: "w5", label: "the" },
          { id: "w6", label: "fingertips." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6"],
        hint: "Name what is read, then how it's read.",
      },
    },
    {
      title: "Build: Patterns of Raised Dots",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Each" },
          { id: "w2", label: "letter" },
          { id: "w3", label: "is" },
          { id: "w4", label: "a" },
          { id: "w5", label: "pattern" },
          { id: "w6", label: "of" },
          { id: "w7", label: "raised" },
          { id: "w8", label: "dots." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
        hint: "Start with what is being represented, then how it's represented.",
      },
    },
    {
      title: "Build: A System Used Around the World",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Today," },
          { id: "w2", label: "Braille" },
          { id: "w3", label: "helps" },
          { id: "w4", label: "blind" },
          { id: "w5", label: "people" },
          { id: "w6", label: "read" },
          { id: "w7", label: "all" },
          { id: "w8", label: "over" },
          { id: "w9", label: "the" },
          { id: "w10", label: "world." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10"],
        hint: "Start with the time word, then who helps whom do what, then where.",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 8
// "The Lagori Champions", Unit 3 "Fun with Games").
//
// *** LOWER-CONFIDENCE CHAPTER ***
// Chapter existence, title, unit and position confirmed across
// multiple sources. The textbook's specific story is NOT verified —
// content here sticks to well-documented, externally-verifiable
// facts about Lagori (also called Pittu/Seven Stones), a
// traditional Indian team game played with a stone stack and a
// ball, rather than inventing the textbook's specific characters or
// plot. Please review before treating as textbook-exact.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Lagori Champions" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Fun with Games",
      title: "The Lagori Champions",
      order_index: 8,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading About a Traditional Indian Team Game" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading About a Traditional Indian Team Game",
      explanation_text:
        "Lagori (also known as Pittu or Seven Stones) is a traditional Indian team game: one team stacks flat stones into a pile and tries to rebuild it after knocking it down with a ball, while the other team tries to stop them by hitting them with the ball. It's a good example of a game that needs both teamwork and quick thinking.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Stacking the Stones",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Lagori" },
          { id: "w2", label: "is" },
          { id: "w3", label: "played" },
          { id: "w4", label: "with" },
          { id: "w5", label: "flat" },
          { id: "w6", label: "stones." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6"],
        hint: "Name the game first, then how it's played.",
      },
    },
    {
      title: "Build: Two Teams, One Game",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "One" },
          { id: "w2", label: "team" },
          { id: "w3", label: "tries" },
          { id: "w4", label: "to" },
          { id: "w5", label: "rebuild" },
          { id: "w6", label: "the" },
          { id: "w7", label: "stack." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "Who tries comes first, then what they're trying to do.",
      },
    },
    {
      title: "Build: Teamwork and Quick Thinking",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Winning" },
          { id: "w2", label: "Lagori" },
          { id: "w3", label: "needs" },
          { id: "w4", label: "both" },
          { id: "w5", label: "teamwork" },
          { id: "w6", label: "and" },
          { id: "w7", label: "quick" },
          { id: "w8", label: "thinking." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
        hint: "Start with what it takes to win, then name the two things needed.",
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

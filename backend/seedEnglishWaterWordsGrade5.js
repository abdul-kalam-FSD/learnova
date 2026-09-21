require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 English — Decision A-1 (APPROVED): skill-based
// chapter inspired by Santoor Unit 3 "Water" (Chapters 5-6, "The
// Frog" and "What a Tank!"). Transferable skill: forming water-
// related compound words by joining "water" with another word —
// distinct vocabulary set from Grade 4's general compound-words
// chapter, chosen specifically to match this unit's water theme
// rather than reusing the same words.
//
// Reuses ENGLISH_WORD_FORGE exactly as the existing Grade 4 and
// Grade 5 "Prefixes and Suffixes" chapters do. No new mechanic
// needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Words About Water" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Vocabulary Building",
      title: "Words About Water",
      order_index: 4,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Forming Water-Related Compound Words" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Forming Water-Related Compound Words",
      explanation_text:
        "Joining 'water' with another whole word creates a brand-new word with its own specific meaning — 'waterfall' isn't just 'water' and 'fall' side by side, it's a single word for water dropping from a height. Recognising these two building blocks helps you understand and spell longer water-related words.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const waterWordChallenges = [
    {
      title: "Forge: waterfall",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "water dropping from a height, like over a cliff",
        scrambled_pieces: [
          { id: "w1", label: "fall" },
          { id: "w2", label: "water" },
        ],
        correct_order: ["w2", "w1"],
        hint: "'Water' always comes first in this compound word, describing what is falling.",
      },
    },
    {
      title: "Forge: underwater",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_meaning: "below the surface of water",
        scrambled_pieces: [
          { id: "x1", label: "water" },
          { id: "x2", label: "under" },
        ],
        correct_order: ["x2", "x1"],
        hint: "'Under' describes the position, and it comes first, right before 'water'.",
      },
    },
    {
      title: "Forge: rainwater",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_meaning: "water that has fallen as rain",
        scrambled_pieces: [
          { id: "y1", label: "water" },
          { id: "y2", label: "rain" },
        ],
        correct_order: ["y2", "y1"],
        hint: "This word tells you where the water came from — 'rain' describes the water, so it comes first.",
      },
    },
  ];

  for (const challenge of waterWordChallenges) {
    const exists = await GameContent.findOne({ game_type: "ENGLISH_WORD_FORGE", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

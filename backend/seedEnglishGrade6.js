require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// First English vertical slice (Section 24/27 — English hadn't been
// touched yet). Section 10 explicitly says "do not simply create
// English quizzes" — Word Forge instead reuses the ordered-sequence
// check already shared by MATH_EQUATION_BUILDER / HISTORY_TIMELINE_
// BUILDER / BIO_ECOSYSTEM_BALANCE / GEOGRAPHY_ROUTE_BUILDER (see
// checkAttempt in gameControllers.js) — assembling a word's prefix/
// root/suffix pieces in the right order is the same "ordered
// placement" logic as those, just a CREATE-flavored fantasy instead
// of a quiz.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 6 });
    console.log("Created new Grade 6 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Word Building" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Vocabulary and Morphology",
      title: "Word Building",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Prefixes, Roots, and Suffixes" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Prefixes, Roots, and Suffixes",
      explanation_text:
        "Many English words are built from smaller meaningful pieces: a root carries the core meaning, a prefix attaches to the front to change or negate it, and a suffix attaches to the end to change its meaning or part of speech. These pieces always combine in the same order — prefix, then root, then suffix.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `scrambled_pieces` are the word's morphemes in
  // shuffled order; `correct_order` (stripped before the client sees
  // it) lists the piece ids in the order that spells the target word.
  const wordChallenges = [
    {
      title: "Forge: unhappiness",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "the state of not being happy",
        scrambled_pieces: [
          { id: "w3", label: "ness" },
          { id: "w1", label: "un" },
          { id: "w2", label: "happy" },
        ],
        correct_order: ["w1", "w2", "w3"],
        hint: "The negating prefix comes first, then the root feeling, then the noun-forming suffix.",
      },
    },
    {
      title: "Forge: disagreement",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_meaning: "a difference of opinion",
        scrambled_pieces: [
          { id: "x2", label: "agree" },
          { id: "x3", label: "ment" },
          { id: "x1", label: "dis" },
        ],
        correct_order: ["x1", "x2", "x3"],
        hint: "'dis-' reverses the root's meaning, and '-ment' turns the verb into a noun.",
      },
    },
    {
      title: "Forge: irreplaceable",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_meaning: "not able to be replaced",
        scrambled_pieces: [
          { id: "y2", label: "replace" },
          { id: "y1", label: "ir" },
          { id: "y3", label: "able" },
        ],
        correct_order: ["y1", "y2", "y3"],
        hint: "'ir-' negates words starting with 'r', and '-able' means 'capable of being'.",
      },
    },
  ];

  for (const challenge of wordChallenges) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
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

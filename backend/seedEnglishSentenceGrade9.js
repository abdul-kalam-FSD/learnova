require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// English second mechanic for Grade 9: reuses the existing
// "Words Built from Three Roots" chapter from seedEnglishGrade9.js (currently
// ENGLISH_WORD_FORGE only, which builds one word from morphemes),
// adds a new Concept + ENGLISH_SENTENCE_BUILDER content — building a
// whole, correctly ordered sentence from scrambled words instead.
// Reuses the generic order-family check in gameControllers.js (same
// orderedPieceIds === correct_order rule as CS_CODE_ORDER_BUILDER),
// no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 9, name: /english/i });
  if (!subject) {
    throw new Error("Grade 9 English subject not found — run seedEnglishGrade9.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Words Built from Three Roots" });
  if (!chapter) {
    throw new Error("Chapter 'Words Built from Three Roots' not found — run seedEnglishGrade9.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Sentence with a Relative Clause" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Sentence with a Relative Clause",
      explanation_text: "A relative clause starting with 'which' or 'who' adds extra information about a noun, often right in the middle of a sentence. It has to sit directly after the noun it describes.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Observing the Whales",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w10", label: "whales." },
          { id: "w9", label: "migrating" },
          { id: "w8", label: "the" },
          { id: "w7", label: "of" },
          { id: "w6", label: "behavior" },
          { id: "w5", label: "unusual" },
          { id: "w4", label: "the" },
          { id: "w3", label: "observed" },
          { id: "w2", label: "biologist" },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10"],
        hint: "Subject, then verb, then what was observed, described in more and more detail.",
      },
    },
    {
      title: "Build: The Surprising Report",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. Notice the relative clause in the middle.",
        scrambled_words: [
          { id: "w11", label: "results." },
          { id: "w10", label: "surprising" },
          { id: "w9", label: "several" },
          { id: "w8", label: "revealed" },
          { id: "w7", label: "prepare," },
          { id: "w6", label: "to" },
          { id: "w5", label: "months" },
          { id: "w4", label: "took" },
          { id: "w3", label: "which" },
          { id: "w2", label: "report," },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10","w11"],
        hint: "The relative clause 'which took months to prepare' sits right after 'the report' and describes it, before the main verb continues.",
      },
    },
    {
      title: "Build: A Crisis Avoided",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. It starts with 'Had'.",
        scrambled_words: [
          { id: "w12", label: "entirely." },
          { id: "w11", label: "avoided" },
          { id: "w10", label: "been" },
          { id: "w9", label: "have" },
          { id: "w8", label: "might" },
          { id: "w7", label: "crisis" },
          { id: "w6", label: "the" },
          { id: "w5", label: "earlier," },
          { id: "w4", label: "invested" },
          { id: "w3", label: "government" },
          { id: "w2", label: "the" },
          { id: "w1", label: "Had" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10","w11","w12"],
        hint: "This is an inverted conditional — 'Had' takes the place of 'if', so it comes before the subject, unlike a normal statement.",
      },
    },
  ];

  for (const challenge of sentenceChallenges) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_SENTENCE_BUILDER",
      title: challenge.title,
    });
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

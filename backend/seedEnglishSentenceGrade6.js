require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// English second mechanic for Grade 6: reuses the existing
// "Word Building" chapter from seedEnglishGrade6.js (currently
// ENGLISH_WORD_FORGE only, which builds one word from morphemes),
// adds a new Concept + ENGLISH_SENTENCE_BUILDER content — building a
// whole, correctly ordered sentence from scrambled words instead.
// Reuses the generic order-family check in gameControllers.js (same
// orderedPieceIds === correct_order rule as CS_CODE_ORDER_BUILDER),
// no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 6, name: /english/i });
  if (!subject) {
    throw new Error("Grade 6 English subject not found — run seedEnglishGrade6.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Word Building" });
  if (!chapter) {
    throw new Error("Chapter 'Word Building' not found — run seedEnglishGrade6.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Sentence with a Cause Clause" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Sentence with a Cause Clause",
      explanation_text: "A clause starting with 'because' explains why something happened. Whether it comes first or second, the cause clause and the main sentence each keep their own word order.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Arranging the Books",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w10", label: "shelf." },
          { id: "w9", label: "tall" },
          { id: "w8", label: "the" },
          { id: "w7", label: "on" },
          { id: "w6", label: "neatly" },
          { id: "w5", label: "books" },
          { id: "w4", label: "the" },
          { id: "w3", label: "arranged" },
          { id: "w2", label: "librarian" },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10"],
        hint: "Subject, then verb, then what was arranged, then how, then where.",
      },
    },
    {
      title: "Build: Becoming a Swimmer",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. It starts with the 'because' clause.",
        scrambled_words: [
          { id: "w9", label: "swimmer." },
          { id: "w8", label: "excellent" },
          { id: "w7", label: "an" },
          { id: "w6", label: "became" },
          { id: "w5", label: "Rohan" },
          { id: "w4", label: "daily," },
          { id: "w3", label: "practiced" },
          { id: "w2", label: "he" },
          { id: "w1", label: "Because" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9"],
        hint: "The cause clause comes first here — finish it completely before starting the main sentence about Rohan.",
      },
    },
    {
      title: "Build: Reaching the Office on Time",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w13", label: "time." },
          { id: "w12", label: "on" },
          { id: "w11", label: "exactly" },
          { id: "w10", label: "office" },
          { id: "w9", label: "the" },
          { id: "w8", label: "reached" },
          { id: "w7", label: "driver" },
          { id: "w6", label: "delivery" },
          { id: "w5", label: "the" },
          { id: "w4", label: "traffic," },
          { id: "w3", label: "heavy" },
          { id: "w2", label: "the" },
          { id: "w1", label: "Despite" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10","w11","w12","w13"],
        hint: "The 'despite' phrase sets up a contrast and comes first — then the main sentence follows its usual subject-verb-object order.",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// English second mechanic for Grade 4: reuses the existing
// "Compound Words" chapter from seedEnglishGrade4.js (currently
// ENGLISH_WORD_FORGE only, which builds one word from morphemes),
// adds a new Concept + ENGLISH_SENTENCE_BUILDER content — building a
// whole, correctly ordered sentence from scrambled words instead.
// Reuses the generic order-family check in gameControllers.js (same
// orderedPieceIds === correct_order rule as CS_CODE_ORDER_BUILDER),
// no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 4, name: /english/i });
  if (!subject) {
    throw new Error("Grade 4 English subject not found — run seedEnglishGrade4.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Compound Words" });
  if (!chapter) {
    throw new Error("Chapter 'Compound Words' not found — run seedEnglishGrade4.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Simple Sentence in the Right Order" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Simple Sentence in the Right Order",
      explanation_text: "A sentence has to put its words in the order English speakers expect — usually who or what (the subject) first, then what they do (the verb), then any extra details. Move the words around and the sentence stops making sense.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: The Sleeping Cat",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w6", label: "mat." },
          { id: "w5", label: "the" },
          { id: "w4", label: "on" },
          { id: "w3", label: "sleeps" },
          { id: "w2", label: "cat" },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6"],
        hint: "Start with who the sentence is about, then what they're doing, then where.",
      },
    },
    {
      title: "Build: Riding to School",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w7", label: "school." },
          { id: "w6", label: "to" },
          { id: "w5", label: "bicycle" },
          { id: "w4", label: "his" },
          { id: "w3", label: "rides" },
          { id: "w2", label: "brother" },
          { id: "w1", label: "My" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7"],
        hint: "Who is doing the riding comes first, then the action, then what they ride, then where they're going.",
      },
    },
    {
      title: "Build: Morning Birdsong",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w9", label: "trees." },
          { id: "w8", label: "the" },
          { id: "w7", label: "in" },
          { id: "w6", label: "sweetly" },
          { id: "w5", label: "sing" },
          { id: "w4", label: "birds" },
          { id: "w3", label: "the" },
          { id: "w2", label: "morning," },
          { id: "w1", label: "Every" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9"],
        hint: "The 'when' phrase can open the sentence — after that, follow subject, verb, then the details of how and where.",
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

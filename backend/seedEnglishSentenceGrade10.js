require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// English second mechanic for Grade 10: reuses the existing
// "Compound Academic Vocabulary" chapter from seedEnglishGrade10.js (currently
// ENGLISH_WORD_FORGE only, which builds one word from morphemes),
// adds a new Concept + ENGLISH_SENTENCE_BUILDER content — building a
// whole, correctly ordered sentence from scrambled words instead.
// Reuses the generic order-family check in gameControllers.js (same
// orderedPieceIds === correct_order rule as CS_CODE_ORDER_BUILDER),
// no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /english/i });
  if (!subject) {
    throw new Error("Grade 10 English subject not found — run seedEnglishGrade10.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Compound Academic Vocabulary" });
  if (!chapter) {
    throw new Error("Chapter 'Compound Academic Vocabulary' not found — run seedEnglishGrade10.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Sentence with Advanced Clause Structures" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Sentence with Advanced Clause Structures",
      explanation_text: "Sentences can build meaning through a 'that' clause, a 'whether... or' clause, or a paired comparative structure like 'the more... the more'. Each structure has a fixed word order that has to be followed exactly.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Designing for Earthquakes",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. Notice the 'that' clause at the end.",
        scrambled_words: [
          { id: "w10", label: "earthquakes." },
          { id: "w9", label: "strong" },
          { id: "w8", label: "withstand" },
          { id: "w7", label: "would" },
          { id: "w6", label: "that" },
          { id: "w5", label: "building" },
          { id: "w4", label: "a" },
          { id: "w3", label: "designed" },
          { id: "w2", label: "architect" },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10"],
        hint: "The 'that' clause describes the building and comes right after it, describing what the building would do.",
      },
    },
    {
      title: "Build: Whether the Plan Succeeds",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. It starts with a 'whether... or' clause.",
        scrambled_words: [
          { id: "w11", label: "preparation." },
          { id: "w10", label: "careful" },
          { id: "w9", label: "on" },
          { id: "w8", label: "largely" },
          { id: "w7", label: "depends" },
          { id: "w6", label: "fails" },
          { id: "w5", label: "or" },
          { id: "w4", label: "succeeds" },
          { id: "w3", label: "plan" },
          { id: "w2", label: "the" },
          { id: "w1", label: "Whether" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10","w11"],
        hint: "The 'whether... or' clause acts as the subject of the whole sentence — finish it before the main verb 'depends'.",
      },
    },
    {
      title: "Build: Preparation and Confidence",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence using the 'the more... the more' structure.",
        scrambled_words: [
          { id: "w13", label: "exam." },
          { id: "w12", label: "the" },
          { id: "w11", label: "answered" },
          { id: "w10", label: "they" },
          { id: "w9", label: "confidently" },
          { id: "w8", label: "more" },
          { id: "w7", label: "the" },
          { id: "w6", label: "prepared," },
          { id: "w5", label: "students" },
          { id: "w4", label: "the" },
          { id: "w3", label: "thoroughly" },
          { id: "w2", label: "more" },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10","w11","w12","w13"],
        hint: "Both halves of this paired structure start with 'the more' — keep each half's own subject and verb together and in order.",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// English second mechanic for Grade 5: reuses the existing
// "Prefixes and Suffixes" chapter from seedEnglishGrade5.js (currently
// ENGLISH_WORD_FORGE only, which builds one word from morphemes),
// adds a new Concept + ENGLISH_SENTENCE_BUILDER content — building a
// whole, correctly ordered sentence from scrambled words instead.
// Reuses the generic order-family check in gameControllers.js (same
// orderedPieceIds === correct_order rule as CS_CODE_ORDER_BUILDER),
// no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: /english/i });
  if (!subject) {
    throw new Error("Grade 5 English subject not found — run seedEnglishGrade5.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Prefixes and Suffixes" });
  if (!chapter) {
    throw new Error("Chapter 'Prefixes and Suffixes' not found — run seedEnglishGrade5.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Sentence with a Describing Clause" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Sentence with a Describing Clause",
      explanation_text: "Some sentences add a clause that describes when or why something happened, using words like 'because' or 'although'. That clause can come before or after the main sentence, but its own words still have to stay in order.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Explaining the Lesson",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w9", label: "students." },
          { id: "w8", label: "the" },
          { id: "w7", label: "to" },
          { id: "w6", label: "clearly" },
          { id: "w5", label: "lesson" },
          { id: "w4", label: "the" },
          { id: "w3", label: "explained" },
          { id: "w2", label: "teacher" },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9"],
        hint: "Subject, then verb, then what was explained, then how, then to whom.",
      },
    },
    {
      title: "Build: Playing in the Rain",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. It starts with the 'although' clause.",
        scrambled_words: [
          { id: "w9", label: "outside." },
          { id: "w8", label: "happily" },
          { id: "w7", label: "played" },
          { id: "w6", label: "children" },
          { id: "w5", label: "the" },
          { id: "w4", label: "raining," },
          { id: "w3", label: "was" },
          { id: "w2", label: "it" },
          { id: "w1", label: "Although" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9"],
        hint: "The 'although' clause has its own subject and verb, and it comes first here, before the main sentence.",
      },
    },
    {
      title: "Build: The Careful Scientist",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w12", label: "day." },
          { id: "w11", label: "every" },
          { id: "w10", label: "notebook" },
          { id: "w9", label: "small" },
          { id: "w8", label: "a" },
          { id: "w7", label: "in" },
          { id: "w6", label: "observations" },
          { id: "w5", label: "her" },
          { id: "w4", label: "recorded" },
          { id: "w3", label: "carefully" },
          { id: "w2", label: "scientist" },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10","w11","w12"],
        hint: "Subject, then how she did it, then the action, then what she recorded, then where, then when.",
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

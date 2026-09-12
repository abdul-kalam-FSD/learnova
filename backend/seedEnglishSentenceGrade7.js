require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// English second mechanic for Grade 7: reuses the existing
// "Words with Multiple Affixes" chapter from seedEnglishGrade7.js (currently
// ENGLISH_WORD_FORGE only, which builds one word from morphemes),
// adds a new Concept + ENGLISH_SENTENCE_BUILDER content — building a
// whole, correctly ordered sentence from scrambled words instead.
// Reuses the generic order-family check in gameControllers.js (same
// orderedPieceIds === correct_order rule as CS_CODE_ORDER_BUILDER),
// no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: /english/i });
  if (!subject) {
    throw new Error("Grade 7 English subject not found — run seedEnglishGrade7.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Words with Multiple Affixes" });
  if (!chapter) {
    throw new Error("Chapter 'Words with Multiple Affixes' not found — run seedEnglishGrade7.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Sentence with an Interrupting Phrase" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Sentence with an Interrupting Phrase",
      explanation_text: "Some sentences insert a phrase in the middle, between the subject and the verb, to add extra detail. That inserted phrase still has to sit in exactly the right spot for the sentence to read correctly.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Inspecting the Bridge",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w10", label: "traffic." },
          { id: "w9", label: "to" },
          { id: "w8", label: "opened" },
          { id: "w7", label: "it" },
          { id: "w6", label: "before" },
          { id: "w5", label: "bridge" },
          { id: "w4", label: "the" },
          { id: "w3", label: "inspected" },
          { id: "w2", label: "engineer" },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10"],
        hint: "Main sentence first — subject, verb, object — then the 'before' clause describing when.",
      },
    },
    {
      title: "Build: Finishing Homework First",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. It starts with the 'having finished' phrase.",
        scrambled_words: [
          { id: "w10", label: "cricket." },
          { id: "w9", label: "play" },
          { id: "w8", label: "to" },
          { id: "w7", label: "outside" },
          { id: "w6", label: "went" },
          { id: "w5", label: "Priya" },
          { id: "w4", label: "homework," },
          { id: "w3", label: "her" },
          { id: "w2", label: "finished" },
          { id: "w1", label: "Having" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10"],
        hint: "The opening phrase describes something Priya did before the main action — it comes first, then her name, then what she did.",
      },
    },
    {
      title: "Build: The Committee's Decision",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. Notice the interrupting phrase in the middle.",
        scrambled_words: [
          { id: "w11", label: "policy." },
          { id: "w10", label: "library" },
          { id: "w9", label: "new" },
          { id: "w8", label: "the" },
          { id: "w7", label: "approved" },
          { id: "w6", label: "finally" },
          { id: "w5", label: "debate," },
          { id: "w4", label: "much" },
          { id: "w3", label: "after" },
          { id: "w2", label: "committee," },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10","w11"],
        hint: "The subject 'the committee' comes first, then an inserted phrase about the debate, then finally the verb and what was approved.",
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

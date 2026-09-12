require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// English second mechanic for Grade 8: reuses the existing
// "Greek and Latin Roots" chapter from seedEnglishGrade8.js (currently
// ENGLISH_WORD_FORGE only, which builds one word from morphemes),
// adds a new Concept + ENGLISH_SENTENCE_BUILDER content — building a
// whole, correctly ordered sentence from scrambled words instead.
// Reuses the generic order-family check in gameControllers.js (same
// orderedPieceIds === correct_order rule as CS_CODE_ORDER_BUILDER),
// no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 8, name: /english/i });
  if (!subject) {
    throw new Error("Grade 8 English subject not found — run seedEnglishGrade8.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Greek and Latin Roots" });
  if (!chapter) {
    throw new Error("Chapter 'Greek and Latin Roots' not found — run seedEnglishGrade8.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building a Sentence with a 'Whoever' Clause" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building a Sentence with a 'Whoever' Clause",
      explanation_text: "A clause starting with 'whoever' or 'whatever' can act as the subject of the whole sentence. Its own words need to be in the right order before the rest of the sentence continues.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Analyzing the Manuscript",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w9", label: "clues." },
          { id: "w8", label: "for" },
          { id: "w7", label: "manuscript" },
          { id: "w6", label: "ancient" },
          { id: "w5", label: "the" },
          { id: "w4", label: "analyzed" },
          { id: "w3", label: "carefully" },
          { id: "w2", label: "historian" },
          { id: "w1", label: "The" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9"],
        hint: "Subject, then how she worked, then the verb, then what she analyzed, then why.",
      },
    },
    {
      title: "Build: Reserving Seats",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. It starts with a 'whoever' clause.",
        scrambled_words: [
          { id: "w10", label: "group." },
          { id: "w9", label: "entire" },
          { id: "w8", label: "the" },
          { id: "w7", label: "for" },
          { id: "w6", label: "seats" },
          { id: "w5", label: "reserve" },
          { id: "w4", label: "should" },
          { id: "w3", label: "first" },
          { id: "w2", label: "arrives" },
          { id: "w1", label: "Whoever" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10"],
        hint: "The 'whoever' clause is the subject of the whole sentence — finish it, then follow with the main verb 'should reserve'.",
      },
    },
    {
      title: "Build: Winning and Breaking a Record",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence. It starts with 'Not only'.",
        scrambled_words: [
          { id: "w15", label: "record." },
          { id: "w14", label: "tournament" },
          { id: "w13", label: "the" },
          { id: "w12", label: "broke" },
          { id: "w11", label: "also" },
          { id: "w10", label: "they" },
          { id: "w9", label: "but" },
          { id: "w8", label: "match," },
          { id: "w7", label: "the" },
          { id: "w6", label: "win" },
          { id: "w5", label: "team" },
          { id: "w4", label: "the" },
          { id: "w3", label: "did" },
          { id: "w2", label: "only" },
          { id: "w1", label: "Not" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10","w11","w12","w13","w14","w15"],
        hint: "'Not only... but also' sentences flip the usual word order right after 'Not only' — 'did the team win' comes before the second half.",
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

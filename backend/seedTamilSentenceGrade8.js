require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Tamil second mechanic for Grade 8: reuses the existing
// "ஒற்றுமையும் நேர்மையும் பழமொழிகளில்" chapter from seedTamilGrade8.js (currently
// TAMIL_PROVERB_MATCH only, which matches a proverb to its meaning),
// adds a new Concept + TAMIL_SENTENCE_BUILDER content — building a
// whole, correctly ordered Tamil sentence from scrambled words
// (Subject-Object-Verb order) instead. Reuses the generic order-
// family check in gameControllers.js (same orderedPieceIds ===
// correct_order rule as CS_CODE_ORDER_BUILDER / ENGLISH_SENTENCE_
// BUILDER), no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 8, name: /tamil/i });
  if (!subject) {
    throw new Error("Grade 8 Tamil subject not found — run seedTamilGrade8.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "ஒற்றுமையும் நேர்மையும் பழமொழிகளில்" });
  if (!chapter) {
    throw new Error("Chapter 'ஒற்றுமையும் நேர்மையும் பழமொழிகளில்' not found — run seedTamilGrade8.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "'யார் வந்தாலும்' போன்ற தொடருடன் வாக்கியம் அமைத்தல்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "'யார் வந்தாலும்' போன்ற தொடருடன் வாக்கியம் அமைத்தல்",
      explanation_text: "'யார்' அல்லது 'எது' என்று தொடங்கும் ஒரு தொடர் முழு வாக்கியத்தின் எழுவாயாகவே செயல்படலாம். அந்தத் தொடர் முதலில் முழுமையாக முடிந்த பிறகே மீதி வாக்கியம் தொடர வேண்டும்.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "அமைக்க: கையெழுத்துப் பிரதியை ஆய்வு செய்தல்",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w8", label: "செய்தார்." },
          { id: "w7", label: "ஆய்வு" },
          { id: "w6", label: "கவனமாக" },
          { id: "w5", label: "பிரதியை" },
          { id: "w4", label: "கையெழுத்துப்" },
          { id: "w3", label: "பழங்கால" },
          { id: "w2", label: "ஆய்வாளர்" },
          { id: "w1", label: "வரலாற்று" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8"],
        hint: "எழுவாய், பிறகு எப்படி, பிறகு எதை, இறுதியில் செயல்.",
      },
    },
    {
      title: "அமைக்க: இருக்கைகளை ஒதுக்குதல்",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும். 'யார் முதலில் வருகிறார்களோ' என்ற தொடரில் தொடங்கும்.",
        scrambled_words: [
          { id: "w8", label: "வேண்டும்." },
          { id: "w7", label: "ஒதுக்க" },
          { id: "w6", label: "இருக்கைகளை" },
          { id: "w5", label: "முழுக் குழுவிற்கும்" },
          { id: "w4", label: "அவர்கள்" },
          { id: "w3", label: "வருகிறார்களோ" },
          { id: "w2", label: "முதலில்" },
          { id: "w1", label: "யார்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8"],
        hint: "'யார்... வருகிறார்களோ' தொடர் முழு வாக்கியத்தின் எழுவாயாக இருக்கிறது — அது முடிந்த பின் மீதிச் செயல் வரும்.",
      },
    },
    {
      title: "அமைக்க: வெற்றியும் சாதனையும்",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w8", label: "முறியடித்தது." },
          { id: "w7", label: "சாதனையையும்" },
          { id: "w6", label: "போட்டியின்" },
          { id: "w5", label: "மட்டுமல்ல," },
          { id: "w4", label: "பெற்றது" },
          { id: "w3", label: "வெற்றி" },
          { id: "w2", label: "போட்டியில்" },
          { id: "w1", label: "அணி" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8"],
        hint: "முதல் பகுதியில் என்ன நடந்தது என்பதைக் கூறி, 'மட்டுமல்ல' என்பதற்குப் பின் இரண்டாவது சாதனையைக் கூறவும்.",
      },
    },
  ];

  for (const challenge of sentenceChallenges) {
    const exists = await GameContent.findOne({
      game_type: "TAMIL_SENTENCE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "TAMIL_SENTENCE_BUILDER",
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

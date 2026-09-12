require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Tamil second mechanic for Grade 4: reuses the existing
// "எளிய பழமொழிகள்" chapter from seedTamilGrade4.js (currently
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

  const subject = await Subject.findOne({ grade: 4, name: /tamil/i });
  if (!subject) {
    throw new Error("Grade 4 Tamil subject not found — run seedTamilGrade4.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "எளிய பழமொழிகள்" });
  if (!chapter) {
    throw new Error("Chapter 'எளிய பழமொழிகள்' not found — run seedTamilGrade4.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "எளிய வாக்கியத்தை சரியான வரிசையில் அமைத்தல்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "எளிய வாக்கியத்தை சரியான வரிசையில் அமைத்தல்",
      explanation_text: "தமிழ் வாக்கியத்தில் சொற்கள் ஒரு குறிப்பிட்ட வரிசையில் வர வேண்டும் — பொதுவாக எழுவாய் (யார்/எது) முதலிலும், பிறகு செயப்படுபொருள், இறுதியில் பயனிலை (செயல்) வரும். வரிசை மாறினால் வாக்கியம் பொருள் தராது.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "அமைக்க: பூனையின் உறக்கம்",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w4", label: "தூங்குகிறது." },
          { id: "w3", label: "மேல்" },
          { id: "w2", label: "பாயின்" },
          { id: "w1", label: "பூனை" },
        ],
        correct_order: ["w1","w2","w3","w4"],
        hint: "முதலில் எழுவாய் (பூனை), பிறகு இடம், இறுதியில் செயல் (தூங்குகிறது) வரும்.",
      },
    },
    {
      title: "அமைக்க: பள்ளிக்குச் செல்லும் தம்பி",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w6", label: "செல்கிறான்." },
          { id: "w5", label: "பள்ளிக்குச்" },
          { id: "w4", label: "நடந்து" },
          { id: "w3", label: "தினமும்" },
          { id: "w2", label: "தம்பி" },
          { id: "w1", label: "என்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6"],
        hint: "எழுவாய் முதலில், பிறகு எப்போது, பிறகு எப்படி, இறுதியில் எங்கே செல்கிறான் என்பதும் செயலும்.",
      },
    },
    {
      title: "அமைக்க: காலை பறவைகளின் இசை",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w6", label: "பாடுகின்றன." },
          { id: "w5", label: "இனிமையாகப்" },
          { id: "w4", label: "மரங்களில்" },
          { id: "w3", label: "பறவைகள்" },
          { id: "w2", label: "காலையிலும்," },
          { id: "w1", label: "ஒவ்வொரு" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6"],
        hint: "'எப்போது' என்ற தொடர் முதலில் வரலாம் — பிறகு எழுவாய், இடம், இறுதியில் செயல்.",
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

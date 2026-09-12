require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Tamil second mechanic for Grade 5: reuses the existing
// "அன்றாட வாழ்வில் பழமொழிகள்" chapter from seedTamilGrade5.js (currently
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

  const subject = await Subject.findOne({ grade: 5, name: /tamil/i });
  if (!subject) {
    throw new Error("Grade 5 Tamil subject not found — run seedTamilGrade5.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "அன்றாட வாழ்வில் பழமொழிகள்" });
  if (!chapter) {
    throw new Error("Chapter 'அன்றாட வாழ்வில் பழமொழிகள்' not found — run seedTamilGrade5.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "காரணம் தெரிவிக்கும் வாக்கியத்தை அமைத்தல்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "காரணம் தெரிவிக்கும் வாக்கியத்தை அமைத்தல்",
      explanation_text: "சில வாக்கியங்கள் ஒரு காரணத்தையும் அதன் விளைவையும் இணைத்துச் சொல்லும். காரணம் முதலில் வந்தாலும், பின் வந்தாலும், ஒவ்வொரு பகுதியும் அதன் சொந்த சரியான வரிசையில் இருக்க வேண்டும்.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "அமைக்க: பாடம் விளக்கும் ஆசிரியர்",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w5", label: "விளக்கினார்." },
          { id: "w4", label: "தெளிவாக" },
          { id: "w3", label: "பாடத்தைத்" },
          { id: "w2", label: "மாணவர்களுக்குப்" },
          { id: "w1", label: "ஆசிரியர்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5"],
        hint: "எழுவாய், பிறகு யாருக்கு, பிறகு எதை, பிறகு எப்படி, இறுதியில் செயல்.",
      },
    },
    {
      title: "அமைக்க: மழையில் விளையாட்டு",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும். 'மழை பெய்தும்' என்ற தொடரில் தொடங்கும்.",
        scrambled_words: [
          { id: "w6", label: "விளையாடினார்கள்." },
          { id: "w5", label: "வெளியே" },
          { id: "w4", label: "மகிழ்ச்சியாக" },
          { id: "w3", label: "குழந்தைகள்" },
          { id: "w2", label: "பெய்தும்," },
          { id: "w1", label: "மழை" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6"],
        hint: "இங்கே காரணத் தொடர் முதலில் வருகிறது — அதற்குப் பின் முழு வாக்கியம் தொடரும்.",
      },
    },
    {
      title: "அமைக்க: கவனமான விஞ்ஞானி",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w10", label: "செய்தார்." },
          { id: "w9", label: "பதிவு" },
          { id: "w8", label: "கவனமாகப்" },
          { id: "w7", label: "குறிப்பேட்டில்" },
          { id: "w6", label: "சிறிய" },
          { id: "w5", label: "ஒரு" },
          { id: "w4", label: "தினமும்" },
          { id: "w3", label: "கண்காணிப்புகளை" },
          { id: "w2", label: "தன்" },
          { id: "w1", label: "விஞ்ஞானி" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10"],
        hint: "எழுவாய் முதலில், பிறகு எதை, எப்போது, எதில், எப்படி, இறுதியில் செயல்.",
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

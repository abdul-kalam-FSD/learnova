require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Tamil second mechanic for Grade 6: reuses the existing
// "பழமொழிகளும் வாழ்க்கை பாடமும்" chapter from seedTamilGrade6.js (currently
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

  const subject = await Subject.findOne({ grade: 6, name: /tamil/i });
  if (!subject) {
    throw new Error("Grade 6 Tamil subject not found — run seedTamilGrade6.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "பழமொழிகளும் வாழ்க்கை பாடமும்" });
  if (!chapter) {
    throw new Error("Chapter 'பழமொழிகளும் வாழ்க்கை பாடமும்' not found — run seedTamilGrade6.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "பயிற்சியின் விளைவைச் சொல்லும் வாக்கியத்தை அமைத்தல்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "பயிற்சியின் விளைவைச் சொல்லும் வாக்கியத்தை அமைத்தல்",
      explanation_text: "'ஏனெனில்' போன்ற தொடர்களைக் கொண்ட வாக்கியங்களில், காரணப் பகுதியும் முடிவுப் பகுதியும் ஒவ்வொன்றும் தனித்தனியே சரியான வரிசையில் இருக்க வேண்டும்.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "அமைக்க: நூல்களை அடுக்கும் நூலகர்",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w6", label: "அடுக்கினார்." },
          { id: "w5", label: "நேர்த்தியாக" },
          { id: "w4", label: "அலமாரியில்" },
          { id: "w3", label: "உயரமான" },
          { id: "w2", label: "நூல்களை" },
          { id: "w1", label: "நூலகர்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6"],
        hint: "எழுவாய், பிறகு எதை, இடம், எப்படி, இறுதியில் செயல்.",
      },
    },
    {
      title: "அமைக்க: நீச்சல் வீரனான ரோகன்",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும். காரணத் தொடர் முதலில் வரும்.",
        scrambled_words: [
          { id: "w7", label: "வீரனானான்." },
          { id: "w6", label: "நீச்சல்" },
          { id: "w5", label: "சிறந்த" },
          { id: "w4", label: "ரோகன்" },
          { id: "w3", label: "செய்ததால்," },
          { id: "w2", label: "பயிற்சி" },
          { id: "w1", label: "தினமும்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7"],
        hint: "காரணத் தொடர் முதலில் முழுமையாக முடிய வேண்டும், அதன் பின் ரோகனைப் பற்றிய வாக்கியம் தொடரும்.",
      },
    },
    {
      title: "அமைக்க: நேரத்திற்கு அலுவலகம் சேர்தல்",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w9", label: "அடைந்தார்." },
          { id: "w8", label: "அலுவலகத்தை" },
          { id: "w7", label: "நேரத்திற்கு" },
          { id: "w6", label: "சரியான" },
          { id: "w5", label: "ஓட்டுநர்" },
          { id: "w4", label: "விநியோக" },
          { id: "w3", label: "இருந்தும்," },
          { id: "w2", label: "போக்குவரத்து" },
          { id: "w1", label: "பெரும்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9"],
        hint: "'இருந்தும்' தொடர் ஒரு முரணைக் காட்டி முதலில் வரும், பிறகு மீதி வாக்கியம் வழக்கமான வரிசையில் தொடரும்.",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Tamil second mechanic for Grade 7: reuses the existing
// "பழமொழிகளும் சொல்வளமும்" chapter from seedTamilGrade7.js (currently
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

  const subject = await Subject.findOne({ grade: 7, name: /tamil/i });
  if (!subject) {
    throw new Error("Grade 7 Tamil subject not found — run seedTamilGrade7.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "பழமொழிகளும் சொல்வளமும்" });
  if (!chapter) {
    throw new Error("Chapter 'பழமொழிகளும் சொல்வளமும்' not found — run seedTamilGrade7.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "இடையில் சேர்க்கப்படும் தொடருடன் வாக்கியம் அமைத்தல்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "இடையில் சேர்க்கப்படும் தொடருடன் வாக்கியம் அமைத்தல்",
      explanation_text: "சில வாக்கியங்கள் எழுவாய்க்கும் பயனிலைக்கும் இடையில் ஒரு கூடுதல் தொடரைச் சேர்க்கும். அந்தத் தொடர் சரியான இடத்தில் இருந்தால் மட்டுமே வாக்கியம் சரியாகப் படிக்கும்.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "அமைக்க: பாலத்தை ஆய்வு செய்தல்",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w7", label: "செய்தார்." },
          { id: "w6", label: "ஆய்வு" },
          { id: "w5", label: "பாலத்தை" },
          { id: "w4", label: "பொறியாளர்" },
          { id: "w3", label: "முன்" },
          { id: "w2", label: "திறக்கும்" },
          { id: "w1", label: "போக்குவரத்துக்குத்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7"],
        hint: "முதலில் எழுவாய் மற்றும் முக்கியச் செயல், இறுதியில் 'எப்போது' என்ற தொடர்.",
      },
    },
    {
      title: "அமைக்க: முதலில் வீட்டுப்பாடம்",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும். 'வீட்டுப்பாடத்தை முடித்ததும்' என்ற தொடரில் தொடங்கும்.",
        scrambled_words: [
          { id: "w8", label: "சென்றாள்." },
          { id: "w7", label: "வெளியே" },
          { id: "w6", label: "விளையாட" },
          { id: "w5", label: "கிரிக்கெட்" },
          { id: "w4", label: "பிரியா" },
          { id: "w3", label: "முடித்ததும்," },
          { id: "w2", label: "வீட்டுப்பாடத்தை" },
          { id: "w1", label: "தன்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8"],
        hint: "முதலில் நடந்த செயலைக் காட்டும் தொடர் தொடக்கத்தில் வரும், பிறகு பிரியாவின் பெயரும் அடுத்த செயலும்.",
      },
    },
    {
      title: "அமைக்க: குழுவின் முடிவு",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும். நடுவில் ஒரு இடைச்செருகல் தொடர் உள்ளது.",
        scrambled_words: [
          { id: "w9", label: "அங்கீகரித்தது." },
          { id: "w8", label: "கொள்கையை" },
          { id: "w7", label: "நூலக" },
          { id: "w6", label: "புதிய" },
          { id: "w5", label: "இறுதியாக" },
          { id: "w4", label: "பின்," },
          { id: "w3", label: "விவாதத்திற்குப்" },
          { id: "w2", label: "நீண்ட" },
          { id: "w1", label: "குழு," },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9"],
        hint: "எழுவாய் (குழு) முதலில், பிறகு விவாதத்தைப் பற்றிய இடைச்செருகல் தொடர், இறுதியில் செயல்.",
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

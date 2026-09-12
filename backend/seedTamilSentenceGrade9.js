require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Tamil second mechanic for Grade 9: reuses the existing
// "தொலைநோக்கும் பழமொழிகளும்" chapter from seedTamilGrade9.js (currently
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

  const subject = await Subject.findOne({ grade: 9, name: /tamil/i });
  if (!subject) {
    throw new Error("Grade 9 Tamil subject not found — run seedTamilGrade9.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "தொலைநோக்கும் பழமொழிகளும்" });
  if (!chapter) {
    throw new Error("Chapter 'தொலைநோக்கும் பழமொழிகளும்' not found — run seedTamilGrade9.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "விவரிக்கும் தொடருடன் கூடிய வாக்கியம் அமைத்தல்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "விவரிக்கும் தொடருடன் கூடிய வாக்கியம் அமைத்தல்",
      explanation_text: "ஒரு பெயர்ச்சொல்லைப் பற்றி கூடுதல் தகவல் தரும் தொடர், அந்தப் பெயர்ச்சொல்லுக்கு உடனடியாகப் பின் வர வேண்டும் — இதனால் வாக்கியத்தின் நடுவில் அத்தொடர் சரியான இடத்தில் அமைகிறது.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "அமைக்க: திமிங்கலங்களை ஆய்வு செய்தல்",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w6", label: "கவனித்தார்." },
          { id: "w5", label: "நடத்தையை" },
          { id: "w4", label: "வித்தியாசமான" },
          { id: "w3", label: "திமிங்கலங்களின்" },
          { id: "w2", label: "இடம்பெயரும்" },
          { id: "w1", label: "உயிரியலாளர்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6"],
        hint: "எழுவாய், பிறகு எதை, மேலும் மேலும் விவரிக்கும் தொடர்கள் இறுதியில்.",
      },
    },
    {
      title: "அமைக்க: வியப்பூட்டும் அறிக்கை",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும். நடுவில் ஒரு விவரிக்கும் தொடர் உள்ளது.",
        scrambled_words: [
          { id: "w8", label: "வெளிப்படுத்தியது." },
          { id: "w7", label: "முடிவுகளை" },
          { id: "w6", label: "வியப்பூட்டும்" },
          { id: "w5", label: "பல" },
          { id: "w4", label: "அறிக்கை" },
          { id: "w3", label: "எடுத்த" },
          { id: "w2", label: "மாதங்கள்" },
          { id: "w1", label: "தயார்செய்ய" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8"],
        hint: "'தயார்செய்ய மாதங்கள் எடுத்த' என்ற தொடர் 'அறிக்கை' என்பதைப் பற்றி விவரிக்கிறது — அது சரியான இடத்தில் வர வேண்டும்.",
      },
    },
    {
      title: "அமைக்க: தவிர்க்கப்பட்ட நெருக்கடி",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும். 'அரசு முன்னதாகவே முதலீடு செய்திருந்தால்' என்ற தொடரில் தொடங்கும்.",
        scrambled_words: [
          { id: "w6", label: "தவிர்க்கப்பட்டிருக்கும்." },
          { id: "w5", label: "நெருக்கடி" },
          { id: "w4", label: "செய்திருந்தால்," },
          { id: "w3", label: "முதலீடு" },
          { id: "w2", label: "முன்னதாகவே" },
          { id: "w1", label: "அரசு" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6"],
        hint: "இந்த நிபந்தனை வாக்கியத்தில், 'செய்திருந்தால்' முதல் பகுதியாக வருகிறது, பிறகு அதன் விளைவைக் கூறும் இரண்டாம் பகுதி வரும்.",
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

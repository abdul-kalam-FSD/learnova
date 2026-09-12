require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Tamil second mechanic for Grade 10: reuses the existing
// "பழமொழிகளின் ஆழ்ந்த பொருள்" chapter from seedTamilGrade10.js (currently
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

  const subject = await Subject.findOne({ grade: 10, name: /tamil/i });
  if (!subject) {
    throw new Error("Grade 10 Tamil subject not found — run seedTamilGrade10.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "பழமொழிகளின் ஆழ்ந்த பொருள்" });
  if (!chapter) {
    throw new Error("Chapter 'பழமொழிகளின் ஆழ்ந்த பொருள்' not found — run seedTamilGrade10.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "மேம்பட்ட தொடர் அமைப்புகளுடன் வாக்கியம் அமைத்தல்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "மேம்பட்ட தொடர் அமைப்புகளுடன் வாக்கியம் அமைத்தல்",
      explanation_text: "நிலைத் தொடர்கள் ('எது... அதுவும்'), நிபந்தனைத் தொடர்கள், ஒப்பீட்டு அமைப்புகள் ஆகியவை ஒவ்வொன்றும் தங்களுக்கே உரிய நிலையான வரிசையைப் பின்பற்ற வேண்டும்.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "அமைக்க: நிலநடுக்கத்திற்கான வடிவமைப்பு",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w7", label: "வடிவமைத்தார்." },
          { id: "w6", label: "கட்டிடத்தை" },
          { id: "w5", label: "ஒரு" },
          { id: "w4", label: "தாங்கும்" },
          { id: "w3", label: "நிலநடுக்கங்களைத்" },
          { id: "w2", label: "பலத்த" },
          { id: "w1", label: "கட்டிடக்கலைஞர்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7"],
        hint: "எழுவாய், பிறகு கட்டிடத்தை விவரிக்கும் தொடர், இறுதியில் செயல்.",
      },
    },
    {
      title: "அமைக்க: திட்டத்தின் வெற்றி",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி வாக்கியமாக அமைக்கவும். 'திட்டம் வெற்றியடையுமா தோல்வியடையுமா' என்ற தொடரில் தொடங்கும்.",
        scrambled_words: [
          { id: "w8", label: "இருக்கிறது." },
          { id: "w7", label: "பொறுத்தே" },
          { id: "w6", label: "தயாரிப்பைப்" },
          { id: "w5", label: "கவனமான" },
          { id: "w4", label: "என்பது" },
          { id: "w3", label: "தோல்வியடையுமா" },
          { id: "w2", label: "வெற்றியடையுமா" },
          { id: "w1", label: "திட்டம்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8"],
        hint: "'...அதுவா... இதுவா' தொடர் முழு வாக்கியத்தின் எழுவாயாக இருக்கிறது — அது முடிந்த பின் 'பொறுத்தே இருக்கிறது' வரும்.",
      },
    },
    {
      title: "அமைக்க: தயாரிப்பும் நம்பிக்கையும்",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "இந்தச் சொற்களை சரியான வரிசையில் அடுக்கி இணைத் தொடர் அமைப்புடன் வாக்கியமாக அமைக்கவும்.",
        scrambled_words: [
          { id: "w9", label: "பதிலளித்தார்கள்." },
          { id: "w8", label: "தேர்வுக்கு" },
          { id: "w7", label: "நம்பிக்கையுடன்" },
          { id: "w6", label: "அவ்வளவு" },
          { id: "w5", label: "செய்தார்களோ," },
          { id: "w4", label: "தயார்" },
          { id: "w3", label: "கூடுதலாகத்" },
          { id: "w2", label: "எவ்வளவு" },
          { id: "w1", label: "மாணவர்கள்" },
        ],
        correct_order: ["w1","w2","w3","w4","w5","w6","w7","w8","w9"],
        hint: "இந்த இணைத் தொடரில் இரு பகுதிகளும் தொடர்புடையவை — முதல் பகுதி முழுமையாக முடிந்த பின் இரண்டாம் பகுதி வரும்.",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// First Tamil vertical slice (Section 24/27/11 — LANGUAGE / STORY /
// CULTURE fantasy, distinct from English's Word Forge). Proverb
// Match reuses the exact same mapping-equality check as
// PHYSICS_CIRCUIT_BUILDER / CHEMISTRY_REACTION_LAB (see checkAttempt
// in gameControllers.js): assigning the correct meaning to each
// proverb is the same "every slot must match its correct
// counterpart" logic as wiring a circuit or predicting a reaction.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: /tamil/i });
  if (!subject) {
    subject = await Subject.create({ name: "Tamil", grade: 7 });
    console.log("Created new Grade 7 Tamil subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "பழமொழிகளும் சொல்வளமும்" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "மொழி வளம்",
      title: "பழமொழிகளும் சொல்வளமும்",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "பழமொழிகளின் பொருள்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "பழமொழிகளின் பொருள்",
      explanation_text:
        "பழமொழிகள் நம் முன்னோர்களின் அனுபவ ஞானத்தை சுருக்கமாக சொல்லும் வாக்கியங்கள். ஒவ்வொரு பழமொழிக்கும் அதன் சொற்களுக்கு அப்பாற்பட்ட ஆழமான பொருள் உண்டு.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: `slots` are proverbs; `components` are meaning
  // cards (more than slots, including plausible decoys).
  // `correct_mapping` names the right meaning card id for each
  // proverb slot id — see checkAttempt's shared
  // PHYSICS_CIRCUIT_BUILDER / CHEMISTRY_REACTION_LAB /
  // TAMIL_PROVERB_MATCH branch.
  const proverbChallenges = [
    {
      title: "பழமொழி பொருத்துக — 1",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "ஆரோக்கியமே மகா பாக்கியம்" },
          { id: "s2", label: "கற்றது கைமண் அளவு, கல்லாதது உலகளவு" },
          { id: "s3", label: "ஒற்றுமையே பலம்" },
        ],
        components: [
          { id: "c1", label: "நல்ல உடல் நலமே மிகப் பெரிய செல்வம்" },
          { id: "c2", label: "நாம் கற்றது சிறிது, கற்க வேண்டியது உலகளவு பெரியது" },
          { id: "c3", label: "ஒன்று சேர்ந்து செயல்படுவதே பலமான சக்தி" },
          { id: "c4", label: "பணமே வாழ்க்கையின் மிகப் பெரிய இலக்கு" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "ஒவ்வொரு பழமொழியிலும் உள்ள முதன்மைச் சொல்லைக் கவனி — ஆரோக்கியம், கல்வி, ஒற்றுமை.",
      },
    },
    {
      title: "பழமொழி பொருத்துக — 2",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "இந்த பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "ஊக்கமது கைவிடேல்" },
          { id: "s2", label: "கல்வி கரையில கடலு" },
          { id: "s3", label: "இன்று செய்வதை நாளை செய்யாதே" },
        ],
        components: [
          { id: "c1", label: "முயற்சியையும் உற்சாகத்தையும் ஒருபோதும் விட்டுவிடாதே" },
          { id: "c2", label: "அறிவு என்பது எல்லையே இல்லாத பெருங்கடல் போன்றது" },
          { id: "c3", label: "இன்றைய வேலையைப் பிற்படுத்தாமல் இப்போதே செய்" },
          { id: "c4", label: "பணத்தைச் சேமிப்பதே வாழ்க்கையின் நோக்கம்" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "ஒவ்வொன்றும் ஒரு அறிவுரை — முயற்சி, கல்வியின் பரப்பு, காலம் தாழ்த்தாமை பற்றியது.",
      },
    },
  ];

  for (const challenge of proverbChallenges) {
    const exists = await GameContent.findOne({
      game_type: "TAMIL_PROVERB_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "TAMIL_PROVERB_MATCH",
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

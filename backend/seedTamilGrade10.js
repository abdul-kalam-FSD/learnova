require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 10 currently has no 2nd-language content. Reuses
// TAMIL_PROVERB_MATCH (same mapping-equality check as every earlier
// grade's version), with the most abstract/literary proverb set of
// the series so far — proverbs whose surface image is further from
// their intended meaning than the concrete, everyday ones used at
// Grades 4-6.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 10, name: /tamil/i });
  if (!subject) {
    subject = await Subject.create({ name: "Tamil", grade: 10 });
    console.log("Created new Grade 10 Tamil subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "பழமொழிகளின் ஆழ்ந்த பொருள்" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "இலக்கியப் பழமொழிகள்",
      title: "பழமொழிகளின் ஆழ்ந்த பொருள்",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "உருவகத்திற்குப் பின்னால் உள்ள கருத்து" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "உருவகத்திற்குப் பின்னால் உள்ள கருத்து",
      explanation_text:
        "சில பழமொழிகளின் மேலோட்டமான சொற்கள் அவை உண்மையில் சொல்ல வரும் கருத்திலிருந்து வெகு தொலைவில் இருக்கும். அத்தகைய பழமொழிகளைப் புரிந்துகொள்ள, அதன் உவமையை மட்டும் படிக்காமல், அது சமூகத்திற்கோ அல்லது வாழ்க்கைக்கோ சொல்லும் ஆழமான கருத்தைச் சிந்திக்க வேண்டும்.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const proverbChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 10) — 1",
      difficulty: "medium",
      order_index: 1,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான ஆழமான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "ஆற்றில் போட்டாலும் அளந்து போடு" },
          { id: "s2", label: "கொடுத்தும் குறையாத செல்வம் கல்வி" },
        ],
        components: [
          { id: "c1", label: "வளங்கள் ஏராளமாகத் தோன்றினாலும், மதிப்பாகவே பயன்படுத்த வேண்டும்" },
          { id: "c2", label: "பகிர்ந்தால் குறையாத ஒரே செல்வம் அறிவு" },
          { id: "c3", label: "பணத்தை எப்போதும் மறைத்து வைக்க வேண்டும்" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "முதல் பழமொழி வளங்களை வீணாக்காமல் பயன்படுத்துவதைப் பற்றியது; இரண்டாவது கல்வியின் தனித்தன்மையைப் பற்றியது.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 10) — 2",
      difficulty: "hard",
      order_index: 2,
      payload: {
        scenario: "மூன்று பழமொழிகளுக்கும் சரியான ஆழமான பொருளைப் பொருத்துக.",
        slots: [
          { id: "t1", label: "நாளைக் காய்ச்சப்படாத அரிசி இல்லை" },
          { id: "t2", label: "ஆற்றில் போட்டாலும் அளந்து போடு" },
          { id: "t3", label: "கொடுத்தும் குறையாத செல்வம் கல்வி" },
        ],
        components: [
          { id: "d1", label: "காலம் செல்லச் செல்ல எல்லாமே நடந்தே தீரும் என்ற உறுதி" },
          { id: "d2", label: "வளங்கள் ஏராளமாகத் தோன்றினாலும் மதிப்பாகவே பயன்படுத்த வேண்டும்" },
          { id: "d3", label: "பகிர்ந்தால் குறையாத ஒரே செல்வம் அறிவு" },
          { id: "d4", label: "நதிகளில் நீச்சல் அடிக்கக் கூடாது என்ற எச்சரிக்கை" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "ஒவ்வொரு பழமொழியும் வேறு கருத்தைச் சொல்கிறது — காலத்தின் உறுதி, வளங்களைச் சிக்கனமாகப் பயன்படுத்துதல், கல்வியின் நிலைத்த தன்மை.",
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

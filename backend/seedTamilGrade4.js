require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 vertical slice. Reuses TAMIL_PROVERB_MATCH (same
// mapping-equality check as the Grade 7 version), with simpler,
// more commonly-taught proverbs for younger learners and titles
// distinct from the Grade 7 set so they don't collide on the
// GameContent title lookup.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: /tamil/i });
  if (!subject) {
    subject = await Subject.create({ name: "Tamil", grade: 4 });
    console.log("Created new Grade 4 Tamil subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "எளிய பழமொழிகள்" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "பழமொழி அறிமுகம்",
      title: "எளிய பழமொழிகள்",
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
        "பழமொழிகள் சிறு வாக்கியங்களில் பெரிய அறிவுரைகளைச் சொல்கின்றன. ஒவ்வொரு பழமொழியிலும் உள்ள முதன்மைச் சொல்லைக் கவனித்தால், அதன் உண்மையான பொருளை எளிதாகக் கண்டுபிடிக்கலாம்.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const proverbChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 4) — 1",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "ஒற்றுமையே பலம்" },
          { id: "s2", label: "படிப்பே செல்வம்" },
        ],
        components: [
          { id: "c1", label: "ஒன்று சேர்ந்து செயல்படுவதே பெரிய பலம்" },
          { id: "c2", label: "கல்வி கற்பதே ஒருவனின் மிகப்பெரிய செல்வம்" },
          { id: "c3", label: "பணமே வாழ்க்கையின் மிகப் பெரிய இலக்கு" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "ஒவ்வொரு பழமொழியிலும் முதல் சொல்லைக் கவனி — ஒற்றுமை, படிப்பு.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 4) — 2",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "மூன்று பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "t1", label: "உழைப்பே உயர்வு" },
          { id: "t2", label: "நன்றி மறவாதே" },
          { id: "t3", label: "ஒற்றுமையே பலம்" },
        ],
        components: [
          { id: "d1", label: "கடினமாக உழைப்பதே ஒருவரை உயர்த்தும்" },
          { id: "d2", label: "நமக்கு உதவியவரை மறக்காமல் இருப்பது நல்லது" },
          { id: "d3", label: "ஒன்று சேர்ந்து செயல்படுவதே பெரிய பலம்" },
          { id: "d4", label: "தூங்குவது ஆரோக்கியத்திற்கு நல்லது" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "ஒவ்வொரு பழமொழியும் வெவ்வேறு அறிவுரையை சொல்கிறது — உழைப்பு, நன்றி, ஒற்றுமை.",
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

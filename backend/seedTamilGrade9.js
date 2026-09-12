require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass: Grade 9 previously had no Tamil at all
// (Tamil otherwise exists at Grades 4, 5, 6, 7, 10). Sits above
// Grade 7's two-round proverb set (seedTamilGrade7.js): three rounds
// instead of two, with the third round adding extra decoy meaning
// cards (matching the difficulty-scaling pattern already used by
// CHEMISTRY_MATCH's "exceptions" round), plus proverbs about
// foresight and prudence rather than the effort/knowledge themes
// already covered at Grades 6-7.
//
// Reuses TAMIL_PROVERB_MATCH (same mapping-equality check as the
// Grade 6/7 versions) — no code changes needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 9, name: /tamil/i });
  if (!subject) {
    subject = await Subject.create({ name: "Tamil", grade: 9 });
    console.log("Created new Grade 9 Tamil subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "தொலைநோக்கும் பழமொழிகளும்" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "மொழி வளம்",
      title: "தொலைநோக்கும் பழமொழிகளும்",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "முன்னெச்சரிக்கையும் விவேகமும்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "முன்னெச்சரிக்கையும் விவேகமும்",
      explanation_text:
        "சில பழமொழிகள் முன்யோசனை, எச்சரிக்கை, விவேகத்துடன் செயல்படுவது பற்றி பேசுகின்றன. இவை நேரடியான அறிவுரையை விட, தவறு நடப்பதற்கு முன்பே தடுப்பதன் முக்கியத்துவத்தை வலியுறுத்துகின்றன.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const proverbChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 9) — 1",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "ஆபத்துக்கு அஞ்சாதே, ஆனால் அசதியாக இராதே" },
          { id: "s2", label: "நெருப்பை மூட்டுவதற்கு முன் புகை பார்" },
          { id: "s3", label: "வருமுன் காப்பதே அறிவு" },
        ],
        components: [
          { id: "c1", label: "ஆபத்தை எதிர்கொள், ஆனால் கவனக்குறைவாக இராதே" },
          { id: "c2", label: "ஒரு செயலைச் செய்யும் முன் அதன் விளைவுகளை எண்ணிப் பார்" },
          { id: "c3", label: "பிரச்சனை வருவதற்கு முன்பே தடுத்துவிடுவதே புத்திசாலித்தனம்" },
          { id: "c4", label: "எதிலும் ஆபத்தில்லாமல் வாழவே முடியாது" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "ஒவ்வொன்றும் ஒரு எச்சரிக்கை — துணிவு, முன்யோசனை, தடுப்பு பற்றியது.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 9) — 2",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "இந்த பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "யானைக்கு ஒரு காலம், பூனைக்கு ஒரு காலம்" },
          { id: "s2", label: "காலம் தவறிய மழை பயனற்றது" },
          { id: "s3", label: "நிதானமே வெற்றியின் தாய்" },
        ],
        components: [
          { id: "c1", label: "வலிமையானவருக்கும் பலவீனமானவருக்கும் தனித்தனி காலம் வரும்" },
          { id: "c2", label: "தேவையான நேரத்தில் கிடைக்காத உதவி பயனற்றது" },
          { id: "c3", label: "அவசரப்படாமல் யோசித்துச் செயல்படுவதே வெற்றிக்கு வழிவகுக்கும்" },
          { id: "c4", label: "மழை எப்போதும் நல்லதே, எப்போது வந்தாலும் சரி" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "ஒவ்வொன்றும் நேரம் மற்றும் சூழ்நிலையின் முக்கியத்துவத்தைப் பற்றியது.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 9) — 3 (திசைதிருப்பும் தேர்வுகளுடன்)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "இந்த பழமொழிகளுக்கு சரியான பொருளைப் பொருத்துக — கூடுதல் தேர்வுகள் திசைதிருப்பக்கூடியவை, எனவே கவனமாக இரு.",
        slots: [
          { id: "s1", label: "ஆற்றின் கரையில் இருந்து நீச்சல் கற்காதே" },
          { id: "s2", label: "கிணறு தோண்டும் முன் தண்ணீர் இருக்கிறதா எனப் பார்" },
          { id: "s3", label: "பாம்பு தெரியாமல் கை வைக்காதே" },
        ],
        components: [
          { id: "c1", label: "செயலில் இறங்காமல் அதைப் பற்றி மட்டும் கற்க முடியாது" },
          { id: "c2", label: "ஒரு பெரிய முயற்சியில் இறங்கும் முன் அதன் சாத்தியத்தை உறுதி செய்" },
          { id: "c3", label: "தெரியாத ஆபத்தில் அவசரமாக ஈடுபடாதே" },
          { id: "c4", label: "நீரில்லாத இடத்தில் கிணறு தோண்டுவது நேரத்தை மட்டும் விரயமாக்கும்" },
          { id: "c5", label: "பாம்புகள் எப்போதும் ஆபத்தானவை, அவற்றைத் தவிர்த்தே விடு" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "c4 மற்றும் c5 நெருக்கமாகத் தெரிந்தாலும் மூல பழமொழியின் நேரடிப் பொருள் அல்ல — மிகச் சரியான பொருளைத் தேர்ந்தெடு.",
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

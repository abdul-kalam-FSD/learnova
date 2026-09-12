require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass: Grade 8 previously had no Tamil at all
// (Tamil otherwise exists at Grades 4, 5, 6, 7, 9, 10). Sits above
// Grade 7's two-round vocabulary-focused proverb set
// (seedTamilGrade7.js): three rounds instead of two, with proverbs
// about unity, cooperation, and honesty — themes not already covered
// at Grade 6 (life lessons) or Grade 7 (vocabulary building) — and
// distinct from Grade 9's foresight/prudence theme.
//
// Reuses TAMIL_PROVERB_MATCH (same mapping-equality check as every
// other grade's version) — no code changes needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 8, name: /tamil/i });
  if (!subject) {
    subject = await Subject.create({ name: "Tamil", grade: 8 });
    console.log("Created new Grade 8 Tamil subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "ஒற்றுமையும் நேர்மையும் பழமொழிகளில்" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "மொழி வளம்",
      title: "ஒற்றுமையும் நேர்மையும் பழமொழிகளில்",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "ஒற்றுமையின் வலிமையும் நேர்மையின் மதிப்பும்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "ஒற்றுமையின் வலிமையும் நேர்மையின் மதிப்பும்",
      explanation_text:
        "சில பழமொழிகள் ஒற்றுமையாக செயல்படுவதன் வலிமையையும், நேர்மையாக வாழ்வதன் மதிப்பையும் எடுத்துரைக்கின்றன. இவை தனிநபர் வலிமையை விட கூட்டு முயற்சியும், வெளித்தோற்றத்தை விட உண்மைத்தன்மையும் எவ்வளவு முக்கியம் என்பதை வலியுறுத்துகின்றன.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const proverbChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 8) — 1",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "ஒற்றுமையே பலம்" },
          { id: "s2", label: "கூடிக் குலவினால் குடும்பம் வாழும்" },
          { id: "s3", label: "தனி மரம் தோப்பாகாது" },
        ],
        components: [
          { id: "c1", label: "ஒன்று சேர்ந்து செயல்படுவதே வலிமையைத் தரும்" },
          { id: "c2", label: "அன்புடன் ஒன்றுபட்டு வாழும் குடும்பம் நிலைத்து வாழும்" },
          { id: "c3", label: "ஒருவர் மட்டும் என்ன செய்தாலும் பெரிய மாற்றம் கொண்டுவர முடியாது" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "மூன்றும் தனிமையை விட கூட்டு முயற்சியின் முக்கியத்துவத்தைப் பற்றியவை.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 8) — 2",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "இந்த பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "உண்மை நாவிற்கு நோய் இல்லை" },
          { id: "s2", label: "வாய்மையே வெல்லும்" },
          { id: "s3", label: "கள்ளத்தனம் நிலைக்காது" },
        ],
        components: [
          { id: "c1", label: "உண்மை பேசுபவருக்கு எதையும் மறைக்க வேண்டிய தேவை இல்லை" },
          { id: "c2", label: "இறுதியில் உண்மை தான் வெற்றி பெறும்" },
          { id: "c3", label: "ஏமாற்றி சம்பாதித்தது நீண்ட காலம் நீடிக்காது" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "மூன்றும் நேர்மையாக வாழ்வதன் நீண்டகால மதிப்பைப் பற்றியவை.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 8) — 3 (திசைதிருப்பும் தேர்வுகளுடன்)",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario:
          "இந்த பழமொழிகளுக்கு சரியான பொருளைப் பொருத்துக — கூடுதல் தேர்வுகள் திசைதிருப்பக்கூடியவை, எனவே கவனமாக இரு.",
        slots: [
          { id: "s1", label: "பல கை ஒன்று சேர்ந்தால் மலையையும் நகர்த்தலாம்" },
          { id: "s2", label: "ஈயாமல் ஈட்டியது இழக்கும்" },
          { id: "s3", label: "நேர்மையானவன் தலை நிமிர்ந்து நடப்பான்" },
        ],
        components: [
          { id: "c1", label: "பலர் இணைந்து முயன்றால் தனியாக முடியாத பெரிய காரியங்களும் சாத்தியமாகும்" },
          { id: "c2", label: "பகிர்ந்து கொள்ளாமல் தேடிய செல்வம் நிலைக்காது" },
          { id: "c3", label: "நேர்மையாக வாழ்பவருக்கு வெட்கப்பட வேண்டிய காரணம் இருக்காது" },
          { id: "c4", label: "ஒன்று சேர்வது எப்போதும் சண்டைக்கே வழிவகுக்கும்" },
          { id: "c5", label: "செல்வத்தை பகிராமல் வைத்திருப்பதே புத்திசாலித்தனம்" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "c4 மற்றும் c5 நேர்மறையான கருத்துகள் அல்ல — மூல பழமொழியின் நேரடிப் பொருளைத் தேர்ந்தெடு.",
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

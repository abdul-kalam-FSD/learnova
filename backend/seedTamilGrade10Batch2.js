require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "உருவகத்திற்குப் பின்னால் உள்ள கருத்து"
// (Grade 10 Tamil, seedTamilGrade10.js) only has 2 GameContent items.
// This adds 2 more TAMIL_PROVERB_MATCH challenges to the SAME
// existing concept, keeping the same "deeper, more abstract meaning"
// framing as the original pair but with proverbs distinct from them.
// Same mapping-equality payload shape — no new mechanic. Errors out
// if the subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /tamil/i });
  if (!subject) {
    console.error("Grade 10 Tamil subject not found — run seedTamilGrade10.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "பழமொழிகளின் ஆழ்ந்த பொருள்" });
  if (!chapter) {
    console.error('Chapter "பழமொழிகளின் ஆழ்ந்த பொருள்" not found — run seedTamilGrade10.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "உருவகத்திற்குப் பின்னால் உள்ள கருத்து" });
  if (!concept) {
    console.error('Concept "உருவகத்திற்குப் பின்னால் உள்ள கருத்து" not found — run seedTamilGrade10.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 10) — 3",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான ஆழமான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "அடி மேல் அடி அடித்தால் அம்மியும் நகரும்" },
          { id: "s2", label: "கல்லானாலும் கை பட்டால் சிலை ஆகும்" },
        ],
        components: [
          { id: "c1", label: "மாறாது என்று தோன்றும் கடினமான சூழலைக்கூட, விடாத தொடர் முயற்சியால் மாற்றியமைக்கலாம் என்பதன் குறியீடு" },
          { id: "c2", label: "இயற்கையாகக் கிடைத்த திறமையைவிட, பயிற்சியால் செதுக்கப்பட்ட முயற்சியே மேன்மையை உருவாக்குகிறது என்பதன் உருவகம்" },
          { id: "c3", label: "அம்மியை நகர்த்துவது ஒரு எளிய வேலை என்ற நேரடிப் பொருள் மட்டும்" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "இரண்டு பழமொழிகளும் நேரடிப் பொருளுக்கு அப்பால், விடாமுயற்சி மற்றும் பயிற்சியின் ஆழமான வலிமையைக் குறிக்கின்றன.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 10) — 4",
      difficulty: "hard",
      order_index: 4,
      payload: {
        scenario: "மூன்று பழமொழிகளுக்கும் சரியான ஆழமான பொருளைப் பொருத்துக.",
        slots: [
          { id: "t1", label: "எறும்பூரும் பாதை புற்றாகும்" },
          { id: "t2", label: "துளி துளியாய்க் கூடினால் பெருவெள்ளம்" },
          { id: "t3", label: "தன் கை தான் பிடித்தால் தலை மேல் குடை" },
        ],
        components: [
          { id: "d1", label: "தனித்தனியே உடனடிப் பலன் தெரியாத சிறு செயல்கள்கூட, காலப்போக்கில் சேர்ந்து பெரிய அமைப்பையே உருவாக்கிவிடும் என்பதன் குறியீடு" },
          { id: "d2", label: "தனித்தனியே பொருட்படுத்தாத சிறு பங்களிப்புகள் ஒன்று திரண்டால் பெரும் சக்தியாக மாறும் என்பதன் குறியீடு — சமூக மாற்றத்திற்கும் இது பொருந்தும்" },
          { id: "d3", label: "மற்றவரை முழுமையாக நம்பி காத்திருப்பதைவிட, சுய முயற்சியே நிலையான முன்னேற்றத்தைத் தரும் என்ற வாழ்க்கை நெறி" },
          { id: "d4", label: "எறும்புகள் எப்போதும் புற்றுக்குள் மட்டுமே வாழும் என்ற இயற்கை உண்மை" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "மூன்றும் நேரடிப் பொருளுக்கு அப்பால் சென்று, சிறு தொடர் செயல்களும் சுயமுயற்சியும் காலப்போக்கில் தரும் பெரும் பலனைக் குறிக்கின்றன.",
      },
    },
  ];

  for (const challenge of newChallenges) {
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "பழமொழிகளின் பொருள்" (Grade 7 Tamil,
// seedTamilGrade7.js) only has 2 GameContent items. This adds 2 more
// TAMIL_PROVERB_MATCH challenges to the SAME existing concept, using
// proverbs distinct from the original pair. Same mapping-equality
// payload shape — no new mechanic. Errors out if the subject/chapter/
// concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: /tamil/i });
  if (!subject) {
    console.error("Grade 7 Tamil subject not found — run seedTamilGrade7.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "பழமொழிகளும் சொல்வளமும்" });
  if (!chapter) {
    console.error('Chapter "பழமொழிகளும் சொல்வளமும்" not found — run seedTamilGrade7.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "பழமொழிகளின் பொருள்" });
  if (!concept) {
    console.error('Concept "பழமொழிகளின் பொருள்" not found — run seedTamilGrade7.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "பழமொழி பொருத்துக — 3",
      difficulty: "medium",
      order_index: 3,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "அடி மேல் அடி அடித்தால் அம்மியும் நகரும்" },
          { id: "s2", label: "தன் கை தான் பிடித்தால் தலை மேல் குடை" },
          { id: "s3", label: "கை நோகாமல் வெண்ணெய் எடுக்க முடியாது" },
        ],
        components: [
          { id: "c1", label: "தொடர்ந்து முயற்சி செய்தால் மிகக் கடினமான காரியத்தையும் சாதிக்கலாம்" },
          { id: "c2", label: "மற்றவரை நம்பி காத்திருக்காமல் தன் காரியத்தைத் தானே செய்வதே சுயமுயற்சி" },
          { id: "c3", label: "சிரமப்படாமல் எந்தப் பலனும் எளிதில் கிடைக்காது" },
          { id: "c4", label: "எதையும் முதலிலேயே கைவிட்டுவிட வேண்டும்" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "ஒவ்வொன்றும் வெவ்வேறு அறிவுரை — தொடர் முயற்சி, சுயசார்பு, உழைப்பும் பலனும்.",
      },
    },
    {
      title: "பழமொழி பொருத்துக — 4",
      difficulty: "hard",
      order_index: 4,
      payload: {
        scenario: "மூன்று பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "t1", label: "துளி துளியாய்க் கூடினால் பெருவெள்ளம்" },
          { id: "t2", label: "எறும்பூரும் பாதை புற்றாகும்" },
          { id: "t3", label: "கல்லானாலும் கை பட்டால் சிலை ஆகும்" },
        ],
        components: [
          { id: "d1", label: "சிறு சிறு சேமிப்புகள் ஒன்று சேர்ந்தால் பெரும் பயனைத் தரும்" },
          { id: "d2", label: "சிறு செயல்களின் தொடர்ச்சியே பெரிய மாற்றத்தை உருவாக்கும்" },
          { id: "d3", label: "முயற்சியும் பயிற்சியும் சாதாரணமான ஒன்றைச் சிறப்பானதாக மாற்றும்" },
          { id: "d4", label: "எதையும் சேமிக்காமல் உடனடியாக செலவழிக்க வேண்டும்" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "ஒவ்வொன்றும் வெவ்வேறு அறிவுரை — சிறு சேமிப்பின் பெருமை, தொடர் செயலின் பலன், பயிற்சியின் மேன்மை.",
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

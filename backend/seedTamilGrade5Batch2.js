require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "பழமொழிகளைப் புரிந்துகொள்ளுதல்" (Grade 5
// Tamil, seedTamilGrade5.js) only has 2 GameContent items. This adds
// 2 more TAMIL_PROVERB_MATCH challenges to the SAME existing concept,
// using two more intermediate-difficulty proverbs distinct from the
// original pair. Same mapping-equality payload shape — no new
// mechanic. Errors out if the subject/chapter/concept don't already
// exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: /tamil/i });
  if (!subject) {
    console.error("Grade 5 Tamil subject not found — run seedTamilGrade5.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "அன்றாட வாழ்வில் பழமொழிகள்" });
  if (!chapter) {
    console.error('Chapter "அன்றாட வாழ்வில் பழமொழிகள்" not found — run seedTamilGrade5.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "பழமொழிகளைப் புரிந்துகொள்ளுதல்" });
  if (!concept) {
    console.error('Concept "பழமொழிகளைப் புரிந்துகொள்ளுதல்" not found — run seedTamilGrade5.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 5) — 3",
      difficulty: "easy",
      order_index: 3,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "எறும்பூரும் பாதை புற்றாகும்" },
          { id: "s2", label: "கை நோகாமல் வெண்ணெய் எடுக்க முடியாது" },
        ],
        components: [
          { id: "c1", label: "சிறு செயல்களைத் தொடர்ந்து செய்தால் பெரிய மாற்றம் உருவாகும்" },
          { id: "c2", label: "சிரமப்படாமல் எந்தப் பலனும் எளிதில் கிடைக்காது" },
          { id: "c3", label: "எதுவும் செய்யாமல் இருந்தாலே எல்லாம் நடந்துவிடும்" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "முதல் பழமொழி எறும்புகள் நடக்கும் பாதையைப் பற்றியது; இரண்டாவது உழைப்பும் பலனும் இணைந்திருப்பதைப் பற்றியது.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 5) — 4",
      difficulty: "medium",
      order_index: 4,
      payload: {
        scenario: "மூன்று பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "t1", label: "துளி துளியாய்க் கூடினால் பெருவெள்ளம்" },
          { id: "t2", label: "கல்லானாலும் கை பட்டால் சிலை ஆகும்" },
          { id: "t3", label: "தன் கை தான் பிடித்தால் தலை மேல் குடை" },
        ],
        components: [
          { id: "d1", label: "சிறு சிறு சேமிப்புகளும் ஒன்று சேர்ந்தால் பெரிதாக மாறும்" },
          { id: "d2", label: "தொடர் பயிற்சியும் முயற்சியும் சாதாரணமானதையும் சிறப்பானதாக மாற்றும்" },
          { id: "d3", label: "மற்றவரை நம்பி காத்திருக்காமல் தன் காரியத்தைத் தானே செய்வது புத்திசாலித்தனம்" },
          { id: "d4", label: "எல்லாவற்றையும் ஒரே நாளில் முடிக்க வேண்டும்" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "ஒவ்வொன்றும் வெவ்வேறு அறிவுரை — சிறு சேமிப்பின் பெருமை, பயிற்சியின் பலன், சுயமுயற்சி.",
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

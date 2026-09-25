require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "பழமொழியில் மறைந்திருக்கும் அறிவுரை"
// (Grade 6 Tamil, seedTamilGrade6.js) only has 2 GameContent items.
// This adds 2 more TAMIL_PROVERB_MATCH challenges to the SAME
// existing concept, using two more proverbs distinct from the
// original pair. Same mapping-equality payload shape — no new
// mechanic. Errors out if the subject/chapter/concept don't already
// exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 6, name: /tamil/i });
  if (!subject) {
    console.error("Grade 6 Tamil subject not found — run seedTamilGrade6.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "பழமொழிகளும் வாழ்க்கை பாடமும்" });
  if (!chapter) {
    console.error('Chapter "பழமொழிகளும் வாழ்க்கை பாடமும்" not found — run seedTamilGrade6.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "பழமொழியில் மறைந்திருக்கும் அறிவுரை" });
  if (!concept) {
    console.error('Concept "பழமொழியில் மறைந்திருக்கும் அறிவுரை" not found — run seedTamilGrade6.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 6) — 3",
      difficulty: "easy",
      order_index: 3,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "பேசுவது வெள்ளி; பேசாமலிருப்பது பொன்" },
          { id: "s2", label: "கடுகு சிறுத்தாலும் காரம் குறையாது" },
        ],
        components: [
          { id: "c3", label: "எப்போதும் அதிகமாகப் பேசுவதே சிறந்தது" },
          { id: "c2", label: "சிறியது என்று எதையும் குறைவாக மதிப்பிடக் கூடாது" },
          { id: "c1", label: "தேவைக்கு மேல் பேசாமல் இருப்பதே பெரும்பாலும் நல்லது" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "முதல் பழமொழி பேச்சில் அளவைப் பற்றியது; இரண்டாவது கடுகைப் போல சிறியதன் திறமையைப் பற்றியது.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 6) — 4",
      difficulty: "medium",
      order_index: 4,
      payload: {
        scenario: "மூன்று பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "t1", label: "எறும்பூரும் பாதை புற்றாகும்" },
          { id: "t2", label: "கல்லானாலும் கை பட்டால் சிலை ஆகும்" },
          { id: "t3", label: "நல்ல நண்பன் நல்வழி காட்டுவான்" },
        ],
        components: [
          { id: "d4", label: "எல்லோரும் ஒரே மாதிரி நடந்துகொள்ள வேண்டும்" },
          { id: "d3", label: "நல்ல நட்பு நம் குணத்தையும் வழியையும் நல்லதாக்கும்" },
          { id: "d2", label: "பயிற்சியும் முயற்சியும் சாதாரண திறனையும் சிறப்பானதாக மாற்றும்" },
          { id: "d1", label: "தொடர்ந்து செய்யும் சிறு செயல்கள் காலப்போக்கில் பெரிய மாற்றத்தை உருவாக்கும்" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "ஒவ்வொன்றும் வெவ்வேறு அறிவுரை — தொடர் செயலின் பலன், பயிற்சியின் மேன்மை, நல்ல நட்பு.",
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

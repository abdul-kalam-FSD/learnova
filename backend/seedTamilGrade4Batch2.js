require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "பழமொழிகளின் பொருள்" (Grade 4 Tamil,
// seedTamilGrade4.js) only has 2 GameContent items. This adds 2 more
// TAMIL_PROVERB_MATCH challenges to the SAME existing concept, using
// two more well-known, simple proverbs distinct from the original
// pair. Same mapping-equality payload shape — no new mechanic. Errors
// out if the subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 4, name: /tamil/i });
  if (!subject) {
    console.error("Grade 4 Tamil subject not found — run seedTamilGrade4.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "எளிய பழமொழிகள்" });
  if (!chapter) {
    console.error('Chapter "எளிய பழமொழிகள்" not found — run seedTamilGrade4.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "பழமொழிகளின் பொருள்" });
  if (!concept) {
    console.error('Concept "பழமொழிகளின் பொருள்" not found — run seedTamilGrade4.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 4) — 3",
      difficulty: "easy",
      order_index: 3,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "கடுகு சிறுத்தாலும் காரம் குறையாது" },
          { id: "s2", label: "தன் கை தான் பிடித்தால் தலை மேல் குடை" },
        ],
        components: [
          { id: "c1", label: "உடலால் சிறியதாக இருந்தாலும் திறமையோ ஆற்றலோ குறையாது" },
          { id: "c2", label: "தன் வேலையைத் தானே செய்வதே சிறந்தது" },
          { id: "c3", label: "மற்றவரிடம் எப்போதும் உதவி கேட்க வேண்டும்" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "முதல் பழமொழி கடுகைப் பற்றியது — சிறியது என்றாலும் சக்தி குறையாது; இரண்டாவது சுயமுயற்சியைப் பற்றியது.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 4) — 4",
      difficulty: "medium",
      order_index: 4,
      payload: {
        scenario: "மூன்று பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "t1", label: "பேசுவது வெள்ளி; பேசாமலிருப்பது பொன்" },
          { id: "t2", label: "நல்ல நண்பன் நல்வழி காட்டுவான்" },
          { id: "t3", label: "அடி மேல் அடி அடித்தால் அம்மியும் நகரும்" },
        ],
        components: [
          { id: "d1", label: "தேவைக்கு மேல் பேசாமல் இருப்பதே பெரும்பாலும் நல்லது" },
          { id: "d2", label: "நல்ல நண்பர்கள் நம்மை நல்ல வழியில் அழைத்துச் செல்வர்" },
          { id: "d3", label: "தொடர்ந்து முயற்சி செய்தால் மிகக் கடினமான காரியமும் நடக்கும்" },
          { id: "d4", label: "எதையும் முயற்சி செய்யாமலேயே விட்டுவிட வேண்டும்" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "ஒவ்வொன்றும் வெவ்வேறு அறிவுரை — பேச்சில் அளவு, நல்ல நட்பு, தொடர் முயற்சி.",
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

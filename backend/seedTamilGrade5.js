require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 5 currently has no 2nd-language content at all.
// Reuses TAMIL_PROVERB_MATCH (same mapping-equality check as the
// Grade 4/7 versions), with a proverb set of intermediate difficulty
// — pitched between Grade 4's simplest set and Grade 7's set — and
// titles distinct from both so they don't collide on the GameContent
// title lookup.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /tamil/i });
  if (!subject) {
    subject = await Subject.create({ name: "Tamil", grade: 5 });
    console.log("Created new Grade 5 Tamil subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "அன்றாட வாழ்வில் பழமொழிகள்" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "பழமொழி பயிற்சி",
      title: "அன்றாட வாழ்வில் பழமொழிகள்",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "பழமொழிகளைப் புரிந்துகொள்ளுதல்" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "பழமொழிகளைப் புரிந்துகொள்ளுதல்",
      explanation_text:
        "பழமொழிகள் நேரடியான சொற்களைக் காட்டிலும் ஒரு உவமையின் மூலம் அறிவுரையைச் சொல்கின்றன. அதன் மேலோட்டமான பொருளுக்குப் பின்னால் உள்ள ஆழமான கருத்தை புரிந்துகொள்ள வேண்டும்.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const proverbChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 5) — 1",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "தூக்கணாங் குருவியும் தன் கூட்டைத் தானே கட்டும்" },
          { id: "s2", label: "கீழே விழுந்தாலும் மீசையில் மண் ஒட்டவில்லை" },
        ],
        components: [
          { id: "c1", label: "சிறியவை என்று தோன்றினாலும் தன் வேலையைத் தானே சரியாகச் செய்யும்" },
          { id: "c2", label: "தோல்வியிலும் தன் கவுரவத்தைக் காத்துக் கொள்ளுதல்" },
          { id: "c3", label: "எப்போதும் மற்றவரிடம் உதவி கேட்பது" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "முதல் பழமொழி ஒரு பறவையின் சுயமுயற்சியைப் பற்றியது; இரண்டாவது தோல்வியிலும் நிமிர்ந்து நிற்பதைப் பற்றியது.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 5) — 2",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "மூன்று பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "t1", label: "ஆடிப்போட்டாலும் நாடகம் முடியும் வரை நில்" },
          { id: "t2", label: "கல் மேல் நாலு மழை பெய்தால் என்ன" },
          { id: "t3", label: "தூக்கணாங் குருவியும் தன் கூட்டைத் தானே கட்டும்" },
        ],
        components: [
          { id: "d1", label: "ஒரு காரியத்தை இடையில் நிறுத்தாமல் முடிக்க வேண்டும்" },
          { id: "d2", label: "கடினமான இதயம் கொண்டவரிடம் அறிவுரை பலனளிக்காது" },
          { id: "d3", label: "தன் வேலையைத் தானே செய்யும் சுயசார்பு" },
          { id: "d4", label: "எல்லோரும் ஒரே நேரத்தில் சாப்பிட வேண்டும் என்பது" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "ஒவ்வொரு பழமொழியும் வெவ்வேறு அறிவுரையை சொல்கிறது — முடிவு வரை நிற்றல், கடின மனது, சுயசார்பு.",
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

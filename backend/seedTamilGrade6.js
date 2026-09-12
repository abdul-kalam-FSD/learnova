require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 6 currently has no 2nd-language content. Reuses
// TAMIL_PROVERB_MATCH (same mapping-equality check as the Grade
// 4/5/7 versions), with titles distinct from all three so they don't
// collide on the GameContent title lookup.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: /tamil/i });
  if (!subject) {
    subject = await Subject.create({ name: "Tamil", grade: 6 });
    console.log("Created new Grade 6 Tamil subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "பழமொழிகளும் வாழ்க்கை பாடமும்" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "பழமொழி பயிற்சி",
      title: "பழமொழிகளும் வாழ்க்கை பாடமும்",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "பழமொழியில் மறைந்திருக்கும் அறிவுரை" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "பழமொழியில் மறைந்திருக்கும் அறிவுரை",
      explanation_text:
        "ஒவ்வொரு பழமொழியும் ஒரு உவமையின் மூலம் வாழ்க்கைக்கான அறிவுரையைச் சொல்கிறது. உவமையை மட்டும் புரிந்துகொள்வதைவிட, அது சுட்டிக்காட்டும் உண்மையான பாடத்தைப் புரிந்துகொள்வது முக்கியம்.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const proverbChallenges = [
    {
      title: "பழமொழி பொருத்துக (Grade 6) — 1",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "ஒவ்வொரு பழமொழிக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "s1", label: "நாளைக் காய்ச்சப்படாத அரிசி இல்லை" },
          { id: "s2", label: "விதைத்தவன் அறுப்பான்" },
        ],
        components: [
          { id: "c1", label: "செய்த செயலுக்கேற்ப பலன் கிடைக்கும்" },
          { id: "c2", label: "எல்லாம் ஒரு நாள் நடக்கும் என்ற உறுதி" },
          { id: "c3", label: "எதையும் எளிதாகப் பெறலாம் என்ற எண்ணம்" },
        ],
        correct_mapping: { s1: "c2", s2: "c1" },
        hint: "முதல் பழமொழி நேரம் ஆனாலும் நடக்கும் என்பதைப் பற்றியது; இரண்டாவது விதைத்ததற்கேற்ப அறுவடை என்பதைப் பற்றியது.",
      },
    },
    {
      title: "பழமொழி பொருத்துக (Grade 6) — 2",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "மூன்று பழமொழிகளுக்கும் சரியான பொருளைப் பொருத்துக.",
        slots: [
          { id: "t1", label: "கிணறு வெட்டி தாகம் தீர்க்க முடியாது" },
          { id: "t2", label: "நல்லது செய்தால் நல்லதே கிடைக்கும்" },
          { id: "t3", label: "விதைத்தவன் அறுப்பான்" },
        ],
        components: [
          { id: "d1", label: "அவசரமாக ஒரு காரியத்தைத் தொடங்கினால் உடனடி பலன் கிடைக்காது" },
          { id: "d2", label: "நல்ல செயல்களுக்கு நல்ல பலனே திரும்பி வரும்" },
          { id: "d3", label: "செய்த செயலுக்கேற்ப பலன் கிடைக்கும்" },
          { id: "d4", label: "எல்லோரும் ஒரே நேரத்தில் தண்ணீர் குடிக்க வேண்டும்" },
        ],
        correct_mapping: { t1: "d1", t2: "d2", t3: "d3" },
        hint: "ஒவ்வொரு பழமொழியும் வெவ்வேறு அறிவுரையை சொல்கிறது — பொறுமை, நல்வினை, செய்த செயலின் பலன்.",
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

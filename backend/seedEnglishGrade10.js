require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 10 currently has no English content. Steps
// beyond Grade 8's single Greek/Latin root + affix words
// (seedEnglishGrade8.js): academic/scientific words built from TWO
// combined Greek/Latin roots plus an affix, which is a genuinely
// harder recall task since neither root piece is a whole English
// word and there are three unfamiliar pieces to order instead of two.
//
// Reuses ENGLISH_WORD_FORGE (same ordered-sequence check as every
// other grade's version).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 10, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 10 });
    console.log("Created new Grade 10 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Compound Academic Vocabulary" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Vocabulary Building",
      title: "Compound Academic Vocabulary",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Words Built from Two Combined Roots" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Words Built from Two Combined Roots",
      explanation_text:
        "Many academic and scientific words are formed by joining two Greek or Latin roots together, sometimes with a suffix — 'photo' (light) plus 'synthesis' (putting together) gives 'photosynthesis'. Since neither root is a familiar whole English word on its own, getting the order right means recognizing each root's individual meaning, not just recognizing the finished word.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const wordChallenges = [
    {
      title: "Forge: photosynthesis",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "the process by which plants use light to make food",
        scrambled_pieces: [
          { id: "w2", label: "synthesis (putting together)" },
          { id: "w1", label: "photo (light)" },
        ],
        correct_order: ["w1", "w2"],
        hint: "The source of energy (light) comes first, then the process it powers.",
      },
    },
    {
      title: "Forge: geothermal",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_meaning: "relating to heat from within the Earth",
        scrambled_pieces: [
          { id: "x2", label: "thermal (heat)" },
          { id: "x1", label: "geo (earth)" },
        ],
        correct_order: ["x1", "x2"],
        hint: "The source (the Earth) comes first, then the kind of energy it produces.",
      },
    },
    {
      title: "Forge: chronological",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_meaning: "arranged in the order in which events happened",
        scrambled_pieces: [
          { id: "y2", label: "log (study/order)" },
          { id: "y3", label: "ical" },
          { id: "y1", label: "chrono (time)" },
        ],
        correct_order: ["y1", "y2", "y3"],
        hint: "'chrono-' (time) comes first, then the root about ordering, then the adjective-forming suffix.",
      },
    },
  ];

  for (const challenge of wordChallenges) {
    const exists = await GameContent.findOne({
      game_type: "ENGLISH_WORD_FORGE",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_WORD_FORGE",
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

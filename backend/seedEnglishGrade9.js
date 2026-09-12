require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass: Grade 9 previously had Mathematics,
// Science, and Social Science, but no English, Computer Science, or
// Tamil at all (this file covers English; see seedCSGrade9.js and
// seedTamilGrade9.js for the other two). Sits above Grade 8's
// two-piece Greek/Latin root words (seedEnglishGrade8.js): words
// built from THREE Greek/Latin roots stacked together, a genuinely
// harder ordering task than assembling just two pieces.
//
// Reuses ENGLISH_WORD_FORGE (same ordered-sequence check as every
// other grade's version) — no code changes needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 9, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 9 });
    console.log("Created new Grade 9 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Words Built from Three Roots" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Vocabulary Building",
      title: "Words Built from Three Roots",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Stacking Three Greek/Latin Roots" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Stacking Three Greek/Latin Roots",
      explanation_text:
        "Some technical words are built from three word-parts instead of two, each carrying its own piece of meaning. 'Photosynthesis' combines 'photo' (light), 'syn' (together), and 'thesis' (putting/placing) — the process of putting together food using light. Getting the order right matters just as much as with two-piece words.",
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
        target_meaning: "the process plants use to make food using light",
        scrambled_pieces: [
          { id: "w1", label: "thesis (putting/placing)" },
          { id: "w2", label: "photo (light)" },
          { id: "w3", label: "syn (together)" },
        ],
        correct_order: ["w2", "w3", "w1"],
        hint: "What's used (light) comes first, then how it's combined (together), then what's built (placing/putting).",
      },
    },
    {
      title: "Forge: microorganism",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_meaning: "a tiny living thing too small to see without help",
        scrambled_pieces: [
          { id: "x1", label: "ism (a thing/state of being)" },
          { id: "x2", label: "micro (tiny)" },
          { id: "x3", label: "organ (a working part of a living body)" },
        ],
        correct_order: ["x2", "x3", "x1"],
        hint: "The size comes first, then what kind of thing it is, then the ending that turns it into 'a thing that is...'.",
      },
    },
    {
      title: "Forge: hydroelectricity",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_meaning: "electricity generated using the force of moving water",
        scrambled_pieces: [
          { id: "y1", label: "electric (relating to electricity)" },
          { id: "y2", label: "hydro (water)" },
          { id: "y3", label: "ity (the state/quality of)" },
        ],
        correct_order: ["y2", "y1", "y3"],
        hint: "The power source (water) comes first, then what it produces (electric), then the ending that makes it a noun.",
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

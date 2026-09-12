require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass: Grade 8 previously had Chemistry, CS,
// Geography, History — no English (English otherwise exists at
// Grades 4, 5, 6). Reuses ENGLISH_WORD_FORGE's ordered-sequence
// mechanic with the natural next step up from Grade 6's common
// English prefix/root/suffix words: Greek and Latin root words,
// where neither piece is a recognizable whole English word on its
// own (unlike "un-" + "happy") — a genuinely harder recall task,
// not just a longer version of the same thing.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 8, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 8 });
    console.log("Created new Grade 8 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Greek and Latin Roots" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Vocabulary Building",
      title: "Greek and Latin Roots",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Building Words from Greek and Latin Roots" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Building Words from Greek and Latin Roots",
      explanation_text:
        "Many English words, especially in science, are built from Greek and Latin word-parts rather than whole English words. 'Photo' (light) plus 'graph' (writing) makes 'photograph' — a device that writes with light. Unlike prefixes such as 'un-', these roots usually carry the main meaning themselves and combine with each other directly.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const wordChallenges = [
    {
      title: "Forge: photograph",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "an image made by recording light",
        scrambled_pieces: [
          { id: "w1", label: "graph (writing)" },
          { id: "w2", label: "photo (light)" },
        ],
        correct_order: ["w2", "w1"],
        hint: "The thing that's captured (light) comes first; the process (writing/recording) comes second.",
      },
    },
    {
      title: "Forge: thermometer",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_meaning: "a device that measures heat",
        scrambled_pieces: [
          { id: "x1", label: "meter (measure)" },
          { id: "x2", label: "thermo (heat)" },
        ],
        correct_order: ["x2", "x1"],
        hint: "What's being measured comes first; the measuring tool's name comes second.",
      },
    },
    {
      title: "Forge: biology",
      difficulty: "medium",
      order_index: 3,
      payload: {
        target_meaning: "the study of living things",
        scrambled_pieces: [
          { id: "y1", label: "logy (study of)" },
          { id: "y2", label: "bio (life)" },
        ],
        correct_order: ["y2", "y1"],
        hint: "The subject being studied comes first; '-logy' meaning 'study of' always comes last.",
      },
    },
    {
      title: "Forge: telegraph",
      difficulty: "hard",
      order_index: 4,
      payload: {
        target_meaning: "a device that writes/sends messages over distance",
        scrambled_pieces: [
          { id: "z1", label: "graph (writing)" },
          { id: "z2", label: "tele (far/distance)" },
        ],
        correct_order: ["z2", "z1"],
        hint: "Same pattern as 'photograph' — the distance/condition comes first, 'graph' comes last.",
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

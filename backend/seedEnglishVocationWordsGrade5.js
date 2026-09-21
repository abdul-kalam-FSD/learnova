require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 English — Decision A-1 (APPROVED): skill-based
// chapter inspired by Santoor Unit 5 "Work is Worship" (Chapters 9-10,
// "Vocation" and "Glass Bangles"). Transferable skill: forming
// agent-noun words that name a person by their job/craft using the
// "-er"/"-or" suffix (teach->teacher, act->actor) — vocation
// vocabulary directly tied to this unit's theme, and a genuinely
// different suffix set from the existing "-ful"/"un-" chapter.
//
// Reuses ENGLISH_WORD_FORGE. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 5, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 5 });
    console.log("Created new Grade 5 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Words for Work and Vocation" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Vocabulary Building",
      title: "Words for Work and Vocation",
      order_index: 6,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Naming a Worker with '-er' and '-or'" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Naming a Worker with '-er' and '-or'",
      explanation_text:
        "Adding '-er' or '-or' to an action word (a verb) often names the person who does that action as their job — 'teach' becomes 'teacher', 'act' becomes 'actor', 'farm' becomes 'farmer'. Most action words use '-er', but some use '-or' instead — there's no single rule for which, so it helps to notice and remember common examples.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const vocationChallenges = [
    {
      title: "Forge: farmer",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "a person whose job is growing crops or raising animals",
        scrambled_pieces: [
          { id: "w1", label: "-er" },
          { id: "w2", label: "farm" },
        ],
        correct_order: ["w2", "w1"],
        hint: "'-er' attaches to the end of the action word 'farm'.",
      },
    },
    {
      title: "Forge: teacher",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_meaning: "a person whose job is helping others learn",
        scrambled_pieces: [
          { id: "x1", label: "-er" },
          { id: "x2", label: "teach" },
        ],
        correct_order: ["x2", "x1"],
        hint: "'-er' attaches to the end of the action word 'teach'.",
      },
    },
    {
      title: "Forge: sailor",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_meaning: "a person whose job is working on a ship",
        scrambled_pieces: [
          { id: "y1", label: "-or" },
          { id: "y2", label: "sail" },
        ],
        correct_order: ["y2", "y1"],
        hint: "This one is a less common exception — it uses '-or' instead of '-er'.",
      },
    },
  ];

  for (const challenge of vocationChallenges) {
    const exists = await GameContent.findOne({ game_type: "ENGLISH_WORD_FORGE", title: challenge.title });
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

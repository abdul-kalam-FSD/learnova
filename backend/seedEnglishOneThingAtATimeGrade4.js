require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 4
// "One Thing at a Time", Unit 2 "My Beautiful World"). Content
// verified: a poem teaching that focusing on one task at a time
// leads to better, faster, less error-prone work. Reuses
// ENGLISH_SENTENCE_BUILDER. No new mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 4 });
    console.log("Created new Grade 4 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "One Thing at a Time" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "My Beautiful World",
      title: "One Thing at a Time",
      order_index: 4,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading for the Value of Focus" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading for the Value of Focus",
      explanation_text:
        "This poem teaches that doing one task at a time — rather than rushing between many at once — leads to better, faster, more careful work, and helps you feel proud of finishing something well instead of confused by doing too much together.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Focus on One Task",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Do" },
          { id: "w2", label: "one" },
          { id: "w3", label: "thing" },
          { id: "w4", label: "at" },
          { id: "w5", label: "a" },
          { id: "w6", label: "time." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6"],
        hint: "This sentence is very close to the poem's own title.",
      },
    },
    {
      title: "Build: Avoiding Mistakes",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Trying" },
          { id: "w2", label: "to" },
          { id: "w3", label: "do" },
          { id: "w4", label: "many" },
          { id: "w5", label: "things" },
          { id: "w6", label: "together" },
          { id: "w7", label: "causes" },
          { id: "w8", label: "mistakes." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
        hint: "The cause ('trying to do many things together') comes before the effect ('causes mistakes').",
      },
    },
    {
      title: "Build: Finishing Well Brings Pride",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Finishing" },
          { id: "w2", label: "a" },
          { id: "w3", label: "task" },
          { id: "w4", label: "well" },
          { id: "w5", label: "makes" },
          { id: "w6", label: "you" },
          { id: "w7", label: "feel" },
          { id: "w8", label: "proud." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
        hint: "Start with the action that causes the feeling, then say what feeling it causes.",
      },
    },
  ];

  for (const challenge of sentenceChallenges) {
    const exists = await GameContent.findOne({ game_type: "ENGLISH_SENTENCE_BUILDER", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "ENGLISH_SENTENCE_BUILDER",
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

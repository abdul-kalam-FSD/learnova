require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 10
// "The Swing", Unit 4 "Up High"). Content verified: a poem about a
// child on a swing, describing the view of gardens, rooftops and
// the wider world as the swing rises higher. Reuses
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Swing" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Up High",
      title: "The Swing",
      order_index: 10,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading a Poem About Seeing the World From Up High" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading a Poem About Seeing the World From Up High",
      explanation_text:
        "This poem describes a child on a swing, rising higher and higher and seeing more of the world with each swing — gardens, rooftops, and things too far away to see from the ground. It uses the swing as a simple, joyful way to talk about a change in perspective: the higher you go, the more you can see.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Up Goes the Swing",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Up" },
          { id: "w2", label: "goes" },
          { id: "w3", label: "the" },
          { id: "w4", label: "swing," },
          { id: "w5", label: "up" },
          { id: "w6", label: "so" },
          { id: "w7", label: "high." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "This mirrors a simple rhyme pattern — direction word first, then the action, then who or what, then how high.",
      },
    },
    {
      title: "Build: Seeing Over the Garden Wall",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "I" },
          { id: "w2", label: "can" },
          { id: "w3", label: "see" },
          { id: "w4", label: "over" },
          { id: "w5", label: "the" },
          { id: "w6", label: "garden" },
          { id: "w7", label: "wall." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "Who is seeing comes first, then the action, then where they can see over.",
      },
    },
    {
      title: "Build: The Higher You Swing, the More You See",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "higher" },
          { id: "w3", label: "the" },
          { id: "w4", label: "swing" },
          { id: "w5", label: "rises," },
          { id: "w6", label: "the" },
          { id: "w7", label: "more" },
          { id: "w8", label: "the" },
          { id: "w9", label: "world" },
          { id: "w10", label: "opens" },
          { id: "w11", label: "up." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"],
        hint: "This is a 'the more... the more...' comparison — one condition rising alongside its result.",
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

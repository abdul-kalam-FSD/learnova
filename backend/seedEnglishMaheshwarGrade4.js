require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 12
// "Maheshwar", Unit 4 "Up High"). Content verified via NCERT
// solution excerpts and independently confirmed real-world facts:
// Maheshwar Fort sits on the banks of the Narmada River in Madhya
// Pradesh, was once the capital of the Holkar dynasty, and was
// ruled by the well-known queen Ahilyabai Holkar. The chapter
// describes a visit to the fort's balconies, temples and finely
// carved statues and pillars. Reuses ENGLISH_SENTENCE_BUILDER. No
// new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Maheshwar" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Up High",
      title: "Maheshwar",
      order_index: 12,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading About Maheshwar Fort and Its Heritage" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading About Maheshwar Fort and Its Heritage",
      explanation_text:
        "Maheshwar Fort stands on the banks of the Narmada River in Madhya Pradesh. It was once the capital of the Holkar dynasty, ruled by the well-known queen Ahilyabai Holkar. The chapter describes walking along the fort's overhanging balconies with the river below, visiting temples with ringing bells and the fragrance of incense, and admiring finely carved statues and pillars — a visit that fills the narrator with pride in India's heritage.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: A Fort on the Narmada River",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Maheshwar" },
          { id: "w2", label: "Fort" },
          { id: "w3", label: "stands" },
          { id: "w4", label: "on" },
          { id: "w5", label: "the" },
          { id: "w6", label: "Narmada" },
          { id: "w7", label: "River." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "Name the fort first, then where it stands.",
      },
    },
    {
      title: "Build: Ruled by Ahilyabai Holkar",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Queen" },
          { id: "w2", label: "Ahilyabai" },
          { id: "w3", label: "Holkar" },
          { id: "w4", label: "once" },
          { id: "w5", label: "ruled" },
          { id: "w6", label: "Maheshwar." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6"],
        hint: "Name the queen first, then what she once did, then where.",
      },
    },
    {
      title: "Build: Pride in Our Heritage",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Visiting" },
          { id: "w2", label: "Maheshwar" },
          { id: "w3", label: "Fort" },
          { id: "w4", label: "fills" },
          { id: "w5", label: "me" },
          { id: "w6", label: "with" },
          { id: "w7", label: "pride" },
          { id: "w8", label: "in" },
          { id: "w9", label: "our" },
          { id: "w10", label: "heritage." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10"],
        hint: "Start with the action ('visiting Maheshwar Fort'), then what feeling it fills the narrator with.",
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

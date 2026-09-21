require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 7
// "Fit Body, Fit Mind, Fit Nation", Unit 3 "Fun with Games").
// Content verified via NCERT solution excerpts: the chapter links
// fitness to focus and covers the Paralympics — wheelchair racing,
// para-swimming, blind football — as an example of how hard work,
// determination and practice help athletes rise above challenges,
// celebrating ability, confidence and equal opportunity. Reuses
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Fit Body, Fit Mind, Fit Nation" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Fun with Games",
      title: "Fit Body, Fit Mind, Fit Nation",
      order_index: 7,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading About Fitness and the Paralympics" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading About Fitness and the Paralympics",
      explanation_text:
        "This chapter connects a fit body to a fit, focused mind, and celebrates fitness at the level of a whole nation. It highlights the Paralympics — where athletes compete in sports like wheelchair racing, para-swimming and blind football — as an example of how hard work, determination and practice help people rise above challenges, celebrating ability, confidence and equal opportunity.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: A Fit Body Helps the Mind",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "A" },
          { id: "w2", label: "fit" },
          { id: "w3", label: "body" },
          { id: "w4", label: "helps" },
          { id: "w5", label: "a" },
          { id: "w6", label: "fit" },
          { id: "w7", label: "mind." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "This sentence mirrors the chapter's own title, in order.",
      },
    },
    {
      title: "Build: Sports at the Paralympics",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "Paralympics" },
          { id: "w3", label: "include" },
          { id: "w4", label: "sports" },
          { id: "w5", label: "like" },
          { id: "w6", label: "wheelchair" },
          { id: "w7", label: "racing." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        hint: "Name the event first, then what it includes.",
      },
    },
    {
      title: "Build: Rising Above Challenges",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Hard" },
          { id: "w2", label: "work" },
          { id: "w3", label: "and" },
          { id: "w4", label: "practice" },
          { id: "w5", label: "help" },
          { id: "w6", label: "athletes" },
          { id: "w7", label: "rise" },
          { id: "w8", label: "above" },
          { id: "w9", label: "challenges." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9"],
        hint: "Two causes joined by 'and' come first, then who they help, then what those athletes achieve.",
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

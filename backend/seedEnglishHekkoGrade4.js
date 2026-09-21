require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, Santoor Chapter 9
// "Hekko", Unit 3 "Fun with Games"). Content verified directly from
// the official NCERT textbook PDF (ncert.nic.in): Hekko is a
// traditional team game from the Mokokchung district of Nagaland.
// 'Hek' means challenge and 'ko' means tiger — a folk story tells of
// humans ("Aami") and tigers ("Aakho") disagreeing about who was
// superior, leading to the challenge game. Two teams of 11 play in
// a circle: Aami forms a human chain trying to stay inside, Aakho
// tries to push them out; a caught Aakho player must say "Joko"
// (surrender) to be released. Reuses ENGLISH_SENTENCE_BUILDER. No
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Hekko" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Fun with Games",
      title: "Hekko",
      order_index: 9,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Reading About a Naga Folk Game: Hekko" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Reading About a Naga Folk Game: Hekko",
      explanation_text:
        "Hekko, meaning 'challenging the tiger' ('hek' = challenge, 'ko' = tiger), is a traditional game from the Mokokchung district of Nagaland. It comes from a folk story where humans (Aami) and tigers (Aakho) disagreed about who was superior. In the game, two teams of 11 players compete: the Aami team forms a human chain inside a circle and tries to stay in it, while the Aakho team tries to push them out — a caught Aakho player must say 'Joko' (surrender) before being released.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const sentenceChallenges = [
    {
      title: "Build: Challenging the Tiger",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Hekko" },
          { id: "w2", label: "means" },
          { id: "w3", label: "challenging" },
          { id: "w4", label: "the" },
          { id: "w5", label: "tiger." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5"],
        hint: "Name the word first, then what it means.",
      },
    },
    {
      title: "Build: Two Teams of Eleven",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "Each" },
          { id: "w2", label: "team" },
          { id: "w3", label: "has" },
          { id: "w4", label: "eleven" },
          { id: "w5", label: "players." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5"],
        hint: "Start with 'each team', then say what it has.",
      },
    },
    {
      title: "Build: Saying Joko to Surrender",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered sentence.",
        scrambled_words: [
          { id: "w1", label: "A" },
          { id: "w2", label: "caught" },
          { id: "w3", label: "player" },
          { id: "w4", label: "must" },
          { id: "w5", label: "say" },
          { id: "w6", label: "Joko" },
          { id: "w7", label: "to" },
          { id: "w8", label: "be" },
          { id: "w9", label: "released." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9"],
        hint: "Who is caught comes first, then what they must do, then why.",
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

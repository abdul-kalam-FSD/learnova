require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Gap 4 fill: Grade 7 currently has no English content. Sits between
// Grade 6's 3-piece prefix/root/suffix morphology (seedEnglishGrade6.js)
// and Grade 8's unfamiliar Greek/Latin roots (seedEnglishGrade8.js):
// words built from familiar English pieces, but with an extra affix
// stacked on (a prefix AND two suffixes, or two prefixes), which is
// a genuinely harder ordering task than Grade 6's exactly-3-piece set.
//
// Reuses ENGLISH_WORD_FORGE (same ordered-sequence check as every
// other grade's version).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: /english/i });
  if (!subject) {
    subject = await Subject.create({ name: "English", grade: 7 });
    console.log("Created new Grade 7 English subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Words with Multiple Affixes" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Vocabulary Building",
      title: "Words with Multiple Affixes",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Stacking More Than One Affix" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Stacking More Than One Affix",
      explanation_text:
        "Some words carry more than one prefix or suffix at once — 'un-' plus 'believe' plus '-able' plus '-y' all combine into 'unbelievably'. When a word has several pieces, they still combine in a fixed order: prefixes attach closest to the root first, and each suffix builds on the word form the previous one created.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const wordChallenges = [
    {
      title: "Forge: unbelievably",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "in a way that is hard to believe",
        scrambled_pieces: [
          { id: "w2", label: "believe" },
          { id: "w4", label: "y" },
          { id: "w1", label: "un" },
          { id: "w3", label: "able" },
        ],
        correct_order: ["w1", "w2", "w3", "w4"],
        hint: "'un-' negates the root first, then '-able' makes it an adjective, then '-y' turns it into an adverb form.",
      },
    },
    {
      title: "Forge: disrespectful",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_meaning: "showing a lack of respect",
        scrambled_pieces: [
          { id: "x1", label: "dis" },
          { id: "x3", label: "ful" },
          { id: "x2", label: "respect" },
        ],
        correct_order: ["x1", "x2", "x3"],
        hint: "'dis-' negates the root noun, and '-ful' turns the result into an adjective meaning 'full of' (or its opposite here).",
      },
    },
    {
      title: "Forge: irresponsibility",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_meaning: "the quality of not being responsible",
        scrambled_pieces: [
          { id: "y2", label: "response" },
          { id: "y4", label: "ity" },
          { id: "y1", label: "ir" },
          { id: "y3", label: "ible" },
        ],
        correct_order: ["y1", "y2", "y3", "y4"],
        hint: "'ir-' negates words starting with 'r', '-ible' turns the root into an adjective, and '-ity' turns that adjective into a noun.",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Curriculum-coverage pass, Grade 5 gap: Grade 5 previously had
// Mathematics only. Reuses ENGLISH_WORD_FORGE's ordered-sequence
// mechanic (same as Grade 4's compound words and Grade 6's full
// prefix/root/suffix morphology) with the natural difficulty step
// between them: a single prefix OR suffix attached to one whole
// familiar root word, rather than two whole words (Grade 4) or three
// morpheme pieces at once (Grade 6).
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Prefixes and Suffixes" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Vocabulary Building",
      title: "Prefixes and Suffixes",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Adding a Prefix or Suffix to a Root Word" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Adding a Prefix or Suffix to a Root Word",
      explanation_text:
        "A prefix attaches to the front of a word and usually changes its meaning — like 'un-' meaning 'not'. A suffix attaches to the end and often changes what kind of word it is — like '-ful' turning 'care' into a describing word, 'careful'. A prefix always comes before the root; a suffix always comes after it.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  // payload shape: same ordered-sequence shape as Grade 4/6 Word
  // Forge — `scrambled_pieces` shuffled, `correct_order` (stripped
  // server-side) lists the piece ids in the right order.
  const wordChallenges = [
    {
      title: "Forge: unhappy",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "not happy",
        scrambled_pieces: [
          { id: "w1", label: "happy" },
          { id: "w2", label: "un-" },
        ],
        correct_order: ["w2", "w1"],
        hint: "'un-' means 'not' and always attaches to the front of the root word.",
      },
    },
    {
      title: "Forge: careful",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_meaning: "full of care",
        scrambled_pieces: [
          { id: "x1", label: "-ful" },
          { id: "x2", label: "care" },
        ],
        correct_order: ["x2", "x1"],
        hint: "'-ful' means 'full of' and always attaches to the end of the root word.",
      },
    },
    {
      title: "Forge: rebuild",
      difficulty: "medium",
      order_index: 3,
      payload: {
        target_meaning: "to build again",
        scrambled_pieces: [
          { id: "y1", label: "build" },
          { id: "y2", label: "re-" },
        ],
        correct_order: ["y2", "y1"],
        hint: "'re-' means 'again' and goes at the front, just like 'un-' did.",
      },
    },
    {
      title: "Forge: painless",
      difficulty: "hard",
      order_index: 4,
      payload: {
        target_meaning: "without pain",
        scrambled_pieces: [
          { id: "z1", label: "-less" },
          { id: "z2", label: "pain" },
        ],
        correct_order: ["z2", "z1"],
        hint: "'-less' means 'without' — it's a suffix, so it still goes at the end, even though its meaning is close to 'un-'.",
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

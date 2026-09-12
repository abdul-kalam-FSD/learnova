require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 vertical slice. Reuses ENGLISH_WORD_FORGE (same
// ordered-placement check as the Grade 6 prefix/root/suffix version)
// but with simple compound words instead of morphology — assembling
// two whole, familiar words into one is the Grade 4-appropriate
// version of the same "pieces in the right order" mechanic.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Compound Words" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Vocabulary Building",
      title: "Compound Words",
      order_index: 1,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Joining Two Words Into One" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Joining Two Words Into One",
      explanation_text:
        "A compound word is made by joining two smaller words together to make a brand new word with its own meaning. For example, 'sun' and 'light' join to make 'sunlight'. The order of the two words matters — 'lightsun' isn't a word at all.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const wordChallenges = [
    {
      title: "Forge: sunlight",
      difficulty: "easy",
      order_index: 1,
      payload: {
        target_meaning: "light that comes from the sun",
        scrambled_pieces: [
          { id: "w1", label: "light" },
          { id: "w2", label: "sun" },
        ],
        correct_order: ["w2", "w1"],
        hint: "Which word names the source, and which word names the thing it gives off?",
      },
    },
    {
      title: "Forge: playground",
      difficulty: "medium",
      order_index: 2,
      payload: {
        target_meaning: "a ground where children play",
        scrambled_pieces: [
          { id: "x1", label: "ground" },
          { id: "x2", label: "play" },
        ],
        correct_order: ["x2", "x1"],
        hint: "What kind of ground is it? That word comes first.",
      },
    },
    {
      title: "Forge: butterfly",
      difficulty: "hard",
      order_index: 3,
      payload: {
        target_meaning: "a flying insect with colourful wings",
        scrambled_pieces: [
          { id: "y1", label: "fly" },
          { id: "y2", label: "butter" },
        ],
        correct_order: ["y2", "y1"],
        hint: "This one doesn't follow an obvious pattern — you just have to remember the word as it's usually written.",
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

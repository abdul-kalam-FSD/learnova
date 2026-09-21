require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 2 / Grade 5 English — Decision A-1 (APPROVED): skill-based
// chapter inspired by Santoor Unit 2 "My Colourful World" (Chapters
// 3-4, "The Rainbow" and "The Wise Parrot" — both nature/colour-rich
// descriptive pieces). Transferable skill: ordering multiple
// adjectives correctly before a noun to build a vivid, well-formed
// descriptive sentence about nature (colour + size/quality order),
// rather than a comprehension quiz on the specific poem/story.
//
// Reuses ENGLISH_SENTENCE_BUILDER (same order-sensitive mechanic as
// the existing "Prefixes and Suffixes" chapter's second concept).
// No new mechanic needed.
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

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Describing a Colourful World" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Descriptive Language",
      title: "Describing a Colourful World",
      order_index: 3,
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Ordering Adjectives in a Descriptive Sentence" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Ordering Adjectives in a Descriptive Sentence",
      explanation_text:
        "When more than one describing word comes before a noun, they usually follow an order — quality or opinion first (like 'beautiful' or 'bright'), then colour, right before the noun itself. 'A bright, colourful rainbow' sounds natural; 'a colourful, bright rainbow' sounds slightly off. Learning this order helps make nature descriptions sound smooth and natural.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const descriptiveChallenges = [
    {
      title: "Build: A Bright, Colourful Rainbow",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered descriptive sentence.",
        scrambled_words: [
          { id: "w1", label: "A" },
          { id: "w2", label: "bright," },
          { id: "w3", label: "colourful" },
          { id: "w4", label: "rainbow" },
          { id: "w5", label: "arched" },
          { id: "w6", label: "over" },
          { id: "w7", label: "the" },
          { id: "w8", label: "hills." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
        hint: "Quality words like 'bright' usually come before colour words like 'colourful', and both come right before the noun.",
      },
    },
    {
      title: "Build: A Wise, Green Parrot",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered descriptive sentence.",
        scrambled_words: [
          { id: "w1", label: "The" },
          { id: "w2", label: "wise," },
          { id: "w3", label: "green" },
          { id: "w4", label: "parrot" },
          { id: "w5", label: "perched" },
          { id: "w6", label: "on" },
          { id: "w7", label: "a" },
          { id: "w8", label: "tall" },
          { id: "w9", label: "branch." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9"],
        hint: "An opinion word like 'wise' comes before a colour word like 'green', and both sit right before the noun 'parrot'.",
      },
    },
    {
      title: "Build: A Peaceful, Golden Sunset Over the Fields",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario_label: "Arrange these words into a correctly ordered descriptive sentence.",
        scrambled_words: [
          { id: "w1", label: "A" },
          { id: "w2", label: "peaceful," },
          { id: "w3", label: "golden" },
          { id: "w4", label: "sunset" },
          { id: "w5", label: "spread" },
          { id: "w6", label: "slowly" },
          { id: "w7", label: "across" },
          { id: "w8", label: "the" },
          { id: "w9", label: "quiet" },
          { id: "w10", label: "fields." },
        ],
        correct_order: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10"],
        hint: "Keep the opinion-then-colour order for the first noun phrase, and remember an adverb like 'slowly' describes the verb, not the noun.",
      },
    },
  ];

  for (const challenge of descriptiveChallenges) {
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

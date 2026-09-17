require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). "Classifying Substances with an
// Indicator" (Grade 7 Science, seedScienceGrade7.js) only has 2
// GameContent items, both using litmus paper. This adds 2 more
// CHEMISTRY_REACTION_LAB challenges to the SAME existing concept: more
// litmus examples with garden/household substances, and a step up to
// a universal indicator (showing a range of colors for relative acid/
// base STRENGTH, not just litmus's red-or-blue result) — a natural
// depth extension the concept's own mechanic already supports. Same
// mapping-equality payload shape — no new mechanic. Errors out if the
// subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: "Science" });
  if (!subject) {
    console.error("Grade 7 Science subject not found — run seedScienceGrade7.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Acids, Bases, and Salts" });
  if (!chapter) {
    console.error('Chapter "Acids, Bases, and Salts" not found — run seedScienceGrade7.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Classifying Substances with an Indicator" });
  if (!concept) {
    console.error('Concept "Classifying Substances with an Indicator" not found — run seedScienceGrade7.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Test Three Garden Substances",
      difficulty: "easy",
      order_index: 3,
      payload: {
        scenario: "Blue litmus paper is dipped into three substances found around the house and garden. Assign the correct result to each.",
        slots: [
          { id: "s1", label: "Ant sting fluid (contains formic acid)" },
          { id: "s2", label: "Ammonia-based glass cleaner" },
          { id: "s3", label: "Sugar solution" },
        ],
        components: [
          { id: "c1", label: "Blue litmus turns red" },
          { id: "c2", label: "Blue litmus stays blue" },
          { id: "c3", label: "No visible reaction of any kind" },
          { id: "c4", label: "The litmus paper bleaches white" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Ant stings contain formic acid (turns litmus red), ammonia cleaners are basic (litmus stays blue), and sugar solution is neutral.",
      },
    },
    {
      title: "Using a Universal Indicator to Compare Strength",
      difficulty: "medium",
      order_index: 4,
      payload: {
        scenario: "A universal indicator (which shows a RANGE of colors, not just red or blue) is added to three substances. Assign the correct color result to each.",
        slots: [
          { id: "s1", label: "Battery acid (strongly acidic)" },
          { id: "s2", label: "Milk (mildly acidic)" },
          { id: "s3", label: "Soap solution (mildly basic)" },
        ],
        components: [
          { id: "c1", label: "Turns a deep red color (strongly acidic)" },
          { id: "c2", label: "Turns orange-yellow (mildly acidic)" },
          { id: "c3", label: "Turns blue (mildly basic)" },
          { id: "c4", label: "Turns green (neutral)" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Unlike litmus, a universal indicator shows HOW STRONG an acid or base is through a range of colors \u2014 deep red for strong acids, fading toward green near neutral, and blue for bases.",
      },
    },
  ];

  for (const challenge of newChallenges) {
    const exists = await GameContent.findOne({ game_type: "CHEMISTRY_REACTION_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "CHEMISTRY_REACTION_LAB",
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

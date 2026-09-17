require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 5 (content depth only). The reaction-type-classification
// concept in "Types of Chemical Reactions" (Grade 10, has only
// order_index 1 (medium) and 2 (hard) — no easy entry point, and only
// 6 total example reactions across both. This adds 2 more
// CHEMISTRY_REACTION_LAB challenges to the SAME existing concept: an
// easy round with everyday reactions, and a harder round with less
// obvious examples. Same mapping-equality payload shape as the
// original 2 challenges — no new mechanic. Errors out if the
// subject/chapter/concept don't already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 10, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 10 Science subject not found — run seedChemistryReactionLab.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Types of Chemical Reactions" });
  if (!chapter) {
    console.error('Chapter "Types of Chemical Reactions" not found — run seedChemistryReactionLab.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Classifying Reactions" });
  if (!concept) {
    console.error('Concept "Classifying Reactions" not found — run seedChemistryReactionLab.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Everyday Reaction Types",
      difficulty: "easy",
      order_index: 3,
      payload: {
        scenario: "Three familiar reactions are set up. Assign the correct outcome to each.",
        slots: [
          { id: "s1", label: "Baking soda (NaHCO\u2083) heated gently" },
          { id: "s2", label: "Iron nails left in damp air (rusting)" },
          { id: "s3", label: "Hydrogen gas burned in air" },
        ],
        components: [
          { id: "c1", label: "Decomposition \u2014 breaks down into Na\u2082CO\u2083, water, and CO\u2082 gas" },
          { id: "c2", label: "Combination \u2014 iron combines with oxygen to form iron oxide (rust)" },
          { id: "c3", label: "Combustion \u2014 H\u2082 + O\u2082 \u2192 H\u2082O, releasing energy" },
          { id: "c4", label: "Displacement \u2014 a more reactive metal takes the place of a less reactive one" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Look for a substance breaking apart on heating, two things combining with oxygen, or a gas reacting with oxygen to release energy.",
      },
    },
    {
      title: "Classifying Trickier Reactions",
      difficulty: "hard",
      order_index: 4,
      payload: {
        scenario: "Three less obvious reactions are set up. Assign the correct outcome to each.",
        slots: [
          { id: "s1", label: "CuSO\u2084 solution + Zn granules" },
          { id: "s2", label: "KClO\u2083 heated with an MnO\u2082 catalyst" },
          { id: "s3", label: "Carbon (C) burned completely in excess oxygen" },
        ],
        components: [
          { id: "c1", label: "Displacement \u2014 Zn replaces Cu; ZnSO\u2084 forms and Cu metal deposits out" },
          { id: "c2", label: "Decomposition \u2014 2KClO\u2083 \u2192 2KCl + 3O\u2082" },
          { id: "c3", label: "Combustion \u2014 C + O\u2082 \u2192 CO\u2082, releasing energy" },
          { id: "c4", label: "Combination \u2014 two elements join directly with no gas released" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "A less reactive metal gets displaced from solution, a compound breaks down releasing oxygen gas when heated, and an element burns completely in oxygen.",
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

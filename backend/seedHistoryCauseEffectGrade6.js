require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Mechanic-diversity pass for Grade 6 History: reuses the existing
// "The Beginnings of Indian Civilisation" chapter from
// seedHistoryGrade6.js (Harappan Civilisation, currently
// HISTORY_TIMELINE_BUILDER only), adds a new Concept +
// HISTORY_CAUSE_EFFECT_MATCH — same mapping mechanic and payload
// shape as seedHistoryCauseEffectGrade8.js. Where Timeline Builder
// asks "what order did this happen in?", this asks "what did this
// actually cause?" — a different historical-thinking skill.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 6, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 6 Social Science subject not found — run seedHistoryGrade6.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Beginnings of Indian Civilisation" });
  if (!chapter) {
    throw new Error("Chapter 'The Beginnings of Indian Civilisation' not found — run seedHistoryGrade6.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Harappan Practices to Their Effects" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Harappan Practices to Their Effects",
      explanation_text:
        "Knowing that the Harappan Civilisation rose and fell in a certain order isn't the same as understanding why things happened the way they did. Each choice the Harappans made — in city planning, and each change in their environment or trade — led to a specific, real consequence.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const causeEffectChallenges = [
    {
      title: "Harappan Town Planning → Effect",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each feature of Harappan town planning to the effect it actually had.",
        slots: [
          { id: "s1", label: "Cities built on a grid pattern with streets crossing at right angles" },
          { id: "s2", label: "Every house connected to a covered underground drainage system" },
          { id: "s3", label: "A large citadel built on a raised platform, separate from the lower town" },
        ],
        components: [
          { id: "c1", label: "Made it easier to organize traffic, buildings and public spaces in an orderly city" },
          { id: "c2", label: "Kept waste water away from homes and helped maintain public health" },
          { id: "c3", label: "Set apart important buildings for rulers or priests from ordinary homes" },
          { id: "c4", label: "Allowed the city to expand rapidly with no planning at all" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Think about what problem each planning choice actually solved for the people living there.",
      },
    },
    {
      title: "Decline of the Harappan Civilisation → Effect",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each likely cause of Harappan decline to the effect it had on the civilisation.",
        slots: [
          { id: "s1", label: "The course of a major river (like the Ghaggar-Hakra) dried up or shifted over time" },
          { id: "s2", label: "Monsoon rainfall patterns weakened in the region" },
          { id: "s3", label: "Trade routes with Mesopotamia gradually declined" },
        ],
        components: [
          { id: "c1", label: "Farming communities along the river had to abandon their settlements" },
          { id: "c2", label: "Agriculture that depended on regular rains became harder to sustain" },
          { id: "c3", label: "Harappan cities lost an important source of wealth and foreign goods" },
          { id: "c4", label: "The population of Harappan cities suddenly tripled in a few years" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Most theories about the decline point to environmental changes making the old way of life harder to sustain — not a sudden disaster.",
      },
    },
    {
      title: "Harappan Trade and Seals → Effect",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each Harappan practice around trade to what it actually tells historians.",
        slots: [
          { id: "s1", label: "Harappan traders used standardized weights and measures across the region" },
          { id: "s2", label: "Seals carved with animals and an undeciphered script were used on goods" },
          { id: "s3", label: "Harappan beads and cotton cloth have been found as far away as Mesopotamia" },
        ],
        components: [
          { id: "c1", label: "Made trade fair and consistent, since buyers and sellers everywhere used the same units" },
          { id: "c2", label: "Likely marked ownership or origin of goods, though the script still can't be read" },
          { id: "c3", label: "Shows the Harappans were part of a wider long-distance trade network" },
          { id: "c4", label: "Proves Harappans and Mesopotamians spoke exactly the same language" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Be careful with the seals — historians know they were used for something, but the script itself has never been deciphered.",
      },
    },
  ];

  for (const challenge of causeEffectChallenges) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_CAUSE_EFFECT_MATCH",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_CAUSE_EFFECT_MATCH",
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Fills the Grade 6 History hole in Social Science — Grade 6
// previously only had a Civics strand (Understanding and Respecting
// Diversity, via seedSocialScienceGrade6.js) and, as of this pass,
// Geography (Oceans and Continents, via seedGeographyGrade6.js), but
// no History. Grounded in the current NCERT Class 6 Social Science
// textbook, "Exploring Society: India and Beyond" (NCF-SE 2023,
// 2026-27 session), confirmed 14-chapter, 5-theme structure — Ch.6
// "The Beginnings of Indian Civilisation", a real Grade 6 History
// chapter tracing the Harappan civilisation from its earliest
// settlements through to its decline, via its own confirmed subtopic
// sequence (What Is a Civilisation -> From Village to City ->
// Town-Planning -> Water Management -> Trade -> The End).
//
// Gap 1 fix: History is not a separate top-level Subject at Grade 6
// — it lives inside "Social Science" (reusing the existing subject
// seeded by seedSocialScienceGrade6.js, not creating a duplicate),
// with its chapters tagged strand: "History" for mastery/analytics.
//
// Reuses HISTORY_TIMELINE_BUILDER (same order-sensitive check as the
// Grade 7/8 Ancient India/freedom-struggle versions), applied to the
// stages of the Harappan civilisation's rise and decline.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 6, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 6 });
    console.log("Created new Grade 6 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Beginnings of Indian Civilisation" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Ancient India",
      title: "The Beginnings of Indian Civilisation",
      order_index: 3,
      strand: "History",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "From Village to City: The Rise and Fall of the Harappan Civilisation" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "From Village to City: The Rise and Fall of the Harappan Civilisation",
      explanation_text:
        "The Harappan civilisation didn't appear all at once — small farming villages slowly grew into large, carefully planned cities with organized streets, water management systems, and wide trade networks, before eventually declining. Putting these stages in order shows how a civilisation actually develops over time.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const timelineChallenges = [
    {
      title: "From Farming Village to City",
      difficulty: "easy",
      order_index: 1,
      payload: {
        era_label: "Early Settlement",
        scrambled_events: [
          { id: "m1", label: "People settle into small farming villages along rivers" },
          { id: "m2", label: "Villages grow larger and develop into planned cities" },
          { id: "m3", label: "Farmers grow enough surplus food to support non-farming city dwellers" },
        ],
        correct_order: ["m1", "m3", "m2"],
        hint: "A village needs a reliable food surplus before it can support the craftspeople and traders a city needs.",
      },
    },
    {
      title: "Building and Running a Harappan City",
      difficulty: "medium",
      order_index: 2,
      payload: {
        era_label: "Town-Planning and Water Management",
        scrambled_events: [
          { id: "a1", label: "City planners lay out streets in an organized grid pattern" },
          { id: "a2", label: "Engineers build drains and wells to manage the city's water supply" },
          { id: "a3", label: "Merchants use the well-planned city's roads to set up trade with distant regions" },
        ],
        correct_order: ["a1", "a2", "a3"],
        hint: "The physical layout of the city had to exist before its water systems could be built into it, and both had to be in place before trade could flourish through it.",
      },
    },
    {
      title: "The Decline of the Harappan Civilisation",
      difficulty: "hard",
      order_index: 3,
      payload: {
        era_label: "Trade and the End",
        scrambled_events: [
          { id: "b1", label: "The Harappan civilisation reaches its peak, with extensive trade across long distances" },
          { id: "b2", label: "Changes in climate and rivers make farming and trade harder to sustain" },
          { id: "b3", label: "Cities are gradually abandoned as people move to find better conditions elsewhere" },
        ],
        correct_order: ["b1", "b2", "b3"],
        hint: "A civilisation has to reach a peak before it can decline — think about what conditions had to worsen before people would leave their cities.",
      },
    },
  ];

  for (const challenge of timelineChallenges) {
    const exists = await GameContent.findOne({
      game_type: "HISTORY_TIMELINE_BUILDER",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "HISTORY_TIMELINE_BUILDER",
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

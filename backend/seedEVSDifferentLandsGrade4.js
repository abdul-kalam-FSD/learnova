require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 4 NCERT completion (2026-27 session, "Our Wondrous World",
// Unit 5 "Our Environment"). New chapter: "Different Lands,
// Different Lives". Strand: Geography, Social Science subject.
//
// Reuses GEOGRAPHY_FEATURE_MATCH — matching a region's climate to
// how people there live/dress/build homes is the same
// scenario-to-meaning mapping already used for water bodies. No new
// mechanic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 4, name: "Social Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Social Science", grade: 4 });
    console.log("Created new Grade 4 Social Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Different Lands, Different Lives" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Our Environment",
      title: "Different Lands, Different Lives",
      order_index: 3,
      strand: "Geography",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "How Geography Shapes the Way People Live" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "How Geography Shapes the Way People Live",
      explanation_text:
        "Where people live shapes how they live. In cold mountain regions, homes are built with sloped roofs so snow slides off, and people wear heavy woollen clothes. In hot desert regions, homes have thick walls to stay cool and people wear light, loose clothing to protect against the sun. In coastal regions, many people depend on fishing and boats because the sea is close by. Looking at the land and climate of a place tells you a lot about how the people there likely live.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const featureChallenges = [
    {
      title: "Match: Land and Homes",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each region to the kind of home people there usually build.",
        slots: [
          { id: "s1", label: "A cold, snowy mountain region" },
          { id: "s2", label: "A hot, dry desert region" },
          { id: "s3", label: "A region with heavy yearly rainfall" },
        ],
        components: [
          { id: "c1", label: "Homes with sloped roofs so snow slides off instead of piling up" },
          { id: "c2", label: "Homes with thick mud or stone walls that stay cool in the heat" },
          { id: "c3", label: "Homes raised on stilts or with steep roofs so rain drains away fast" },
          { id: "c4", label: "Homes built entirely underwater" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Think about the one weather problem each home design is built to solve.",
      },
    },
    {
      title: "Match: Land and Livelihood",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each region to the way many people there earn their living.",
        slots: [
          { id: "s1", label: "A coastal fishing village" },
          { id: "s2", label: "A fertile river plain" },
          { id: "s3", label: "A grassy mountain pasture" },
        ],
        components: [
          { id: "c1", label: "Fishing and boat-building, since the sea is close by" },
          { id: "c2", label: "Growing crops, since the soil near a river is rich for farming" },
          { id: "c3", label: "Herding sheep or yaks, since grass for grazing is plentiful" },
          { id: "c4", label: "Deep-sea mining, since the land has no other resources" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Match the work to the resource the land or water naturally provides.",
      },
    },
    {
      title: "Match: Land and Clothing",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each climate to the kind of clothing people there usually wear.",
        slots: [
          { id: "s1", label: "A very cold, snow-covered region" },
          { id: "s2", label: "A hot, sunny desert region" },
          { id: "s3", label: "A warm, humid coastal region" },
        ],
        components: [
          { id: "c1", label: "Heavy woollen layers that trap body heat" },
          { id: "c2", label: "Light, loose, often light-coloured clothing that reflects heat" },
          { id: "c3", label: "Light, breathable cotton clothing suited to humidity" },
          { id: "c4", label: "Heavy metal armour worn every day" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Match the clothing's main job — trapping heat, reflecting heat, or staying cool in humidity — to the climate.",
      },
    },
  ];

  for (const challenge of featureChallenges) {
    const exists = await GameContent.findOne({ game_type: "GEOGRAPHY_FEATURE_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
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

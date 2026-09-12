require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Geography second mechanic for Grade 7: reuses the existing
// "The Journey of Water" chapter from seedGeographyGrade7.js (currently
// GEOGRAPHY_ROUTE_BUILDER only, which ranks/sequences items in
// order), adds a new Concept + GEOGRAPHY_FEATURE_MATCH content —
// matching a geographic feature or process to its correct
// description instead. Reuses the generic mapping-family check in
// gameControllers.js (same mapping === correct_mapping rule as
// HISTORY_CAUSE_EFFECT_MATCH), no new backend scoring logic needed.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 7, name: "Social Science" });
  if (!subject) {
    throw new Error("Grade 7 Social Science subject not found — run seedGeographyGrade7.js first.");
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "The Journey of Water" });
  if (!chapter) {
    throw new Error("Chapter 'The Journey of Water' not found — run seedGeographyGrade7.js first.");
  }
  console.log("Using existing chapter:", chapter._id);

  let concept = await Concept.findOne({ chapter_id: chapter._id, title: "Matching Water Cycle Stages to Their Descriptions" });
  if (!concept) {
    concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Matching Water Cycle Stages to Their Descriptions",
      explanation_text: "Sequencing the water cycle's stages is one skill — matching each stage, or what drives it, to the right description is another. Evaporation, condensation and precipitation each work differently.",
    });
    console.log("Created concept:", concept._id);
  } else {
    console.log("Using existing concept:", concept._id);
  }

  const featureChallenges = [
    {
      title: "Stages of the Water Cycle",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each stage of the water cycle to what actually happens during it.",
        slots: [
          { id: "s1", label: "Evaporation" },
          { id: "s2", label: "Condensation" },
          { id: "s3", label: "Precipitation" },
        ],
        components: [
          { id: "c1", label: "Water heated by the sun turns into vapor and rises into the air" },
          { id: "c2", label: "Water vapor cools high in the sky and turns back into tiny droplets, forming clouds" },
          { id: "c3", label: "Water falls back to Earth as rain, snow, sleet or hail" },
          { id: "c4", label: "Water disappears completely and never returns to Earth" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Think about whether water is rising, cooling into clouds, or falling back down.",
      },
    },
    {
      title: "What Drives the Water Cycle",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each force in the water cycle to the effect it actually has.",
        slots: [
          { id: "s1", label: "The sun's heat" },
          { id: "s2", label: "Plants releasing water vapor through their leaves" },
          { id: "s3", label: "Gravity pulling condensed water droplets downward" },
        ],
        components: [
          { id: "c1", label: "Powers evaporation from oceans, rivers and lakes" },
          { id: "c2", label: "Adds extra moisture to the air through a process called transpiration" },
          { id: "c3", label: "Causes water droplets in clouds to eventually fall as precipitation" },
          { id: "c4", label: "Has no real effect on how water moves around the Earth" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Each force pushes water through one specific part of the cycle — rising, releasing, or falling.",
      },
    },
    {
      title: "Groundwater and the Water Table",
      difficulty: "hard",
      order_index: 3,
      payload: {
        scenario: "Match each fact about groundwater to what it actually means.",
        slots: [
          { id: "s1", label: "Some rainwater soaks into the ground instead of flowing away" },
          { id: "s2", label: "Water collects in the spaces between soil particles and rock" },
          { id: "s3", label: "The water table rises after heavy rain and falls during dry spells" },
        ],
        components: [
          { id: "c1", label: "Recharges the underground water supply that wells and springs depend on" },
          { id: "c2", label: "Forms an underground reserve of fresh water called groundwater" },
          { id: "c3", label: "Shows that groundwater levels change with rainfall, not just how much people pump out" },
          { id: "c4", label: "Means rainwater instantly turns into ocean water underground" },
        ],
        correct_mapping: {"s1":"c1","s2":"c2","s3":"c3"},
        hint: "Groundwater isn't a fixed underground lake — it forms, moves and changes level over time.",
      },
    },
  ];

  for (const challenge of featureChallenges) {
    const exists = await GameContent.findOne({
      game_type: "GEOGRAPHY_FEATURE_MATCH",
      title: challenge.title,
    });
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

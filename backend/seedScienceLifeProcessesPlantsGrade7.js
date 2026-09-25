require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 7 Science Batch 3. Adds the current NCERT Class 7 Science
// ("Curiosity", NCF-SE 2023, 2026-27 session) Chapter 10, "Life
// Processes in Plants" — verified via multiple independent sources:
// photosynthesis, transpiration, transport of water/minerals (xylem)
// and food (phloem), gas exchange through stomata.
//
// Cross-grade note (Step 2 search): the existing Grade 7 Geography
// chapter "The Journey of Water" (seedGeographyFeatureGrade7.js)
// briefly mentions transpiration as one stage of the water cycle
// ("adds extra moisture to the air"). This chapter's transpiration
// content is intentionally framed differently — the plant's own
// internal xylem/stomata mechanism, not the atmospheric water cycle
// stage — so there's no semantic duplication. That Geography content
// was NOT touched.
//
// Reuses BIO_VIRTUAL_LAB (same hotspot-diagram shape as the Grade 7
// digestion content) and GEOGRAPHY_FEATURE_MATCH's mapping-equality
// check — no new mechanic. `specimen` and hotspot `x`/`y` are purely
// descriptive/positional values consumed by the shared VirtualLab
// component; they require no dedicated image asset.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let subject = await Subject.findOne({ grade: 7, name: "Science" });
  if (!subject) {
    subject = await Subject.create({ name: "Science", grade: 7 });
    console.log("Created new Grade 7 Science subject:", subject._id);
  } else {
    console.log("Using existing subject:", subject._id);
  }

  let chapter = await Chapter.findOne({ subject_id: subject._id, title: "Life Processes in Plants" });
  if (!chapter) {
    chapter = await Chapter.create({
      subject_id: subject._id,
      unit_name: "Biology",
      title: "Life Processes in Plants",
      order_index: 3,
      strand: "Biology",
    });
    console.log("Created chapter:", chapter._id);
  } else {
    console.log("Using existing chapter:", chapter._id);
  }

  // ---------- Concept 1: photosynthesis ----------
  let conceptPhoto = await Concept.findOne({ chapter_id: chapter._id, title: "Photosynthesis: How Plants Make Food" });
  if (!conceptPhoto) {
    conceptPhoto = await Concept.create({
      chapter_id: chapter._id,
      title: "Photosynthesis: How Plants Make Food",
      explanation_text:
        "Plants make their own food through photosynthesis, mostly in their leaves, using sunlight, water, and carbon dioxide. Tiny pores on the leaf surface, called stomata, are where the plant takes in carbon dioxide and releases oxygen and water vapour.",
    });
    console.log("Created concept:", conceptPhoto._id);
  } else {
    console.log("Using existing concept:", conceptPhoto._id);
  }

  const virtualLabChallenges = [
    {
      title: "Identify Where Photosynthesis Happens",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "plant_cross_section_diagram",
        prompt: "Click the part of the plant where most photosynthesis takes place.",
        hotspots: [
          { id: "h1", label: "Leaf", x: 50, y: 15 },
          { id: "h2", label: "Stem", x: 50, y: 50 },
          { id: "h3", label: "Root", x: 50, y: 85 },
          { id: "h4", label: "Flower", x: 75, y: 15 },
        ],
        correct_hotspot_id: "h1",
        hint: "This flat, green part is built to catch the most sunlight.",
      },
    },
    {
      title: "Identify the Gas Exchange Points",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "leaf_surface_diagram",
        prompt: "Click the tiny pores on the leaf where gases move in and out of the plant.",
        hotspots: [
          { id: "h1", label: "Stomata (on the leaf underside)", x: 50, y: 20 },
          { id: "h2", label: "Petiole (leaf stalk)", x: 50, y: 5 },
          { id: "h3", label: "Leaf vein", x: 60, y: 25 },
          { id: "h4", label: "Leaf edge", x: 30, y: 20 },
        ],
        correct_hotspot_id: "h1",
        hint: "These microscopic pores open and close to let carbon dioxide in and let oxygen and water vapour out.",
      },
    },
  ];

  for (const challenge of virtualLabChallenges) {
    const exists = await GameContent.findOne({ game_type: "BIO_VIRTUAL_LAB", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_VIRTUAL_LAB",
        concept_id: conceptPhoto._id,
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

  // ---------- Concept 2: transport and transpiration ----------
  let conceptTransport = await Concept.findOne({ chapter_id: chapter._id, title: "Transport and Transpiration in Plants" });
  if (!conceptTransport) {
    conceptTransport = await Concept.create({
      chapter_id: chapter._id,
      title: "Transport and Transpiration in Plants",
      explanation_text:
        "Water and minerals travel up from the roots to the leaves through tube-like tissue called xylem. The food made in the leaves travels to the rest of the plant through a different tissue called phloem. Along the way, plants lose extra water vapour through their stomata — a process called transpiration.",
    });
    console.log("Created concept:", conceptTransport._id);
  } else {
    console.log("Using existing concept:", conceptTransport._id);
  }

  const featureMatchChallenges = [
    {
      title: "Match: Plant Part to Its Job",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each plant part or tissue to what it actually does.",
        slots: [
          { id: "s1", label: "Carries water and minerals up from the roots to the leaves" },
          { id: "s2", label: "Carries the food made in the leaves down to the rest of the plant" },
          { id: "s3", label: "Absorbs water and minerals from the soil" },
          { id: "s4", label: "Loses extra water vapour into the air" },
        ],
        components: [
          { id: "c1", label: "Xylem" },
          { id: "c2", label: "Phloem" },
          { id: "c3", label: "Roots" },
          { id: "c4", label: "Stomata" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3", s4: "c4" },
        hint: "Xylem moves water up; phloem moves food around; both are named tissues, not whole organs.",
      },
    },
    {
      title: "Match: Term to What It Means",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Match each term to its correct meaning.",
        slots: [
          { id: "s1", label: "The loss of water vapour from a plant's leaves" },
          { id: "s2", label: "The upward pull of water that this loss helps drive" },
          { id: "s3", label: "The plant's food-making process, powered by sunlight" },
          { id: "s4", label: "The movement of the sugars photosynthesis produces, throughout the plant" },
        ],
        components: [
          { id: "c1", label: "Transpiration" },
          { id: "c2", label: "Water Transport" },
          { id: "c3", label: "Photosynthesis" },
          { id: "c4", label: "Food Transport" },
        ],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3", s4: "c4" },
        hint: "As water leaves the leaf through transpiration, it helps pull more water up through the xylem behind it.",
      },
    },
  ];

  for (const challenge of featureMatchChallenges) {
    const exists = await GameContent.findOne({ game_type: "GEOGRAPHY_FEATURE_MATCH", title: challenge.title });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "GEOGRAPHY_FEATURE_MATCH",
        concept_id: conceptTransport._id,
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

  console.log("Done. subject_id / chapter_id:", subject._id, chapter._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 9 Biology expansion (Section 6 of the approved expansion
// strategy): closes two dedicated-game gaps identified in the
// architecture audit — BIO_VIRTUAL_LAB previously only covered "Cell
// Structure and Organelles" (seedBioVirtualLab.js) at Grade 9, even
// though the same chapter ("The Fundamental Unit of Life") and the
// sibling "Tissues" chapter each have a concept that fits this
// mechanic's labeled-diagram-hotspot shape just as naturally:
//   - "Cell Membrane and Transport" -> a cell-membrane cross-section
//     diagram, click the hotspot showing the transport process
//     described.
//   - "Xylem and Phloem" -> a plant stem cross-section diagram, click
//     the tissue hotspot described.
// Links to the existing concepts created by seedGrade9.js — run that
// first. Same payload shape (specimen + prompt + hotspots +
// correct_hotspot_id) and scoring path (single-hotspot check in
// gameControllers.js checkAttempt) as every other Virtual Lab grade.
// This file is additive only: it does not touch "Cell Structure and
// Organelles" or any existing GameContent, and is safe to re-run
// (GameContent.findOne guard before every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 9, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 9 Science subject not found — run seedGrade9.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const cellChapter = await Chapter.findOne({
    subject_id: subject._id,
    title: "The Fundamental Unit of Life",
  });
  const tissuesChapter = await Chapter.findOne({ subject_id: subject._id, title: "Tissues" });
  if (!cellChapter || !tissuesChapter) {
    console.error("Grade 9 chapters not found — run seedGrade9.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const membraneConcept = await Concept.findOne({
    chapter_id: cellChapter._id,
    title: "Cell Membrane and Transport",
  });
  if (!membraneConcept) {
    console.error(
      "Concept 'Cell Membrane and Transport' not found — run seedGrade9.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const xylemPhloemConcept = await Concept.findOne({
    chapter_id: tissuesChapter._id,
    title: "Xylem and Phloem",
  });
  if (!xylemPhloemConcept) {
    console.error(
      "Concept 'Xylem and Phloem' not found — run seedGrade9.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const membraneChallenges = [
    {
      title: "Identify Diffusion",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "cell_membrane_cross_section",
        prompt:
          "A drop of dye is placed in still water outside the cell. Over time it spreads evenly through the water with no energy input from the cell. Click the process shown on the diagram that matches this.",
        hotspots: [
          { id: "h1", label: "Diffusion — molecules moving from high to low concentration", x: 30, y: 40 },
          { id: "h2", label: "Osmosis — water moving through a selectively permeable membrane", x: 55, y: 25 },
          { id: "h3", label: "Active transport — a pump moving molecules using ATP", x: 70, y: 60 },
          { id: "h4", label: "Facilitated diffusion — molecules moving through a channel protein", x: 45, y: 70 },
        ],
        correct_hotspot_id: "h1",
        hint: "No membrane, no channel, no energy mentioned — just molecules spreading out on their own.",
      },
    },
    {
      title: "Identify Osmosis",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "cell_membrane_cross_section",
        prompt:
          "A plant cell is placed in pure water. Water moves into the cell through the membrane itself (not through a channel), causing the cell to swell. Click the process shown on the diagram that matches this.",
        hotspots: [
          { id: "h1", label: "Diffusion — molecules moving from high to low concentration", x: 30, y: 40 },
          { id: "h2", label: "Osmosis — water moving through a selectively permeable membrane", x: 55, y: 25 },
          { id: "h3", label: "Active transport — a pump moving molecules using ATP", x: 70, y: 60 },
          { id: "h4", label: "Facilitated diffusion — molecules moving through a channel protein", x: 45, y: 70 },
        ],
        correct_hotspot_id: "h2",
        hint: "It's specifically water crossing the membrane itself — that narrows it to one of the two membrane-crossing options.",
      },
    },
    {
      title: "Identify Active Transport",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "cell_membrane_cross_section",
        prompt:
          "A root hair cell keeps pumping mineral ions from the soil into the cell even though the ion concentration is already much higher inside the cell than outside, and the cell visibly uses stored energy to do it. Click the process shown on the diagram that matches this.",
        hotspots: [
          { id: "h1", label: "Diffusion — molecules moving from high to low concentration", x: 30, y: 40 },
          { id: "h2", label: "Osmosis — water moving through a selectively permeable membrane", x: 55, y: 25 },
          { id: "h3", label: "Active transport — a pump moving molecules using ATP", x: 70, y: 60 },
          { id: "h4", label: "Facilitated diffusion — molecules moving through a channel protein", x: 45, y: 70 },
        ],
        correct_hotspot_id: "h3",
        hint: "Moving from low to high concentration only happens one way — and it costs the cell energy to do it.",
      },
    },
  ];

  const xylemPhloemChallenges = [
    {
      title: "Identify the Xylem",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "plant_stem_cross_section",
        prompt:
          "Click the tissue that carries water and dissolved minerals upward from the roots to the leaves.",
        hotspots: [
          { id: "h1", label: "Xylem", x: 40, y: 45 },
          { id: "h2", label: "Phloem", x: 55, y: 45 },
          { id: "h3", label: "Cambium", x: 48, y: 45 },
          { id: "h4", label: "Cortex", x: 20, y: 60 },
        ],
        correct_hotspot_id: "h1",
        hint: "Think about which direction water needs to travel, and which tissue is built for one-way upward flow.",
      },
    },
    {
      title: "Identify the Phloem",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "plant_stem_cross_section",
        prompt:
          "Click the tissue that transports food made by photosynthesis from the leaves to every other part of the plant, in either direction.",
        hotspots: [
          { id: "h1", label: "Xylem", x: 40, y: 45 },
          { id: "h2", label: "Phloem", x: 55, y: 45 },
          { id: "h3", label: "Cambium", x: 48, y: 45 },
          { id: "h4", label: "Cortex", x: 20, y: 60 },
        ],
        correct_hotspot_id: "h2",
        hint: "Unlike the water-carrying tissue, this one can move its cargo both up and down the plant.",
      },
    },
    {
      title: "Identify the Cambium",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "plant_stem_cross_section",
        prompt:
          "Click the thin layer of actively dividing cells sitting between the two transport tissues, responsible for the stem growing wider over time.",
        hotspots: [
          { id: "h1", label: "Xylem", x: 40, y: 45 },
          { id: "h2", label: "Phloem", x: 55, y: 45 },
          { id: "h3", label: "Cambium", x: 48, y: 45 },
          { id: "h4", label: "Cortex", x: 20, y: 60 },
        ],
        correct_hotspot_id: "h3",
        hint: "It doesn't transport anything itself — it sits right between the two tissues that do, and it's where new cells come from.",
      },
    },
  ];

  const allChallenges = [
    { concept: membraneConcept, levels: membraneChallenges },
    { concept: xylemPhloemConcept, levels: xylemPhloemChallenges },
  ];

  for (const { concept, levels } of allChallenges) {
    for (const level of levels) {
      const exists = await GameContent.findOne({ game_type: "BIO_VIRTUAL_LAB", title: level.title });
      if (!exists) {
        const created = await GameContent.create({
          game_type: "BIO_VIRTUAL_LAB",
          concept_id: concept._id,
          title: level.title,
          difficulty: level.difficulty,
          order_index: level.order_index,
          payload: level.payload,
        });
        console.log("Created GameContent:", created.title, created._id);
      } else {
        console.log("Using existing GameContent:", exists.title, exists._id);
      }
    }
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

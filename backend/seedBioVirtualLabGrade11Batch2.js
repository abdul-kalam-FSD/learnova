require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 11 Biology expansion (Batch 1 of the approved Grade 11 plan
// — see GRADE_11_BIOLOGY_BATCH_1_PLAN.md): plant structure and cell
// division group. Adds BIO_VIRTUAL_LAB coverage for three concepts
// that were still content-only: "Mitosis" (Cell Cycle and Cell
// Division), "The Flower, Fruit, and Seed" (Morphology of Flowering
// Plants), and "Tissue Systems (Epidermal, Ground, Vascular)"
// (Anatomy of Flowering Plants). Links to concepts created by
// seedGrade11_batch2.js / seedGrade11_batch3.js — run those first.
// Same payload shape (specimen + prompt + hotspots +
// correct_hotspot_id + hint) and scoring path (single-hotspot check
// on attempt.selectedHotspotId vs payload.correct_hotspot_id — see
// gameControllers.js checkAttempt) as every other Virtual Lab grade,
// including the existing seedBioVirtualLabGrade11.js. Additive only.
// Safe to re-run (GameContent.findOne guard before every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const conceptTitles = [
    "Mitosis",
    "The Flower, Fruit, and Seed",
    "Tissue Systems (Epidermal, Ground, Vascular)",
  ];
  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade11_batch2.js / seedGrade11_batch3.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const mitosisChallenges = [
    {
      title: "Identify Metaphase",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "mitosis_phase_diagram",
        prompt: "All the cell's chromosomes are lined up single-file along the middle of the cell, each attached to spindle fibres from both poles. Click the phase shown.",
        hotspots: [
          { id: "h1", label: "Prophase — chromosomes condensing, nuclear envelope breaking down", x: 25, y: 30 },
          { id: "h2", label: "Metaphase — chromosomes aligned at the cell's equator", x: 50, y: 25 },
          { id: "h3", label: "Anaphase — sister chromatids separating toward opposite poles", x: 70, y: 45 },
          { id: "h4", label: "Telophase — two new nuclear envelopes forming", x: 45, y: 65 },
        ],
        correct_hotspot_id: "h2",
        hint: "Chromosomes lined up neatly in a single row down the middle of the cell is the clearest, most distinctive image in the whole cycle.",
      },
    },
    {
      title: "Identify Anaphase vs. Telophase",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "mitosis_phase_diagram",
        prompt: "The sister chromatids have already fully separated and are actively being pulled toward opposite ends of the cell — but two new nuclear envelopes have not yet formed around them. Click the phase shown.",
        hotspots: [
          { id: "h1", label: "Prophase — chromosomes condensing, nuclear envelope breaking down", x: 25, y: 30 },
          { id: "h2", label: "Metaphase — chromosomes aligned at the cell's equator", x: 50, y: 25 },
          { id: "h3", label: "Anaphase — sister chromatids separating toward opposite poles", x: 70, y: 45 },
          { id: "h4", label: "Telophase — two new nuclear envelopes forming", x: 45, y: 65 },
        ],
        correct_hotspot_id: "h3",
        hint: "Chromatids already moving apart, but no new nuclear envelopes yet — that combination only fits one phase, not the one that comes right after it.",
      },
    },
    {
      title: "Identify Prophase vs. Prometaphase Cues",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "mitosis_phase_diagram",
        prompt: "Chromosomes have already condensed into visible, distinct structures, and the nuclear envelope has just finished breaking apart — but the chromosomes are still scattered through the cell, not yet gathered at the equator or attached to spindle fibres from both poles. Click the phase shown.",
        hotspots: [
          { id: "h1", label: "Prophase — chromosomes condensing, nuclear envelope breaking down", x: 25, y: 30 },
          { id: "h2", label: "Metaphase — chromosomes aligned at the cell's equator", x: 50, y: 25 },
          { id: "h3", label: "Anaphase — sister chromatids separating toward opposite poles", x: 70, y: 45 },
          { id: "h4", label: "Telophase — two new nuclear envelopes forming", x: 45, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "The nuclear envelope has only just broken down and the chromosomes haven't organised into a line yet — that scattered, just-condensed state is the earliest phase on this list.",
      },
    },
  ];

  const flowerFruitSeedChallenges = [
    {
      title: "Identify the Stamen's Role",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "flowering_plant_reproductive_diagram",
        prompt: "Click the structure that produces pollen grains, the flower's male gametophytes.",
        hotspots: [
          { id: "h1", label: "Stamen (anther + filament) — produces pollen grains", x: 30, y: 30 },
          { id: "h2", label: "Ovary — contains ovules that develop into seeds", x: 55, y: 50 },
          { id: "h3", label: "Pericarp — the fruit wall that develops from the ovary wall", x: 65, y: 70 },
          { id: "h4", label: "Cotyledon — the seed's food-storing embryonic leaf", x: 20, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "Look for the structure that makes pollen, not the one that receives it.",
      },
    },
    {
      title: "Identify What Becomes the Fruit",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "flowering_plant_reproductive_diagram",
        prompt: "After fertilisation, one part of the flower develops into the fruit that surrounds the seeds. Click the structure that becomes the fruit.",
        hotspots: [
          { id: "h1", label: "Stamen (anther + filament) — produces pollen grains", x: 30, y: 30 },
          { id: "h2", label: "Ovary wall — develops into the pericarp (fruit wall) after fertilisation", x: 55, y: 50 },
          { id: "h3", label: "Petal — attracts pollinators, withers after fertilisation", x: 70, y: 25 },
          { id: "h4", label: "Ovule — develops into the seed after fertilisation", x: 40, y: 60 },
        ],
        correct_hotspot_id: "h2",
        hint: "The fruit forms around the seeds — think about which structure was already surrounding the ovules before fertilisation happened.",
      },
    },
    {
      title: "Identify the Cotyledon's Role",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "flowering_plant_reproductive_diagram",
        prompt: "Inside a developing seed, one structure stores the food reserves the embryo will use during germination, distinct from the seed coat that protects it and the endosperm that also stores nutrients in some species. Click the structure being described.",
        hotspots: [
          { id: "h1", label: "Testa (seed coat) — protective outer covering of the seed", x: 20, y: 40 },
          { id: "h2", label: "Endosperm — a separate nutritive tissue present in some seeds", x: 60, y: 35 },
          { id: "h3", label: "Cotyledon — the embryo's own food-storing seed leaf", x: 45, y: 60 },
          { id: "h4", label: "Radicle — the embryonic root", x: 70, y: 70 },
        ],
        correct_hotspot_id: "h3",
        hint: "This structure is part of the embryo itself, not a separate nutritive tissue and not the protective covering — it's the embryo's own built-in food store.",
      },
    },
  ];

  const tissueSystemsChallenges = [
    {
      title: "Identify the Epidermal Tissue System",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "stem_cross_section_tissue_systems",
        prompt: "Click the outermost tissue system, forming a single protective layer around the entire plant organ.",
        hotspots: [
          { id: "h1", label: "Epidermal tissue system — outermost protective layer", x: 15, y: 50 },
          { id: "h2", label: "Ground tissue system — packing and storage tissue", x: 40, y: 50 },
          { id: "h3", label: "Vascular tissue system — xylem and phloem for transport", x: 60, y: 50 },
          { id: "h4", label: "Cambium — meristematic layer for secondary growth", x: 55, y: 45 },
        ],
        correct_hotspot_id: "h1",
        hint: "Whatever tissue system you'd touch first from outside the plant is the one being described here.",
      },
    },
    {
      title: "Identify the Ground Tissue System",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "stem_cross_section_tissue_systems",
        prompt: "Click the tissue system that fills most of the space between the epidermis and the vascular tissue, mainly responsible for packing, storage, and support rather than transport or protection.",
        hotspots: [
          { id: "h1", label: "Epidermal tissue system — outermost protective layer", x: 15, y: 50 },
          { id: "h2", label: "Ground tissue system — packing and storage tissue", x: 40, y: 50 },
          { id: "h3", label: "Vascular tissue system — xylem and phloem for transport", x: 60, y: 50 },
          { id: "h4", label: "Cambium — meristematic layer for secondary growth", x: 55, y: 45 },
        ],
        correct_hotspot_id: "h2",
        hint: "This is the 'filler' tissue system — it isn't the protective outer layer and it isn't the conducting tissue, it's what occupies most of the space in between.",
      },
    },
    {
      title: "Compare Vascular Arrangement, Root vs. Stem",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "stem_cross_section_tissue_systems",
        prompt: "In this dicot stem's cross-section, the vascular tissue system is arranged as discrete bundles positioned in a ring near the periphery, with xylem toward the centre of each bundle and phloem toward the outside. Click the tissue system being described.",
        hotspots: [
          { id: "h1", label: "Epidermal tissue system — outermost protective layer", x: 15, y: 50 },
          { id: "h2", label: "Ground tissue system — packing and storage tissue", x: 40, y: 50 },
          { id: "h3", label: "Vascular tissue system — xylem and phloem arranged in bundles", x: 60, y: 50 },
          { id: "h4", label: "Periderm — protective tissue formed during secondary growth", x: 75, y: 55 },
        ],
        correct_hotspot_id: "h3",
        hint: "Xylem and phloem together, arranged in a bundle, is the conducting tissue system — regardless of exactly how the bundles are arranged in this particular cross-section.",
      },
    },
  ];

  const allChallenges = [
    { concept: concepts["Mitosis"], levels: mitosisChallenges },
    { concept: concepts["The Flower, Fruit, and Seed"], levels: flowerFruitSeedChallenges },
    { concept: concepts["Tissue Systems (Epidermal, Ground, Vascular)"], levels: tissueSystemsChallenges },
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

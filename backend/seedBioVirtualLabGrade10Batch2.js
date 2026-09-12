require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 10 Biology expansion (Section 7 of the approved expansion
// strategy): closes the "Life Processes" and "Reproduction" gaps.
// BIO_VIRTUAL_LAB already covers "Transportation and Excretion"
// (seedBioVirtualLabGrade10.js) in the same "Life Processes" chapter
// — this file adds its two siblings, "Nutrition" and "Respiration",
// plus both concepts in the "How Do Organisms Reproduce" chapter,
// "Asexual Reproduction" and "Sexual Reproduction". All four fit the
// same labeled-diagram-hotspot shape as the existing Virtual Lab
// games. Links to concepts created by seedGrade10.js — run that
// first. Same payload shape (specimen + prompt + hotspots +
// correct_hotspot_id) and scoring path (single-hotspot check in
// gameControllers.js checkAttempt) as every other Virtual Lab grade.
// Additive only. Safe to re-run (GameContent.findOne guard before
// every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const conceptTitles = ["Nutrition", "Respiration", "Asexual Reproduction", "Sexual Reproduction"];
  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade10.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const nutritionChallenges = [
    {
      title: "Identify Protein Digestion",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "human_digestive_system",
        prompt:
          "A meal rich in protein has just left the stomach, where pepsin began breaking it into smaller fragments. Click the organ where protein digestion is completed and the resulting amino acids are absorbed into the blood.",
        hotspots: [
          { id: "h1", label: "Small intestine — final digestion and absorption", x: 45, y: 55 },
          { id: "h2", label: "Liver — produces bile to emulsify fats", x: 30, y: 35 },
          { id: "h3", label: "Large intestine — absorbs water from waste", x: 60, y: 70 },
          { id: "h4", label: "Stomach — begins protein digestion with pepsin", x: 40, y: 25 },
        ],
        correct_hotspot_id: "h1",
        hint: "The stomach only starts the job — look for the organ lined with villi where digestion finishes and nutrients actually enter the blood.",
      },
    },
    {
      title: "Identify Bile's Role",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "human_digestive_system",
        prompt:
          "A fatty meal enters the small intestine as large fat globules. Click the organ that produces the fluid which breaks these globules into smaller droplets so enzymes can act on them more easily.",
        hotspots: [
          { id: "h1", label: "Small intestine — final digestion and absorption", x: 45, y: 55 },
          { id: "h2", label: "Liver — produces bile to emulsify fats", x: 30, y: 35 },
          { id: "h3", label: "Large intestine — absorbs water from waste", x: 60, y: 70 },
          { id: "h4", label: "Stomach — begins protein digestion with pepsin", x: 40, y: 25 },
        ],
        correct_hotspot_id: "h2",
        hint: "Emulsifying fat isn't digestion by an enzyme — it's a physical breakup job done by a fluid made elsewhere and delivered to the intestine.",
      },
    },
    {
      title: "Identify Water Absorption",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "human_digestive_system",
        prompt:
          "After nutrients have already been absorbed in the small intestine, only watery waste material remains. Click the organ responsible for absorbing most of the remaining water before the waste is eliminated as stool.",
        hotspots: [
          { id: "h1", label: "Small intestine — final digestion and absorption", x: 45, y: 55 },
          { id: "h2", label: "Liver — produces bile to emulsify fats", x: 30, y: 35 },
          { id: "h3", label: "Large intestine — absorbs water from waste", x: 60, y: 70 },
          { id: "h4", label: "Stomach — begins protein digestion with pepsin", x: 40, y: 25 },
        ],
        correct_hotspot_id: "h3",
        hint: "Nutrient absorption is already finished by this point — this step is only about reclaiming water from what's left over.",
      },
    },
  ];

  const respirationChallenges = [
    {
      title: "Identify Aerobic Respiration",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "cellular_respiration_pathway",
        prompt:
          "A resting muscle cell has plenty of oxygen available. Click the pathway it uses to fully break down glucose and release the most ATP possible.",
        hotspots: [
          { id: "h1", label: "Aerobic respiration — glucose + oxygen, in the mitochondria, high ATP yield", x: 35, y: 40 },
          { id: "h2", label: "Anaerobic respiration (muscle) — glucose without oxygen, produces lactic acid, low ATP yield", x: 60, y: 40 },
          { id: "h3", label: "Anaerobic respiration (yeast) — glucose without oxygen, produces alcohol and CO2, low ATP yield", x: 45, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "Plenty of oxygen and needing the most energy possible points to the pathway that happens inside the mitochondria.",
      },
    },
    {
      title: "Identify Muscle Fatigue's Cause",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "cellular_respiration_pathway",
        prompt:
          "During an intense sprint, a runner's muscles can't get oxygen fast enough to keep up with demand, and a burning sensation builds up in the legs. Click the pathway responsible for that burning sensation.",
        hotspots: [
          { id: "h1", label: "Aerobic respiration — glucose + oxygen, in the mitochondria, high ATP yield", x: 35, y: 40 },
          { id: "h2", label: "Anaerobic respiration (muscle) — glucose without oxygen, produces lactic acid, low ATP yield", x: 60, y: 40 },
          { id: "h3", label: "Anaerobic respiration (yeast) — glucose without oxygen, produces alcohol and CO2, low ATP yield", x: 45, y: 65 },
        ],
        correct_hotspot_id: "h2",
        hint: "Not enough oxygen reaching the muscle — think about which pathway runs without it, and what waste product it leaves behind in human muscle specifically.",
      },
    },
    {
      title: "Identify Fermentation in Bread Dough",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "cellular_respiration_pathway",
        prompt:
          "Yeast mixed into bread dough is sealed away from significant oxygen. It breaks down sugar in the dough, releasing carbon dioxide gas (which makes the dough rise) and a small amount of alcohol. Click the pathway shown.",
        hotspots: [
          { id: "h1", label: "Aerobic respiration — glucose + oxygen, in the mitochondria, high ATP yield", x: 35, y: 40 },
          { id: "h2", label: "Anaerobic respiration (muscle) — glucose without oxygen, produces lactic acid, low ATP yield", x: 60, y: 40 },
          { id: "h3", label: "Anaerobic respiration (yeast) — glucose without oxygen, produces alcohol and CO2, low ATP yield", x: 45, y: 65 },
        ],
        correct_hotspot_id: "h3",
        hint: "Both anaerobic options skip oxygen, but only one of them is the microorganism version that releases CO2 and alcohol instead of lactic acid.",
      },
    },
  ];

  const asexualChallenges = [
    {
      title: "Identify Budding",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "asexual_reproduction_methods",
        prompt:
          "A small outgrowth develops on the side of a parent hydra, gradually forms its own tentacles and mouth, then detaches to live independently. Click the method of asexual reproduction shown.",
        hotspots: [
          { id: "h1", label: "Budding — a new individual grows as an outgrowth and detaches", x: 30, y: 35 },
          { id: "h2", label: "Fragmentation — the body breaks into pieces, each regrowing into a full organism", x: 55, y: 30 },
          { id: "h3", label: "Vegetative propagation — a new plant grows from a root, stem, or leaf of the parent", x: 65, y: 60 },
        ],
        correct_hotspot_id: "h1",
        hint: "The parent's body itself doesn't break apart here — a new individual grows outward from it as a bump, then separates.",
      },
    },
    {
      title: "Identify Fragmentation",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "asexual_reproduction_methods",
        prompt:
          "A strand of Spirogyra (a filamentous algae) breaks into several pieces during turbulent water flow. Each broken piece goes on to grow into a new, complete filament. Click the method shown.",
        hotspots: [
          { id: "h1", label: "Budding — a new individual grows as an outgrowth and detaches", x: 30, y: 35 },
          { id: "h2", label: "Fragmentation — the body breaks into pieces, each regrowing into a full organism", x: 55, y: 30 },
          { id: "h3", label: "Vegetative propagation — a new plant grows from a root, stem, or leaf of the parent", x: 65, y: 60 },
        ],
        correct_hotspot_id: "h2",
        hint: "This time the parent's own body is what splits apart — no outgrowth is involved, the pieces themselves are the starting point.",
      },
    },
    {
      title: "Identify Vegetative Propagation",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "asexual_reproduction_methods",
        prompt:
          "A potato tuber (a swollen underground stem) is planted. New potato plants sprout directly from its 'eyes' without any seed or flower being involved. Click the method shown.",
        hotspots: [
          { id: "h1", label: "Budding — a new individual grows as an outgrowth and detaches", x: 30, y: 35 },
          { id: "h2", label: "Fragmentation — the body breaks into pieces, each regrowing into a full organism", x: 55, y: 30 },
          { id: "h3", label: "Vegetative propagation — a new plant grows from a root, stem, or leaf of the parent", x: 65, y: 60 },
        ],
        correct_hotspot_id: "h3",
        hint: "A tuber is a plant stem structure, not an animal body — look for the option specifically about plants growing from their own vegetative parts.",
      },
    },
  ];

  const sexualChallenges = [
    {
      title: "Identify the Stamen",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "flower_reproductive_structures",
        prompt: "Click the male reproductive part of the flower, which produces pollen grains.",
        hotspots: [
          { id: "h1", label: "Stamen (anther + filament)", x: 35, y: 30 },
          { id: "h2", label: "Pistil / Carpel (stigma, style, ovary)", x: 50, y: 45 },
          { id: "h3", label: "Petal", x: 65, y: 25 },
          { id: "h4", label: "Sepal", x: 20, y: 60 },
        ],
        correct_hotspot_id: "h1",
        hint: "Pollen is the male sex cell carrier — find the structure that produces and releases it.",
      },
    },
    {
      title: "Identify the Pistil",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "flower_reproductive_structures",
        prompt:
          "Click the female reproductive part of the flower, containing the ovary where seeds will develop after fertilization.",
        hotspots: [
          { id: "h1", label: "Stamen (anther + filament)", x: 35, y: 30 },
          { id: "h2", label: "Pistil / Carpel (stigma, style, ovary)", x: 50, y: 45 },
          { id: "h3", label: "Petal", x: 65, y: 25 },
          { id: "h4", label: "Sepal", x: 20, y: 60 },
        ],
        correct_hotspot_id: "h2",
        hint: "The ovary — where seeds eventually form — belongs to this structure, not the pollen-producing one.",
      },
    },
    {
      title: "Identify Where Fertilization Occurs",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "flower_reproductive_structures",
        prompt:
          "A pollen grain has landed on the stigma and grown a pollen tube down to deliver the male gamete. Click the part of the flower where the male and female gametes actually fuse to form a zygote.",
        hotspots: [
          { id: "h1", label: "Stamen (anther + filament)", x: 35, y: 30 },
          { id: "h2", label: "Pistil / Carpel (stigma, style, ovary)", x: 50, y: 45 },
          { id: "h3", label: "Petal", x: 65, y: 25 },
          { id: "h4", label: "Sepal", x: 20, y: 60 },
        ],
        correct_hotspot_id: "h2",
        hint: "Fertilization is the final destination of that pollen tube's journey — inside the ovule, which sits within the same structure the stigma is part of.",
      },
    },
  ];

  const allChallenges = [
    { concept: concepts["Nutrition"], levels: nutritionChallenges },
    { concept: concepts["Respiration"], levels: respirationChallenges },
    { concept: concepts["Asexual Reproduction"], levels: asexualChallenges },
    { concept: concepts["Sexual Reproduction"], levels: sexualChallenges },
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 11 Biology expansion (Batch 1 of the approved Grade 11 plan
// — see GRADE_11_BIOLOGY_BATCH_1_PLAN.md): human physiology group.
// Adds BIO_VIRTUAL_LAB coverage for two concepts that were still
// content-only: "Digestion of Food: Enzymes and Process" (Digestion
// and Absorption) and "Exchange and Transport of Gases" (Breathing
// and Exchange of Gases). Links to concepts created by
// seedGrade11_batch5.js / seedGrade11_batch6.js — run those first.
// Same payload shape (specimen + prompt + hotspots +
// correct_hotspot_id + hint) and scoring path (single-hotspot check
// on attempt.selectedHotspotId vs payload.correct_hotspot_id — see
// gameControllers.js checkAttempt) as every other Virtual Lab grade.
// Additive only. Safe to re-run (GameContent.findOne guard before
// every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 11 Science/Biology subject not found — run seedGrade11_batch5.js / seedGrade11_batch6.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const conceptChapters = {
    "Digestion of Food: Enzymes and Process": "Digestion and Absorption",
    "Exchange and Transport of Gases": "Breathing and Exchange of Gases",
  };
  const concepts = {};
  for (const [title, chapterTitle] of Object.entries(conceptChapters)) {
    const chapter = await Chapter.findOne({ subject_id: subject._id, title: chapterTitle });
    if (!chapter) {
      console.error(`Chapter "${chapterTitle}" not found — run seedGrade11_batch5.js / seedGrade11_batch6.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    const concept = await Concept.findOne({ chapter_id: chapter._id, title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade11_batch5.js / seedGrade11_batch6.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const digestionEnzymeChallenges = [
    {
      title: "Identify Pepsin's Site of Action",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "human_digestive_enzyme_diagram",
        prompt: "Pepsin begins breaking proteins down into smaller polypeptides in an acidic environment. Click the organ where this enzyme acts.",
        hotspots: [
          { id: "h1", label: "Stomach — pepsin acts here in an acidic environment", x: 40, y: 25 },
          { id: "h2", label: "Small intestine — pancreatic and intestinal enzymes act here", x: 45, y: 55 },
          { id: "h3", label: "Pancreas — produces enzymes released into the small intestine", x: 30, y: 40 },
          { id: "h4", label: "Large intestine — mainly water absorption, minimal enzyme activity", x: 60, y: 70 },
        ],
        correct_hotspot_id: "h1",
        hint: "This enzyme specifically needs an acidic environment to work — only one organ in the digestive tract maintains that condition.",
      },
    },
    {
      title: "Identify Where Pancreatic Amylase Acts",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "human_digestive_enzyme_diagram",
        prompt: "Pancreatic amylase is produced by the pancreas but doesn't act inside the pancreas itself — it's released through a duct to break down starch elsewhere. Click the organ where pancreatic amylase actually acts on food.",
        hotspots: [
          { id: "h1", label: "Stomach — pepsin acts here, not pancreatic enzymes", x: 40, y: 25 },
          { id: "h2", label: "Small intestine — pancreatic amylase acts here after being released via the pancreatic duct", x: 45, y: 55 },
          { id: "h3", label: "Pancreas — produces the enzyme but food doesn't pass through it", x: 30, y: 40 },
          { id: "h4", label: "Large intestine — food is already fully digested by this point", x: 60, y: 70 },
        ],
        correct_hotspot_id: "h2",
        hint: "Don't confuse where an enzyme is made with where it actually acts on food — food itself never passes through the organ that produces this enzyme.",
      },
    },
    {
      title: "Trace an Enzyme Active in Two Locations",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "human_digestive_enzyme_diagram",
        prompt: "Salivary amylase begins starch digestion in the mouth, but stomach acid quickly inactivates it once food arrives there. A separate, related enzyme — pancreatic amylase — continues starch digestion later in the digestive tract. Click the organ where starch digestion actually resumes after the salivary enzyme is inactivated.",
        hotspots: [
          { id: "h1", label: "Stomach — acidic environment inactivates amylase; starch digestion pauses here", x: 40, y: 25 },
          { id: "h2", label: "Small intestine — pancreatic amylase resumes starch digestion here", x: 45, y: 55 },
          { id: "h3", label: "Mouth — where salivary amylase first acted, before the food was swallowed", x: 25, y: 15 },
          { id: "h4", label: "Large intestine — starch digestion is already complete by this point", x: 60, y: 70 },
        ],
        correct_hotspot_id: "h2",
        hint: "Starch digestion has a gap in the middle of the digestive tract where it's paused, not finished — find where a second, related enzyme picks the job back up.",
      },
    },
  ];

  const gasExchangeChallenges = [
    {
      title: "Identify Oxygen Diffusion at the Alveolus",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "alveolar_gas_exchange_diagram",
        prompt: "Oxygen concentration is higher in the air inside the alveolus than in the blood of the surrounding capillary. Click the direction oxygen will diffuse.",
        hotspots: [
          { id: "h1", label: "Oxygen diffuses from alveolar air into the blood", x: 35, y: 40 },
          { id: "h2", label: "Oxygen diffuses from blood into the alveolar air", x: 65, y: 40 },
          { id: "h3", label: "Oxygen does not cross the alveolar membrane", x: 50, y: 65 },
          { id: "h4", label: "Oxygen is actively pumped using ATP", x: 50, y: 25 },
        ],
        correct_hotspot_id: "h1",
        hint: "Gases diffuse from a region of higher partial pressure to lower partial pressure, just like any other diffusion — identify which side has more oxygen.",
      },
    },
    {
      title: "Identify Carbon Dioxide's Direction at the Alveolus",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "alveolar_gas_exchange_diagram",
        prompt: "Carbon dioxide concentration is higher in the capillary blood arriving at the lungs than in the air inside the alveolus. Click the direction carbon dioxide will diffuse.",
        hotspots: [
          { id: "h1", label: "Carbon dioxide diffuses from alveolar air into the blood", x: 35, y: 40 },
          { id: "h2", label: "Carbon dioxide diffuses from blood into the alveolar air", x: 65, y: 40 },
          { id: "h3", label: "Carbon dioxide only moves alongside oxygen, never independently", x: 50, y: 65 },
          { id: "h4", label: "Carbon dioxide is actively pumped using ATP", x: 50, y: 25 },
        ],
        correct_hotspot_id: "h2",
        hint: "This gas moves the opposite direction to oxygen at the same location — apply the same higher-to-lower partial pressure rule, just for CO2 instead.",
      },
    },
    {
      title: "Predict a Bohr Effect Shift",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "alveolar_gas_exchange_diagram",
        prompt: "In actively respiring tissue, high carbon dioxide concentration and lower pH cause haemoglobin's affinity for oxygen to drop, making it release oxygen more readily than it would in the lungs. Click the effect this describes.",
        hotspots: [
          { id: "h1", label: "Bohr effect — high CO2/low pH lowers haemoglobin's oxygen affinity, promoting oxygen release in tissues", x: 45, y: 45 },
          { id: "h2", label: "Chloride shift — bicarbonate/chloride exchange across the red blood cell membrane", x: 65, y: 60 },
          { id: "h3", label: "Haldane effect — oxygenated haemoglobin holds less CO2 than deoxygenated haemoglobin", x: 30, y: 60 },
          { id: "h4", label: "Active transport — a pump moving oxygen using ATP", x: 55, y: 25 },
        ],
        correct_hotspot_id: "h1",
        hint: "The described trigger is specifically CO2 and pH changing haemoglobin's oxygen-holding behaviour — one named effect is defined by exactly that relationship.",
      },
    },
  ];

  const allChallenges = [
    { concept: concepts["Digestion of Food: Enzymes and Process"], levels: digestionEnzymeChallenges },
    { concept: concepts["Exchange and Transport of Gases"], levels: gasExchangeChallenges },
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

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade 11 Biology expansion (Batch 1 of the approved Grade 11 plan
// — see GRADE_11_BIOLOGY_BATCH_1_PLAN.md): plant physiology group.
// Adds BIO_VIRTUAL_LAB coverage for four concepts that were still
// content-only: "Diffusion, Osmosis, and Water Potential" (Transport
// in Plants), "Deficiency Symptoms" (Mineral Nutrition), "C4 Pathway
// and Factors Affecting Photosynthesis" (Photosynthesis in Higher
// Plants — the showcase concept from the approved plan), and
// "Glycolysis and Fermentation" (Respiration in Plants). Links to
// concepts created by seedGrade11_batch4.js / seedGrade11_batch5.js
// — run those first. Same payload shape (specimen + prompt +
// hotspots + correct_hotspot_id + hint) and scoring path
// (single-hotspot check on attempt.selectedHotspotId vs
// payload.correct_hotspot_id — see gameControllers.js checkAttempt)
// as every other Virtual Lab grade — including the showcase
// challenge below, which represents an environmental condition set
// as the "specimen" and candidate limiting factors as "hotspots"
// rather than a labeled diagram, with no schema or engine change.
// Additive only. Safe to re-run (GameContent.findOne guard before
// every create).
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const conceptTitles = [
    "Diffusion, Osmosis, and Water Potential",
    "Deficiency Symptoms",
    "C4 Pathway and Factors Affecting Photosynthesis",
    "Glycolysis and Fermentation",
  ];
  const concepts = {};
  for (const title of conceptTitles) {
    const concept = await Concept.findOne({ title });
    if (!concept) {
      console.error(`Concept "${title}" not found — run seedGrade11_batch4.js / seedGrade11_batch5.js first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    concepts[title] = concept;
  }

  const waterPotentialChallenges = [
    {
      title: "Identify Osmosis by Water Potential",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "plant_cell_water_potential_diagram",
        prompt: "A plant cell with a higher (less negative) water potential sits in a solution with a lower (more negative) water potential. Click the process and direction that describes what happens to water.",
        hotspots: [
          { id: "h1", label: "Osmosis — water moves out of the cell, toward the lower water potential", x: 30, y: 40 },
          { id: "h2", label: "Osmosis — water moves into the cell, toward the higher water potential", x: 60, y: 40 },
          { id: "h3", label: "Diffusion — solute particles move directly across the membrane", x: 45, y: 65 },
          { id: "h4", label: "Active transport — water is pumped using ATP", x: 70, y: 60 },
        ],
        correct_hotspot_id: "h1",
        hint: "Water always moves from higher water potential to lower water potential, the same way heat moves from hot to cold — figure out which side is which first.",
      },
    },
    {
      title: "Identify the Solute Potential Contribution",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "plant_cell_water_potential_diagram",
        prompt: "Dissolving more solute into a plant cell's vacuole lowers that cell's overall water potential, even before any pressure changes are considered. Click the component of water potential responsible for this effect.",
        hotspots: [
          { id: "h1", label: "Solute potential — always negative, lowers total water potential as solute concentration rises", x: 35, y: 35 },
          { id: "h2", label: "Pressure potential — usually positive in a turgid cell, raises total water potential", x: 60, y: 35 },
          { id: "h3", label: "Matric potential — water held by cell wall/cytoplasm surfaces", x: 45, y: 60 },
          { id: "h4", label: "Gravitational potential — relevant mainly over tall plant heights", x: 65, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "The question is specifically about dissolved solute, not pressure or height — one component of water potential is defined entirely by solute concentration.",
      },
    },
    {
      title: "Predict Flow With Both Pressure and Solute Effects",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "plant_cell_water_potential_diagram",
        prompt: "Cell P is turgid, with high positive pressure potential but also a high solute concentration (strongly negative solute potential), giving it an overall water potential of −0.2 MPa. Cell Q is flaccid, with almost no pressure potential and a lower solute concentration, giving it an overall water potential of −0.5 MPa. Click the direction water will move between them.",
        hotspots: [
          { id: "h1", label: "Water moves from Cell P to Cell Q", x: 35, y: 45 },
          { id: "h2", label: "Water moves from Cell Q to Cell P", x: 65, y: 45 },
          { id: "h3", label: "No net water movement occurs", x: 50, y: 70 },
          { id: "h4", label: "Direction cannot be determined without knowing cell size", x: 30, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "Don't reason from pressure or solute concentration separately — total water potential already combines both, and water always moves from the higher total value to the lower one.",
      },
    },
  ];

  const deficiencyChallenges = [
    {
      title: "Identify General Yellowing (Nitrogen)",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "mineral_deficiency_plant_diagram",
        prompt: "A crop plant shows pale, uniform yellowing (chlorosis) spreading across its older, lower leaves first, along with stunted overall growth. Click the deficiency shown.",
        hotspots: [
          { id: "h1", label: "Nitrogen deficiency — general yellowing, starts in older leaves, stunted growth", x: 30, y: 40 },
          { id: "h2", label: "Iron deficiency — yellowing between veins, starts in young leaves", x: 60, y: 30 },
          { id: "h3", label: "Magnesium deficiency — yellowing between veins, starts in older leaves", x: 45, y: 60 },
          { id: "h4", label: "Calcium deficiency — death of growing tips and root tips", x: 70, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "General, uniform yellowing across the whole older leaf, not just between the veins, points to the most mobile and most commonly limiting nutrient.",
      },
    },
    {
      title: "Distinguish a Mobile-Nutrient Deficiency",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "mineral_deficiency_plant_diagram",
        prompt: "A plant's older, lower leaves show yellowing specifically between the veins, while the veins themselves stay green. The youngest leaves at the growing tip still look healthy. Click the deficiency shown.",
        hotspots: [
          { id: "h1", label: "Nitrogen deficiency — general yellowing, starts in older leaves, stunted growth", x: 30, y: 40 },
          { id: "h2", label: "Iron deficiency — yellowing between veins, starts in young leaves", x: 60, y: 30 },
          { id: "h3", label: "Magnesium deficiency — yellowing between veins, starts in older leaves", x: 45, y: 60 },
          { id: "h4", label: "Calcium deficiency — death of growing tips and root tips", x: 70, y: 65 },
        ],
        correct_hotspot_id: "h3",
        hint: "The pattern here is between-the-veins yellowing specifically in the OLDER leaves — a mobile nutrient that the plant can relocate away from ageing tissue toward the growing tip.",
      },
    },
    {
      title: "Distinguish Mobile from Immobile Nutrient Symptoms",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "mineral_deficiency_plant_diagram",
        prompt: "A plant's youngest leaves at the growing tip show yellowing between the veins, while its older, lower leaves remain fully green and healthy. Click the deficiency shown.",
        hotspots: [
          { id: "h1", label: "Nitrogen deficiency — general yellowing, starts in older leaves, stunted growth", x: 30, y: 40 },
          { id: "h2", label: "Iron deficiency — yellowing between veins, starts in young leaves", x: 60, y: 30 },
          { id: "h3", label: "Magnesium deficiency — yellowing between veins, starts in older leaves", x: 45, y: 60 },
          { id: "h4", label: "Calcium deficiency — death of growing tips and root tips", x: 70, y: 65 },
        ],
        correct_hotspot_id: "h2",
        hint: "This is the mirror image of the previous case — the symptom shows up in the newest growth, not the oldest. Immobile nutrients can't be relocated from old tissue to new, so their deficiency always shows up where new growth is happening.",
      },
    },
  ];

  const photosynthesisLimitingFactorChallenges = [
    {
      title: "Identify the Limiting Factor: Low Light",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "environmental_condition_set",
        prompt: "A plant is kept at dawn light intensity (very low light), with normal atmospheric CO2 (0.04%) and a comfortable 25°C temperature, all with plenty of water available. Click the factor currently limiting its rate of photosynthesis.",
        hotspots: [
          { id: "h1", label: "Light intensity — well below saturation", x: 25, y: 30 },
          { id: "h2", label: "CO2 concentration — normal atmospheric level", x: 55, y: 25 },
          { id: "h3", label: "Temperature — within the optimal range", x: 70, y: 50 },
          { id: "h4", label: "Water availability — not restricted", x: 40, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "Per Blackman's Law of Limiting Factors, the rate is capped by whichever factor is furthest from what the plant needs — check each one against a 'is this comfortable or restrictive' test.",
      },
    },
    {
      title: "Identify the Limiting Factor: Low CO2 Despite Bright Light",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "environmental_condition_set",
        prompt: "A plant is kept under bright, saturating light and a comfortable 25°C temperature with plenty of water — but sealed in a chamber where CO2 has been allowed to drop well below normal atmospheric concentration. Click the factor currently limiting its rate of photosynthesis.",
        hotspots: [
          { id: "h1", label: "Light intensity — already at saturation, more light won't increase the rate further", x: 25, y: 30 },
          { id: "h2", label: "CO2 concentration — well below normal atmospheric level", x: 55, y: 25 },
          { id: "h3", label: "Temperature — within the optimal range", x: 70, y: 50 },
          { id: "h4", label: "Water availability — not restricted", x: 40, y: 65 },
        ],
        correct_hotspot_id: "h2",
        hint: "Bright light stops being the constraint once the plant already has more than enough of it — at that point, increasing light further won't raise the rate, so look at what else is scarce.",
      },
    },
    {
      title: "Identify the Limiting Factor: A C4 Plant in Heat",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "environmental_condition_set",
        prompt: "A C4 plant (adapted to concentrate CO2 efficiently even at low internal concentrations, and tolerant of high temperatures) is grown in bright light and normal atmospheric CO2, at a high midday temperature of 42°C, with adequate water. A C3 plant under the exact same conditions would be temperature-limited. Click the factor currently limiting the C4 plant's rate of photosynthesis.",
        hotspots: [
          { id: "h1", label: "Light intensity — already at saturation for this species", x: 25, y: 30 },
          { id: "h2", label: "CO2 concentration — normal atmospheric level, and efficiently concentrated internally by the C4 pathway", x: 55, y: 25 },
          { id: "h3", label: "Temperature — high, but within this species' optimal range due to its C4 adaptation", x: 70, y: 50 },
          { id: "h4", label: "Water availability — not restricted", x: 40, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "This plant's C4 adaptation specifically changes how it handles CO2 and heat compared to a C3 plant — rule out the factors its adaptation is built to handle, and check what's left at saturation.",
      },
    },
  ];

  const glycolysisFermentationChallenges = [
    {
      title: "Identify Glycolysis as the Shared First Step",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "cellular_respiration_pathway_grade11",
        prompt: "Glucose is broken down into two molecules of pyruvate in the cytoplasm, producing a small net yield of ATP — this step happens whether or not oxygen is available. Click the pathway stage shown.",
        hotspots: [
          { id: "h1", label: "Glycolysis — glucose to pyruvate, cytoplasm, oxygen-independent", x: 30, y: 35 },
          { id: "h2", label: "Lactic acid fermentation — pyruvate to lactic acid, no oxygen, muscle cells", x: 60, y: 30 },
          { id: "h3", label: "Alcoholic fermentation — pyruvate to ethanol + CO2, no oxygen, yeast", x: 45, y: 60 },
          { id: "h4", label: "Krebs cycle — pyruvate fully oxidised, mitochondria, requires oxygen", x: 70, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "This step happens first, in the cytoplasm, and doesn't care whether oxygen is present — that's the one shared starting point every pathway on this list builds on.",
      },
    },
    {
      title: "Identify Alcoholic Fermentation's End Products",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "cellular_respiration_pathway_grade11",
        prompt: "Yeast cells, deprived of oxygen, convert the pyruvate from glycolysis into ethanol and carbon dioxide, regenerating the NAD+ needed to keep glycolysis running. Click the pathway shown.",
        hotspots: [
          { id: "h1", label: "Glycolysis — glucose to pyruvate, cytoplasm, oxygen-independent", x: 30, y: 35 },
          { id: "h2", label: "Lactic acid fermentation — pyruvate to lactic acid, no oxygen, muscle cells", x: 60, y: 30 },
          { id: "h3", label: "Alcoholic fermentation — pyruvate to ethanol + CO2, no oxygen, yeast", x: 45, y: 60 },
          { id: "h4", label: "Krebs cycle — pyruvate fully oxidised, mitochondria, requires oxygen", x: 70, y: 65 },
        ],
        correct_hotspot_id: "h3",
        hint: "Two different organisms ferment pyruvate into two different end products when oxygen runs out — this one is specifically the yeast/ethanol route, not the muscle/lactic-acid route.",
      },
    },
    {
      title: "Explain Why Fermentation Happens at All",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "cellular_respiration_pathway_grade11",
        prompt: "A sprinting muscle cell's mitochondria can't process pyruvate fast enough to keep up with how quickly glycolysis is producing it, and oxygen delivery is also falling behind demand. Click the pathway the cell relies on so glycolysis itself doesn't grind to a halt.",
        hotspots: [
          { id: "h1", label: "Krebs cycle — would need more oxygen and mitochondrial capacity than is currently available", x: 70, y: 65 },
          { id: "h2", label: "Lactic acid fermentation — regenerates NAD+ in the cytoplasm without needing oxygen", x: 60, y: 30 },
          { id: "h3", label: "Electron transport system — depends on oxygen as the final electron acceptor", x: 25, y: 30 },
          { id: "h4", label: "Photosynthesis — not a pathway available to animal muscle cells", x: 45, y: 60 },
        ],
        correct_hotspot_id: "h2",
        hint: "The real problem isn't just 'no oxygen' — it's that glycolysis needs a steady supply of NAD+ to keep running at all. Which pathway regenerates that supply without needing oxygen or the mitochondria?",
      },
    },
  ];

  const allChallenges = [
    { concept: concepts["Diffusion, Osmosis, and Water Potential"], levels: waterPotentialChallenges },
    { concept: concepts["Deficiency Symptoms"], levels: deficiencyChallenges },
    { concept: concepts["C4 Pathway and Factors Affecting Photosynthesis"], levels: photosynthesisLimitingFactorChallenges },
    { concept: concepts["Glycolysis and Fermentation"], levels: glycolysisFermentationChallenges },
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

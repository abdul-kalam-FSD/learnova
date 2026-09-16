require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Grade-coverage gap-fill: Biology's Grade 11 previously only had
// Case Investigation (Section 5 — Biology should have more than one
// mechanic; Grades 9, 10, and 12 already got a 2nd mechanic via
// seedBioVirtualLab.js, seedBioEcosystemBalance.js, and
// seedBioEcosystemGrade12.js). This extends Virtual Lab to Grade 11
// at a deeper level than Grade 9's basic nucleus/mitochondria/
// membrane set — internal membrane-system organelles instead. Links
// to the existing "Eukaryotic Cell Organelles" concept created by
// seedGrade11_batch3.js — run that first.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 11, name: /biology|science/i });
  if (!subject) {
    console.error("Grade 11 Science/Biology subject not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "Cell: The Unit of Life" });
  if (!chapter) {
    console.error("Chapter 'Cell: The Unit of Life' not found.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Eukaryotic Cell Organelles" });
  if (!concept) {
    console.error(
      "Concept 'Eukaryotic Cell Organelles' not found — run seedGrade11_batch3.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  // payload shape: same as Grade 9's Virtual Lab — student is shown
  // a labeled diagram with clickable hotspots and must identify the
  // structure matching `prompt`. `correct_hotspot_id` is stripped
  // before the client sees it.
  const labChallenges = [
    {
      title: "Identify the Rough Endoplasmic Reticulum",
      difficulty: "medium",
      order_index: 1,
      payload: {
        specimen: "eukaryotic_cell_diagram",
        prompt: "Click the organelle studded with ribosomes that synthesizes and packages proteins.",
        hotspots: [
          { id: "h1", label: "Rough Endoplasmic Reticulum", x: 40, y: 40 },
          { id: "h2", label: "Smooth Endoplasmic Reticulum", x: 60, y: 35 },
          { id: "h3", label: "Golgi Apparatus", x: 55, y: 55 },
          { id: "h4", label: "Lysosome", x: 25, y: 70 },
        ],
        correct_hotspot_id: "h1",
        hint: "The 'rough' texture comes from ribosomes attached to its outer surface.",
      },
    },
    {
      title: "Identify the Golgi Apparatus",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "eukaryotic_cell_diagram",
        prompt: "Click the organelle that modifies, sorts, and packages proteins for secretion.",
        hotspots: [
          { id: "h1", label: "Rough Endoplasmic Reticulum", x: 40, y: 40 },
          { id: "h2", label: "Smooth Endoplasmic Reticulum", x: 60, y: 35 },
          { id: "h3", label: "Golgi Apparatus", x: 55, y: 55 },
          { id: "h4", label: "Lysosome", x: 25, y: 70 },
        ],
        correct_hotspot_id: "h3",
        hint: "Its stacked, flattened sac structure is often described as the cell's 'shipping department'.",
      },
    },
    {
      title: "Identify the Lysosome",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "eukaryotic_cell_diagram",
        prompt: "Click the organelle containing digestive enzymes that breaks down waste and worn-out cell parts.",
        hotspots: [
          { id: "h1", label: "Smooth Endoplasmic Reticulum", x: 60, y: 35 },
          { id: "h2", label: "Golgi Apparatus", x: 55, y: 55 },
          { id: "h3", label: "Lysosome", x: 25, y: 70 },
          { id: "h4", label: "Peroxisome", x: 75, y: 65 },
        ],
        correct_hotspot_id: "h3",
        hint: "It's sometimes called the cell's 'suicide bag' because it can self-digest a damaged cell.",
      },
    },
  ];

  for (const challenge of labChallenges) {
    const exists = await GameContent.findOne({
      game_type: "BIO_VIRTUAL_LAB",
      title: challenge.title,
    });
    if (!exists) {
      const created = await GameContent.create({
        game_type: "BIO_VIRTUAL_LAB",
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

  console.log("Done. concept_id:", concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

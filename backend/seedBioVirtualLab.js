require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Vertical-slice seed for Biology's second gameplay type (Section 5:
// Case Investigation should not be the only Biology mechanic).
// Links to the existing Grade 9 "Cell Structure and Organelles"
// concept created by seedGrade9.js — run that first.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Cell Structure and Organelles" });
  if (!concept) {
    console.error(
      "Concept 'Cell Structure and Organelles' not found — run seedGrade9.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  // payload shape: student is shown a labeled diagram with clickable
  // hotspots and must identify the structure matching `prompt`.
  const labChallenges = [
    {
      title: "Identify the Nucleus",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "animal_cell_diagram",
        prompt: "Click the organelle that controls the cell's activities and holds DNA.",
        hotspots: [
          { id: "h1", label: "Nucleus", x: 50, y: 45 },
          { id: "h2", label: "Mitochondria", x: 25, y: 65 },
          { id: "h3", label: "Cell Membrane", x: 10, y: 15 },
          { id: "h4", label: "Cytoplasm", x: 70, y: 30 },
        ],
        correct_hotspot_id: "h1",
        hint: "This organelle is usually near the center of the cell.",
      },
    },
    {
      title: "Identify the Mitochondria",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "animal_cell_diagram",
        prompt: "Click the organelle known as the 'powerhouse of the cell'.",
        hotspots: [
          { id: "h1", label: "Nucleus", x: 50, y: 45 },
          { id: "h2", label: "Mitochondria", x: 25, y: 65 },
          { id: "h3", label: "Cell Membrane", x: 10, y: 15 },
          { id: "h4", label: "Cytoplasm", x: 70, y: 30 },
        ],
        correct_hotspot_id: "h2",
        hint: "It generates energy (ATP) for the cell.",
      },
    },
    {
      title: "Identify the Cell Membrane",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "plant_cell_diagram",
        prompt: "Click the structure that controls what enters and exits the cell.",
        hotspots: [
          { id: "h1", label: "Nucleus", x: 50, y: 45 },
          { id: "h2", label: "Cell Wall", x: 5, y: 5 },
          { id: "h3", label: "Cell Membrane", x: 12, y: 12 },
          { id: "h4", label: "Chloroplast", x: 70, y: 60 },
        ],
        correct_hotspot_id: "h3",
        hint: "It sits just inside the (plant-only) cell wall.",
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

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

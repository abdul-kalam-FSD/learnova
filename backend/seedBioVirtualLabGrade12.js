require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes the last cell for BIO_VIRTUAL_LAB in the Biology 9-12
// coverage gap found during the full-project audit (previously
// Grades 9 and 11 only). Links to the existing "Flower Structure and
// Pollination" concept created by seedGrade12_batch1.js — run that
// first. Uses a flower diagram instead of reusing the Grade 9/11 cell
// diagram, matching what this concept actually teaches. Same payload
// shape and scoring path as every other Virtual Lab grade.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Flower Structure and Pollination" });
  if (!concept) {
    console.error(
      "Concept 'Flower Structure and Pollination' not found — run seedGrade12_batch1.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const labChallenges = [
    {
      title: "Identify the Anther",
      difficulty: "medium",
      order_index: 1,
      payload: {
        specimen: "flower_diagram",
        prompt: "Click the pollen-producing structure at the tip of the stamen (the flower's male part).",
        hotspots: [
          { id: "h1", label: "Anther", x: 65, y: 25 },
          { id: "h2", label: "Filament", x: 65, y: 45 },
          { id: "h3", label: "Stigma", x: 35, y: 20 },
          { id: "h4", label: "Style", x: 35, y: 40 },
        ],
        correct_hotspot_id: "h1",
        hint: "This sits at the top of the thin stalk (filament) and is where pollen grains actually develop.",
      },
    },
    {
      title: "Identify the Stigma",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "flower_diagram",
        prompt: "Click the sticky surface at the top of the pistil (the flower's female part) where pollen grains land during pollination.",
        hotspots: [
          { id: "h1", label: "Anther", x: 65, y: 25 },
          { id: "h2", label: "Filament", x: 65, y: 45 },
          { id: "h3", label: "Stigma", x: 35, y: 20 },
          { id: "h4", label: "Style", x: 35, y: 40 },
        ],
        correct_hotspot_id: "h3",
        hint: "Pollen has to land here first, before the pollen tube grows down toward the ovary.",
      },
    },
    {
      title: "Identify the Ovary",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "flower_diagram",
        prompt: "Click the structure at the base of the pistil that contains the ovules and develops into the fruit after fertilization.",
        hotspots: [
          { id: "h1", label: "Ovary", x: 35, y: 60 },
          { id: "h2", label: "Style", x: 35, y: 40 },
          { id: "h3", label: "Sepal", x: 15, y: 70 },
          { id: "h4", label: "Petal", x: 55, y: 65 },
        ],
        correct_hotspot_id: "h1",
        hint: "This is where the ovules — and eventually the seeds and fruit — actually develop, at the base of the pistil.",
      },
    },
  ];

  for (const level of labChallenges) {
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

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

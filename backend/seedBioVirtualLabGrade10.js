require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Closes another cell of the Biology 9-12 content gap found during
// the full-project audit: BIO_VIRTUAL_LAB previously existed at
// Grades 9 and 11 (cell organelles) but not Grade 10. Links to the
// existing "Transportation and Excretion" concept created by
// seedGrade10.js — run that first. Uses the human heart instead of
// cell organelles, matching what this concept actually teaches
// (circulatory transport), rather than reusing the Grade 9/11 cell
// diagram out of convenience. Same payload shape (labeled diagram +
// clickable hotspots + single correct_hotspot_id) and scoring path as
// every other Virtual Lab grade.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: "Transportation and Excretion" });
  if (!concept) {
    console.error(
      "Concept 'Transportation and Excretion' not found — run seedGrade10.js first.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const labChallenges = [
    {
      title: "Identify the Right Atrium",
      difficulty: "easy",
      order_index: 1,
      payload: {
        specimen: "human_heart_diagram",
        prompt: "Click the chamber that receives deoxygenated blood returning from the body via the vena cavae.",
        hotspots: [
          { id: "h1", label: "Right Atrium", x: 62, y: 30 },
          { id: "h2", label: "Left Atrium", x: 38, y: 30 },
          { id: "h3", label: "Right Ventricle", x: 60, y: 62 },
          { id: "h4", label: "Left Ventricle", x: 38, y: 62 },
        ],
        correct_hotspot_id: "h1",
        hint: "This chamber sits on the same side as the vena cavae, which carry blood in from the body.",
      },
    },
    {
      title: "Identify the Left Ventricle",
      difficulty: "medium",
      order_index: 2,
      payload: {
        specimen: "human_heart_diagram",
        prompt: "Click the chamber with the thickest muscular wall, which pumps oxygenated blood out to the entire body through the aorta.",
        hotspots: [
          { id: "h1", label: "Right Atrium", x: 62, y: 30 },
          { id: "h2", label: "Left Atrium", x: 38, y: 30 },
          { id: "h3", label: "Right Ventricle", x: 60, y: 62 },
          { id: "h4", label: "Left Ventricle", x: 38, y: 62 },
        ],
        correct_hotspot_id: "h4",
        hint: "It needs the most muscle of any chamber, since it pushes blood through the entire body rather than just to the lungs.",
      },
    },
    {
      title: "Identify the Aorta",
      difficulty: "hard",
      order_index: 3,
      payload: {
        specimen: "human_heart_diagram",
        prompt: "Click the large artery that carries oxygenated blood out of the heart to the rest of the body.",
        hotspots: [
          { id: "h1", label: "Aorta", x: 45, y: 12 },
          { id: "h2", label: "Pulmonary Artery", x: 58, y: 15 },
          { id: "h3", label: "Vena Cava", x: 70, y: 20 },
          { id: "h4", label: "Pulmonary Vein", x: 30, y: 20 },
        ],
        correct_hotspot_id: "h1",
        hint: "This is the largest artery in the body, and the only one on this list carrying oxygenated blood away from the heart to the body (not the lungs).",
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

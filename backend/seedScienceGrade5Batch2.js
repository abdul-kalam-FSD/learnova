require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Batch 6 (Grade 4-5 curriculum depth audit). "Stages of Seed
// Germination" (Grade 5 EVS, seedScienceGrade5.js) shows 4 stages as
// clickable hotspots across its rounds — Swelling Seed, Root Growing
// Down, Shoot Growing Up, First Leaves Open — but only 3 of those 4
// stages are ever the correct target (Swelling Seed, Root, First
// Leaves). "Shoot Growing Up" appears as a hotspot option in 2 of the
// 3 existing rounds yet is never once the answer, so a student could
// finish the concept without ever identifying that stage. This adds
// 1 more BIO_VIRTUAL_LAB round to the SAME existing concept, closing
// that gap. Same hotspot payload shape as the original 3 rounds — no
// new mechanic. Errors out if the subject/chapter/concept don't
// already exist.
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const subject = await Subject.findOne({ grade: 5, name: "EVS" });
  if (!subject) {
    console.error("Grade 5 EVS subject not found — run seedScienceGrade5.js first.");
    process.exit(1);
  }
  console.log("Using existing subject:", subject._id);

  const chapter = await Chapter.findOne({ subject_id: subject._id, title: "How Seeds Grow" });
  if (!chapter) {
    console.error('Chapter "How Seeds Grow" not found — run seedScienceGrade5.js first.');
    process.exit(1);
  }
  console.log("Using existing chapter:", chapter._id);

  const concept = await Concept.findOne({ chapter_id: chapter._id, title: "Stages of Seed Germination" });
  if (!concept) {
    console.error('Concept "Stages of Seed Germination" not found — run seedScienceGrade5.js first.');
    process.exit(1);
  }
  console.log("Using existing concept:", concept._id);

  const newChallenges = [
    {
      title: "Identify the Shoot Stage",
      difficulty: "medium",
      order_index: 4,
      payload: {
        specimen: "seed_germination_diagram",
        prompt: "Click the stage where a green shoot is growing upward, after the root but before any leaves have opened.",
        hotspots: [
          { id: "h1", label: "Swelling Seed", x: 20, y: 70 },
          { id: "h2", label: "Root Growing Down", x: 35, y: 80 },
          { id: "h3", label: "Shoot Growing Up", x: 55, y: 55 },
          { id: "h4", label: "First Leaves Open", x: 75, y: 30 },
        ],
        correct_hotspot_id: "h3",
        hint: "The shoot pushes upward toward the light, in between the root already growing down and the leaves that haven't opened yet.",
      },
    },
  ];

  for (const challenge of newChallenges) {
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

  console.log("Done. subject_id / chapter_id / concept_id:", subject._id, chapter._id, concept._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

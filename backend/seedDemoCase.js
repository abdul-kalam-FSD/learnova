require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Case = require("./src/models/Case");
const Concept = require("./src/models/Concept");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const concept = await Concept.findOne({ title: /^respiration$/i });
  if (!concept) {
    console.error(
      "Could not find a 'Respiration' concept. Make sure Grade 10 Batch 1 (seedGrade10.js) has been run.",
    );
    process.exit(1);
  }

  const existing = await Case.findOne({ title: "Why Can't She Breathe?" });
  if (existing) {
    console.log("Demo case already exists:", existing._id);
    await mongoose.disconnect();
    return;
  }

  const demoCase = await Case.create({
    title: "Why Can't She Breathe?",
    intro_text:
      "During today's sports period, a Grade 10 student ran a single lap and had to stop — gasping, chest tight, unable to catch her breath. The school nurse ruled out injury. Something inside her body is not moving air the way it should.",
    concept_ids: [concept._id],
    clue_count: 3,
    dragdrop_task: {
      prompt: "Arrange the Airflow Pathway",
      clue_text:
        "To trace how air actually reaches her lungs, reconstruct the pathway it travels — in order.",
      items: ["Nose", "Trachea", "Bronchi", "Lungs"],
    },
    matching_task: {
      prompt: "Match the Structure to Its Role",
      clue_text:
        "Before you rule this system in for good, confirm each structure is doing the job you think it is.",
      pairs: [
        { structure: "Lungs", role: "Site of gas exchange" },
        { structure: "Trachea", role: "Air passage tube" },
        { structure: "Diaphragm", role: "Main breathing muscle" },
        { structure: "Alveoli", role: "Tiny air sacs" },
      ],
    },
  });

  console.log("Demo case created:", demoCase._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});

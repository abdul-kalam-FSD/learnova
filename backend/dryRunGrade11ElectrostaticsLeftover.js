require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// DRY RUN ONLY — lists exactly what would be deleted. Deletes nothing.
// Targets the confirmed old Grade 11 leftover found by the audit:
//   Chapter "Electrostatics" (6aa507a738a488b24ea27c6c)
//   Concept "Calculating Capacitance" (6aa507a738a488b24ea27c6d)
//   + its GameContent docs

const CHAPTER_ID = "6aa507a738a488b24ea27c6c";
const CONCEPT_ID = "6aa507a738a488b24ea27c6d";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");
  console.log("=== DRY RUN — nothing will be deleted ===\n");

  const chapter = await Chapter.findById(CHAPTER_ID);
  if (!chapter) {
    console.log("Chapter not found — may already be removed. Stopping.");
    await mongoose.disconnect();
    return;
  }
  console.log(`Chapter to delete: "${chapter.title}" (subject_id=${chapter.subject_id}) id=${chapter._id}`);

  const concept = await Concept.findById(CONCEPT_ID);
  if (concept) {
    console.log(`Concept to delete: "${concept.title}" id=${concept._id}`);
  }

  const gameContents = await GameContent.find({ concept_id: CONCEPT_ID });
  console.log(`GameContent docs to delete (${gameContents.length}):`);
  for (const gc of gameContents) {
    console.log(`  - "${gc.title}" (game_type=${gc.game_type}) id=${gc._id}`);
  }

  console.log("\n=== Dry run complete. Nothing was deleted. ===");
  console.log("If this list looks correct, run deleteGrade11ElectrostaticsLeftover.js with CONFIRM=yes to actually delete.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

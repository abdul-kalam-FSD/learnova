require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Migrates the "Calculating Capacitance" concept (+ its 2
// PHYSICS_CAPACITANCE_SPEED_CHALLENGE GameContent docs) from the old
// Grade 11 "Electrostatics" chapter to the already-existing Grade 12
// "Electrostatics" chapter (the one seedPhysicsCapacitorCircuitGrade12.js
// seeds). Re-parents the Concept in place (same _id, so GameContent's
// concept_id references need no change) rather than recreating it.
// Then deletes the now-empty old Grade 11 "Electrostatics" chapter.
// Does NOT touch the Grade 11 Physics subject itself (it still has
// the unrelated "Work, Energy and Power" chapter) or any other data.
//
// SAFE BY DEFAULT: run with no arguments to DRY RUN (shows exactly
// what would change, writes nothing). Run with CONFIRM=yes to apply.
//
//   node migrateCapacitanceToGrade12.js            (dry run)
//   CONFIRM=yes node migrateCapacitanceToGrade12.js  (applies changes)

const OLD_CHAPTER_ID = "6aa507a738a488b24ea27c6c"; // Grade 11 "Electrostatics"
const OLD_CONCEPT_ID = "6aa507a738a488b24ea27c6d"; // "Calculating Capacitance"
const NEW_CHAPTER_ID = "6a9954ec7ac4d2dfec8cc8cd"; // Grade 12 "Electrostatics"

const APPLY = process.env.CONFIRM === "yes";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");
  console.log(APPLY ? "=== APPLYING CHANGES ===\n" : "=== DRY RUN (no CONFIRM=yes set) — nothing will be written ===\n");

  const oldChapter = await Chapter.findById(OLD_CHAPTER_ID);
  const newChapter = await Chapter.findById(NEW_CHAPTER_ID);
  const concept = await Concept.findById(OLD_CONCEPT_ID);

  if (!oldChapter) {
    console.log("Old Grade 11 chapter not found — may already be migrated/removed. Stopping.");
    await mongoose.disconnect();
    return;
  }
  if (!newChapter) {
    console.log("ERROR: expected Grade 12 'Electrostatics' chapter not found at that id. Stopping without changes.");
    await mongoose.disconnect();
    return;
  }
  if (!concept) {
    console.log("Old concept not found — may already be migrated. Stopping.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Old chapter: "${oldChapter.title}" (grade-11 Physics) id=${oldChapter._id}`);
  console.log(`New chapter: "${newChapter.title}" (grade-12 Physics) id=${newChapter._id}`);
  console.log(`Concept to re-parent: "${concept.title}" id=${concept._id}`);

  const gameContents = await GameContent.find({ concept_id: concept._id });
  console.log(`GameContent docs staying under this concept (untouched, just now live under Grade 12): ${gameContents.length}`);
  for (const gc of gameContents) {
    console.log(`  - "${gc.title}" id=${gc._id}`);
  }

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with CONFIRM=yes to apply the migration.");
    await mongoose.disconnect();
    return;
  }

  concept.chapter_id = newChapter._id;
  await concept.save();
  console.log(`\nRe-parented concept ${concept._id} -> chapter ${newChapter._id}`);

  const remaining = await Concept.countDocuments({ chapter_id: oldChapter._id });
  if (remaining === 0) {
    await Chapter.deleteOne({ _id: oldChapter._id });
    console.log(`Deleted now-empty old chapter "${oldChapter.title}" (id=${oldChapter._id})`);
  } else {
    console.log(`Old chapter still has ${remaining} concept(s) left — not deleting it. Please check manually.`);
  }

  console.log("\n=== Migration complete. ===");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

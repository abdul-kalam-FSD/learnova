/**
 * diagnoseBioMismatchReadOnly.js
 *
 * TEMPORARY, READ-ONLY diagnostic. Follow-up to checkLiveDatabaseReadOnly.js's
 * Step 8 failures. Does NOT modify anything — only connect / find / lean().
 *
 * For every GameContent record of the 7 Biology 11/12 game types, resolves
 * its concept_id -> Concept -> Chapter -> Subject and prints exactly what
 * grade/subject/chapter/concept it actually belongs to right now, so we can
 * tell whether this is (a) a real seeding bug (wrong grade's concept used)
 * or (b) a Subject.name mismatch (e.g. Grade 11/12 Biology stored under a
 * different name than the exact string "Biology").
 *
 * Usage: node diagnoseBioMismatchReadOnly.js   (run from backend/)
 */

require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

const GAME_TYPES = [
  "BIO_DIAGNOSIS",
  "BIO_VIRTUAL_LAB",
  "BIO_SPECIMEN_ANALYSIS",
  "BIO_ECOSYSTEM_BALANCE",
  "BIO_GENETICS_SIMULATOR",
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected.\n");

  // First: show every Subject whose name looks Biology-ish, across all
  // grades, in case Grade 11/12 uses a different exact string.
  const bioLikeSubjects = await Subject.find({ name: /bio/i }).select("_id name grade board").lean();
  console.log("=== Subjects with a Biology-like name (any grade) ===");
  for (const s of bioLikeSubjects) {
    console.log(`  _id=${s._id}  grade=${s.grade}  name="${s.name}"  board=${s.board}`);
  }
  console.log();

  const records = await GameContent.find({ game_type: { $in: GAME_TYPES } })
    .select("_id game_type concept_id title")
    .lean();

  console.log(`=== ${records.length} GameContent records for the 5 Biology mechanics ===\n`);

  for (const r of records) {
    const concept = await Concept.findById(r.concept_id).select("title chapter_id").lean();
    if (!concept) {
      console.log(`[${r.game_type}] GameContent ${r._id} -> concept_id ${r.concept_id} : CONCEPT NOT FOUND (dangling reference)`);
      continue;
    }
    const chapter = await Chapter.findById(concept.chapter_id).select("title subject_id").lean();
    if (!chapter) {
      console.log(`[${r.game_type}] GameContent ${r._id} -> concept "${concept.title}" -> chapter_id ${concept.chapter_id} : CHAPTER NOT FOUND (dangling reference)`);
      continue;
    }
    const subject = await Subject.findById(chapter.subject_id).select("name grade board").lean();
    if (!subject) {
      console.log(`[${r.game_type}] GameContent ${r._id} -> chapter "${chapter.title}" -> subject_id ${chapter.subject_id} : SUBJECT NOT FOUND (dangling reference)`);
      continue;
    }
    console.log(
      `[${r.game_type}] "${r.title}" -> concept "${concept.title}" -> chapter "${chapter.title}" -> subject "${subject.name}" (grade ${subject.grade}, board ${subject.board})`,
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Diagnostic script crashed:", err.message);
  process.exitCode = 1;
});

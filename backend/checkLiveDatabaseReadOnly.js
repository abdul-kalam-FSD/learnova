/**
 * checkLiveDatabaseReadOnly.js
 *
 * TEMPORARY, READ-ONLY live MongoDB verification script for Learnova.
 *
 * SAFETY: this script performs ONLY connect / find / countDocuments /
 * distinct / aggregate ($lookup, $group, $match, $count — all read
 * stages) calls. It never calls insertOne/insertMany, updateOne/
 * updateMany, deleteOne/deleteMany, replaceOne, findOneAndUpdate,
 * findOneAndDelete, bulkWrite, create, save, drop, dropIndex,
 * createIndex, or any seed/migration script. It does not modify any
 * existing application file. It exits non-zero ONLY when a real
 * verification failure is found (missing data / broken relationship /
 * baseline mismatch that can't be explained) — never on warnings.
 *
 * Usage:  node checkLiveDatabaseReadOnly.js      (run from backend/)
 */

require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const dns = require("dns");

// Match the project's own connection setup (src/config/db.js) so this
// script behaves identically to the real app when resolving the
// mongodb+srv:// SRV record.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Use the project's ACTUAL models (not re-declared schemas) so this
// script can never drift from the real schema.
const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");
const Question = require("./src/models/Question");
const QuizSession = require("./src/models/QuizzSession");
const Case = require("./src/models/Case");
const Assignment = require("./src/models/Assignment");
const Stream = require("./src/models/Stream");
const UserConceptMastery = require("./src/models/UserConceptMastery");
const PushSubscription = require("./src/models/PushSubscription");
const User = require("./src/models/User");

const { KNOWN_GAME_TYPES } = require("./src/utils/gameTypeRegistry");

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const BASELINE = {
  subjects: 57,
  chapters: 139,
  concepts: 281,
  questions: 810,
  gamecontent: 454,
};

const BIOLOGY_EXPECTATIONS = [
  { grade: 11, game_type: "BIO_DIAGNOSIS" },
  { grade: 11, game_type: "BIO_VIRTUAL_LAB" },
  { grade: 12, game_type: "BIO_DIAGNOSIS" },
  { grade: 12, game_type: "BIO_SPECIMEN_ANALYSIS" },
  { grade: 12, game_type: "BIO_VIRTUAL_LAB" },
  { grade: 12, game_type: "BIO_ECOSYSTEM_BALANCE" },
  { grade: 12, game_type: "BIO_GENETICS_SIMULATOR" },
];

const warnings = [];
const failures = [];
const lines = [];
const p = (s = "") => lines.push(s);

function statusLine(ok) {
  return ok ? "PASS" : "FAIL";
}

async function main() {
  p("=".repeat(50));
  p("LEARNOVA LIVE DATABASE VERIFICATION");
  p("=".repeat(50));
  p();

  // -------------------- STEP 3: CONNECTION --------------------
  let dbName = "(unknown)";
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    dbName = conn.connection.name;
    p(`MongoDB connection: PASS`);
    p(`Database name: ${dbName}`);
  } catch (err) {
    p(`MongoDB connection: FAIL`);
    p(`Reason: ${err.message}`);
    p();
    p("=".repeat(50));
    p("FINAL RESULT");
    p("=".repeat(50));
    p("DATABASE CONNECTION FAILED");
    console.log(lines.join("\n"));
    process.exitCode = 1;
    return;
  }
  p();

  try {
    // -------------------- STEP 4: COLLECTION COUNTS --------------------
    p("Collections:");
    const counts = {
      users: await User.countDocuments(),
      subjects: await Subject.countDocuments(),
      chapters: await Chapter.countDocuments(),
      concepts: await Concept.countDocuments(),
      questions: await Question.countDocuments(),
      gamecontents: await GameContent.countDocuments(),
      quizsessions: await QuizSession.countDocuments(),
      cases: await Case.countDocuments(),
      assignments: await Assignment.countDocuments(),
      streams: await Stream.countDocuments(),
      userconceptmasteries: await UserConceptMastery.countDocuments(),
      pushsubscriptions: await PushSubscription.countDocuments(),
    };
    for (const [name, count] of Object.entries(counts)) {
      p(`  ${name}: ${count}`);
    }
    p();

    // -------------------- STEP 5: GRADE COVERAGE --------------------
    p("Grade coverage:");
    for (const grade of GRADES) {
      const subjects = await Subject.find({ grade }).select("_id").lean();
      const subjectIds = subjects.map((s) => s._id);

      const chapters = subjectIds.length
        ? await Chapter.find({ subject_id: { $in: subjectIds } }).select("_id").lean()
        : [];
      const chapterIds = chapters.map((c) => c._id);

      const concepts = chapterIds.length
        ? await Concept.find({ chapter_id: { $in: chapterIds } }).select("_id").lean()
        : [];
      const conceptIds = concepts.map((c) => c._id);

      const gameContentDocs = conceptIds.length
        ? await GameContent.find({ concept_id: { $in: conceptIds } })
            .select("game_type")
            .lean()
        : [];
      const uniqueGameTypes = new Set(gameContentDocs.map((g) => g.game_type));

      const gradeOk = subjects.length > 0 && chapters.length > 0 && concepts.length > 0;
      if (!gradeOk) {
        failures.push(`Grade ${grade} has no subjects/chapters/concepts.`);
      }

      p(`GRADE ${grade}`);
      p(`  Subjects: ${subjects.length}`);
      p(`  Chapters: ${chapters.length}`);
      p(`  Concepts: ${concepts.length}`);
      p(`  GameContent: ${gameContentDocs.length}`);
      p(`  Unique game types: ${uniqueGameTypes.size}`);
      p(`  Status: ${statusLine(gradeOk)}`);
    }
    p();

    // -------------------- STEP 6: RELATIONSHIP INTEGRITY --------------------
    p("Relationship integrity:");

    const allSubjectIds = new Set((await Subject.find().select("_id").lean()).map((s) => String(s._id)));
    const allChapters = await Chapter.find().select("_id subject_id").lean();
    const chaptersWithMissingSubject = allChapters.filter(
      (c) => !allSubjectIds.has(String(c.subject_id)),
    );
    const allChapterIds = new Set(allChapters.map((c) => String(c._id)));

    const allConcepts = await Concept.find().select("_id chapter_id").lean();
    const conceptsWithMissingChapter = allConcepts.filter(
      (c) => !allChapterIds.has(String(c.chapter_id)),
    );
    const allConceptIds = new Set(allConcepts.map((c) => String(c._id)));

    const allGameContent = await GameContent.find().select("_id concept_id").lean();
    const gameContentWithMissingConcept = allGameContent.filter(
      (g) => !allConceptIds.has(String(g.concept_id)),
    );

    const allQuestions = await Question.find().select("_id concept_id").lean();
    const questionsWithMissingConcept = allQuestions.filter(
      (q) => !allConceptIds.has(String(q.concept_id)),
    );

    // Empty chapters: chapters with zero linked concepts.
    const conceptCountByChapter = {};
    for (const c of allConcepts) {
      const key = String(c.chapter_id);
      conceptCountByChapter[key] = (conceptCountByChapter[key] || 0) + 1;
    }
    const emptyChapters = allChapters.filter((c) => !conceptCountByChapter[String(c._id)]);

    // Empty concepts: concepts with zero linked GameContent AND zero linked Questions
    // (a genuine dead end — nothing to actually play/answer for that concept).
    const gcCountByConcept = {};
    for (const g of allGameContent) {
      const key = String(g.concept_id);
      gcCountByConcept[key] = (gcCountByConcept[key] || 0) + 1;
    }
    const qCountByConcept = {};
    for (const q of allQuestions) {
      const key = String(q.concept_id);
      qCountByConcept[key] = (qCountByConcept[key] || 0) + 1;
    }
    const emptyConcepts = allConcepts.filter(
      (c) => !gcCountByConcept[String(c._id)] && !qCountByConcept[String(c._id)],
    );

    const relationshipOk =
      chaptersWithMissingSubject.length === 0 &&
      conceptsWithMissingChapter.length === 0 &&
      gameContentWithMissingConcept.length === 0 &&
      questionsWithMissingConcept.length === 0;

    if (!relationshipOk) {
      failures.push("Orphan records found in the curriculum relationship chain (see report).");
    }
    if (emptyChapters.length > 0) {
      warnings.push(`${emptyChapters.length} chapter(s) have zero concepts.`);
    }
    if (emptyConcepts.length > 0) {
      warnings.push(`${emptyConcepts.length} concept(s) have zero GameContent and zero Questions.`);
    }

    p(`  Chapters referencing missing subjects: ${chaptersWithMissingSubject.length}`);
    p(`  Concepts referencing missing chapters: ${conceptsWithMissingChapter.length}`);
    p(`  GameContent referencing missing concepts: ${gameContentWithMissingConcept.length}`);
    p(`  Questions referencing missing concepts: ${questionsWithMissingConcept.length}`);
    p(`  Empty chapters (0 concepts): ${emptyChapters.length}`);
    p(`  Empty concepts (0 GameContent AND 0 Questions): ${emptyConcepts.length}`);
    p(`  Status: ${statusLine(relationshipOk)}`);
    p();

    // -------------------- STEP 7: 54 GAME TYPE VERIFICATION --------------------
    p("54-game coverage:");
    const dbGameTypes = await GameContent.distinct("game_type");
    const dbGameTypeSet = new Set(dbGameTypes);
    const registrySet = new Set(KNOWN_GAME_TYPES);
    const missingFromDb = KNOWN_GAME_TYPES.filter((g) => !dbGameTypeSet.has(g));
    const unexpectedInDb = dbGameTypes.filter((g) => !registrySet.has(g));

    if (missingFromDb.length > 0) {
      failures.push(`${missingFromDb.length} registered game type(s) have zero GameContent in the DB.`);
    }
    if (unexpectedInDb.length > 0) {
      warnings.push(`${unexpectedInDb.length} game_type value(s) exist in DB but aren't in the backend registry.`);
    }

    p(`  Registered game types: ${KNOWN_GAME_TYPES.length}`);
    p(`  DB game types: ${dbGameTypes.length}`);
    p(`  Missing from DB: ${missingFromDb.length ? missingFromDb.join(", ") : "[]"}`);
    p(`  Unexpected DB game types: ${unexpectedInDb.length ? unexpectedInDb.join(", ") : "[]"}`);
    p();

    // -------------------- STEP 8: BIOLOGY GRADE 11/12 --------------------
    p("Biology 11/12:");
    const biologySubjectsByGrade = {};
    for (const grade of [11, 12]) {
      biologySubjectsByGrade[grade] = await Subject.find({ grade, name: "Biology" }).select("_id").lean();
    }

    for (const { grade, game_type } of BIOLOGY_EXPECTATIONS) {
      const bioSubjects = biologySubjectsByGrade[grade];
      const bioSubjectIds = bioSubjects.map((s) => s._id);
      const bioChapters = bioSubjectIds.length
        ? await Chapter.find({ subject_id: { $in: bioSubjectIds } }).select("_id").lean()
        : [];
      const bioChapterIds = bioChapters.map((c) => c._id);
      const bioConcepts = bioChapterIds.length
        ? await Concept.find({ chapter_id: { $in: bioChapterIds } }).select("_id").lean()
        : [];
      const bioConceptIds = new Set(bioConcepts.map((c) => String(c._id)));

      const records = await GameContent.find({ game_type }).select("_id concept_id").lean();
      const recordCount = records.length;
      const validPointers = records.filter((r) => bioConceptIds.has(String(r.concept_id))).length;
      const ok = recordCount > 0 && validPointers === recordCount;

      if (!ok) {
        failures.push(`Biology ${grade} ${game_type}: ${recordCount} record(s), ${validPointers} pointing to a valid Grade ${grade} Biology concept.`);
      }

      p(`  Grade ${grade} / ${game_type}`);
      p(`    Record count: ${recordCount}`);
      p(`    Valid concept/chapter links: ${validPointers}/${recordCount}`);
      p(`    Status: ${statusLine(ok)}`);
    }
    p();

    // -------------------- STEP 9: BASELINE COMPARISON --------------------
    p("Baseline comparison:");
    const currentTotals = {
      subjects: counts.subjects,
      chapters: counts.chapters,
      concepts: counts.concepts,
      questions: counts.questions,
      gamecontent: counts.gamecontents,
    };
    for (const [key, baselineVal] of Object.entries(BASELINE)) {
      const current = currentTotals[key];
      const diff = current - baselineVal;
      let note;
      if (diff === 0) {
        note = "matches baseline exactly";
      } else if (diff > 0) {
        note = `${diff} more than baseline — explainable if new content was added since the baseline was taken (check the areas memory / recent seed scripts run)`;
      } else {
        note = `${Math.abs(diff)} fewer than baseline — needs explanation; could mean a seed step wasn't run or content was removed`;
        warnings.push(`${key}: current (${current}) is below baseline (${baselineVal}) by ${Math.abs(diff)}.`);
      }
      p(`  ${key}: current=${current}, baseline=${baselineVal}, diff=${diff >= 0 ? "+" : ""}${diff} (${note})`);
    }
    p();

    // -------------------- STEP 10: DUPLICATE CHECK --------------------
    p("Duplicate checks:");

    const dupSubjects = await Subject.aggregate([
      { $group: { _id: { grade: "$grade", name: "$name", board: "$board" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    const dupChapters = await Chapter.aggregate([
      { $group: { _id: { subject_id: "$subject_id", title: "$title" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    const dupConcepts = await Concept.aggregate([
      { $group: { _id: { chapter_id: "$chapter_id", title: "$title" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    // GameContent's natural uniqueness key is (game_type, concept_id, title) —
    // two challenges for the same concept+game_type shouldn't share a title.
    const dupGameContent = await GameContent.aggregate([
      { $group: { _id: { game_type: "$game_type", concept_id: "$concept_id", title: "$title" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (dupSubjects.length) warnings.push(`${dupSubjects.length} duplicate Subject (grade+name+board) group(s).`);
    if (dupChapters.length) warnings.push(`${dupChapters.length} duplicate Chapter (subject+title) group(s).`);
    if (dupConcepts.length) warnings.push(`${dupConcepts.length} duplicate Concept (chapter+title) group(s).`);
    if (dupGameContent.length) warnings.push(`${dupGameContent.length} duplicate GameContent (game_type+concept+title) group(s).`);

    p(`  Duplicate subjects (same grade+name+board): ${dupSubjects.length}`);
    p(`  Duplicate chapters (same subject+title): ${dupChapters.length}`);
    p(`  Duplicate concepts (same chapter+title): ${dupConcepts.length}`);
    p(`  Duplicate GameContent (same game_type+concept+title): ${dupGameContent.length}`);
    p();

    // -------------------- STEP 11: FINAL REPORT --------------------
    p("=".repeat(50));
    p("FINAL RESULT");
    p("=".repeat(50));

    let finalResult;
    if (failures.length > 0) {
      finalResult = "DATABASE NOT VERIFIED — FAILURES FOUND";
      p("Failures:");
      failures.forEach((f) => p(`  - ${f}`));
    } else if (warnings.length > 0) {
      finalResult = "DATABASE VERIFIED WITH WARNINGS";
      p("Warnings:");
      warnings.forEach((w) => p(`  - ${w}`));
    } else {
      finalResult = "DATABASE VERIFIED — READY FOR DEPLOYMENT";
    }
    p();
    p(finalResult);

    if (failures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log(lines.join("\n"));
}

main().catch((err) => {
  console.error("Verification script crashed:", err.message);
  process.exitCode = 1;
});
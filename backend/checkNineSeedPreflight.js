/**
 * checkNineSeedPreflight.js
 * ---------------------------------------------------------------
 * READ-ONLY production preflight checker for the 9 target seeds.
 *
 * THIS SCRIPT PERFORMS ZERO DATABASE WRITES.
 * It only uses: find(), findOne(), countDocuments(), aggregate()
 * with read-only pipelines ($match/$lookup/$unwind/$project/$sort
 * only — no $merge/$out/$out-like stages anywhere below).
 *
 * It does NOT require/execute any of the 9 seed files (several of
 * them run their write logic immediately when required, since they
 * call `seed().catch(...)` at module scope). All "expected" target
 * data below was extracted by statically READING each seed file as
 * text and transcribing its Subject/Chapter/Concept queries and its
 * GameContent title list. Nothing here re-imports a seed file.
 * ---------------------------------------------------------------
 */

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
// Matches the exact workaround already used by db.js and every one
// of the 9 target seed files in this project — without forcing a
// public DNS resolver, the mongodb+srv:// SRV lookup fails with
// "querySrv ECONNREFUSED" on this environment's default resolver.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("./src/models/Subject");
const Chapter = require("./src/models/Chapter");
const Concept = require("./src/models/Concept");
const GameContent = require("./src/models/GameContent");

// Sanity counter. Must be 0 at the end of this script, always.
let dbWritesPerformed = 0;

// =================================================================
// STEP 2 (done statically, by reading each seed file as text)
// Normalized target summary for each of the 9 seeds.
// =================================================================
const TARGETS = [
  {
    seedFile: "seedBioDiagnosisGrade11.js",
    expectedGrade: 11,
    actualGameType: "BIO_DIAGNOSIS",
    mode: "prerequisite-concept", // does NOT create Subject/Chapter/Concept
    prerequisiteConceptTitle: "Lymph and Circulatory Disorders",
    prerequisiteHint: "run seedGrade11_batch6.js first",
    intendedTitles: [
      "The Silent Pressure",
      "The Exertional Chest Pain",
      "The Narrowing Vessel",
    ],
    duplicateLookupFields: ["game_type", "title"],
  },
  {
    seedFile: "seedBioDiagnosisGrade12.js",
    expectedGrade: 12,
    actualGameType: "BIO_DIAGNOSIS",
    mode: "prerequisite-concept",
    prerequisiteConceptTitle: "Common Diseases in Humans",
    prerequisiteHint: "run seedGrade12_batch3.js first",
    intendedTitles: ["The Cyclic Fever", "The Watery Stool", "The Productive Cough"],
    duplicateLookupFields: ["game_type", "title"],
  },
  {
    seedFile: "seedBioVirtualLabGrade12.js",
    expectedGrade: 12,
    actualGameType: "BIO_VIRTUAL_LAB",
    mode: "prerequisite-concept",
    prerequisiteConceptTitle: "Flower Structure and Pollination",
    prerequisiteHint: "run seedGrade12_batch1.js first",
    intendedTitles: ["Identify the Anther", "Identify the Stigma", "Identify the Ovary"],
    duplicateLookupFields: ["game_type", "title"],
  },
  {
    seedFile: "seedBioSpecimenAnalysisGrade12.js",
    expectedGrade: 12,
    actualGameType: "BIO_SPECIMEN_ANALYSIS",
    mode: "prerequisite-concept",
    prerequisiteConceptTitle: "Origin of Life and Evidence for Evolution",
    prerequisiteHint: "run seedGrade12_batch2.js first",
    intendedTitles: [
      "Evidence Sample 1: Forelimbs of a Bat, Whale, and Human",
      "Evidence Sample 2: Wings of a Butterfly and a Bird",
      "Evidence Sample 3: The Human Appendix",
    ],
    duplicateLookupFields: ["game_type", "title"],
  },
  {
    seedFile: "seedBioGeneticsGrade12.js",
    expectedGrade: 12,
    actualGameType: "BIO_GENETICS_SIMULATOR",
    mode: "prerequisite-concept",
    prerequisiteConceptTitle: "Mendelian Inheritance and Laws",
    prerequisiteHint: "run seedGrade12_batch2.js first",
    intendedTitles: [
      "Carrier Mother x Unaffected Father — Color Blindness",
      "Affected Father x Carrier Mother — Hemophilia",
    ],
    duplicateLookupFields: ["game_type", "title"],
  },
  {
    seedFile: "seedPhysicsForceSimulatorGrade9.js",
    expectedGrade: 9,
    actualGameType: "PHYSICS_FORCE_SIMULATOR",
    mode: "creates-chain", // seed itself will find-or-create Subject/Chapter/Concept
    subjectQuery: { grade: 9, name: /science/i },
    subjectCreateName: "Science",
    chapterTitle: "How Forces Affect Motion",
    conceptTitle: "Newton's Second Law: Force, Mass and Acceleration",
    intendedTitles: ["Predict: Trolley Push", "Predict: Loaded Cart", "Predict: Heavy Crate"],
    duplicateLookupFields: ["game_type", "title"],
  },
  {
    seedFile: "seedPhysicsOhmsLawGrade10.js",
    expectedGrade: 10,
    actualGameType: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE",
    mode: "creates-chain",
    subjectQuery: { grade: 10, name: /biology|science/i },
    subjectCreateName: "Science",
    chapterTitle: "Series and Parallel Circuits",
    conceptTitle: "Ohm's Law and Circuit Calculations",
    intendedTitles: ["Speed Round: Ohm's Law Basics", "Speed Round: Total Resistance"],
    duplicateLookupFields: ["game_type", "title"],
  },
  {
    seedFile: "seedPhysicsWorkEnergyPowerSpeedChallenge.js",
    expectedGrade: 11,
    actualGameType: "PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE",
    mode: "creates-chain",
    subjectQuery: { grade: 11, name: /physics/i },
    subjectCreateName: "Physics",
    chapterTitle: "Work, Energy and Power",
    conceptTitle: "Calculating Work, Energy and Power",
    intendedTitles: [
      "Speed Round: Kinetic Energy and Work",
      "Speed Round: Power Calculations",
    ],
    duplicateLookupFields: ["game_type", "title"],
  },
  {
    seedFile: "seedPhysicsCapacitanceSpeedChallenge.js",
    expectedGrade: 11,
    actualGameType: "PHYSICS_CAPACITANCE_SPEED_CHALLENGE",
    mode: "creates-chain",
    subjectQuery: { grade: 11, name: /physics/i },
    subjectCreateName: "Physics",
    chapterTitle: "Electrostatics",
    conceptTitle: "Calculating Capacitance",
    intendedTitles: [
      "Speed Round: Capacitance Basics",
      "Speed Round: Series and Parallel Capacitance",
    ],
    duplicateLookupFields: ["game_type", "title"],
  },
];

// =================================================================
// STEP 3 — connect read-only, never fall back / create / repair
// =================================================================
async function connectReadOnly() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    return { connected: true };
  } catch (error) {
    return { connected: false, reason: error.message };
  }
}

// =================================================================
// STEP 4/5 — for a given game_type, resolve EVERY GameContent doc's
// real grade via concept -> chapter -> subject (never assume
// game_type implies grade). Read-only aggregation only.
// =================================================================
async function getGameTypeGradeBreakdown(gameType) {
  const pipeline = [
    { $match: { game_type: gameType } },
    {
      $lookup: {
        from: Concept.collection.name,
        localField: "concept_id",
        foreignField: "_id",
        as: "concept",
      },
    },
    { $unwind: { path: "$concept", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Chapter.collection.name,
        localField: "concept.chapter_id",
        foreignField: "_id",
        as: "chapter",
      },
    },
    { $unwind: { path: "$chapter", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Subject.collection.name,
        localField: "chapter.subject_id",
        foreignField: "_id",
        as: "subject",
      },
    },
    { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        title: 1,
        concept_id: 1,
        grade: "$subject.grade",
        subjectName: "$subject.name",
        chapterTitle: "$chapter.title",
        conceptTitle: "$concept.title",
      },
    },
  ];
  return GameContent.aggregate(pipeline);
}

async function resolveConceptChain(conceptDoc) {
  if (!conceptDoc) return null;
  const chapter = await Chapter.findOne({ _id: conceptDoc.chapter_id });
  if (!chapter) return { concept: conceptDoc, chapter: null, subject: null };
  const subject = await Subject.findOne({ _id: chapter.subject_id });
  return { concept: conceptDoc, chapter, subject };
}

// =================================================================
// Per-target analysis (read-only)
// =================================================================
async function analyzeTarget(target, dbConnected) {
  const result = {
    seedFile: target.seedFile,
    expectedGrade: target.expectedGrade,
    actualGameType: target.actualGameType,
    mode: target.mode,
    intended: target.intendedTitles.length,
    present: 0,
    missing: target.intendedTitles.length,
    presentTitles: [],
    missingTitles: [...target.intendedTitles],
    prerequisiteMissing: false,
    prerequisiteNote: "",
    resolvedGrade: null,
    resolvedSubjectName: null,
    duplicateRisk: false,
    duplicateNote: "",
    allGradesTotalForGameType: null,
    targetGradeTotalForGameType: null,
    status: "ERROR / COULD NOT VERIFY",
    reason: "",
  };

  if (!dbConnected) {
    result.status = "ERROR / COULD NOT VERIFY";
    result.reason = "Live database unreachable — static structure verified only.";
    // Do NOT report present/missing as real counts when we couldn't
    // query the DB — that would be exactly the misleading-output
    // pattern this audit is required to avoid. Mark as unknown.
    result.present = null;
    result.missing = null;
    result.presentTitles = [];
    result.missingTitles = [];
    return result;
  }

  // --- resolve prerequisite / chain state -----------------------
  let expectedConceptId = null;

  if (target.mode === "prerequisite-concept") {
    const concept = await Concept.findOne({ title: target.prerequisiteConceptTitle });
    if (!concept) {
      result.prerequisiteMissing = true;
      result.prerequisiteNote = `Concept "${target.prerequisiteConceptTitle}" not found — ${target.prerequisiteHint}.`;
      result.status = "BLOCKED";
      result.reason = result.prerequisiteNote;
      return result;
    }
    const chain = await resolveConceptChain(concept);
    expectedConceptId = concept._id;
    result.resolvedGrade = chain && chain.subject ? chain.subject.grade : null;
    result.resolvedSubjectName = chain && chain.subject ? chain.subject.name : null;
    if (result.resolvedGrade !== null && result.resolvedGrade !== target.expectedGrade) {
      result.reason += `CONTRADICTION: prerequisite concept "${target.prerequisiteConceptTitle}" actually resolves to Grade ${result.resolvedGrade} (${result.resolvedSubjectName}), not the expected Grade ${target.expectedGrade}. `;
    }
  } else {
    // creates-chain mode: subject/chapter/concept may or may not exist yet.
    const subject = await Subject.findOne(target.subjectQuery);
    if (subject) {
      result.resolvedGrade = subject.grade;
      result.resolvedSubjectName = subject.name;
      const chapter = await Chapter.findOne({
        subject_id: subject._id,
        title: target.chapterTitle,
      });
      if (chapter) {
        const concept = await Concept.findOne({
          chapter_id: chapter._id,
          title: target.conceptTitle,
        });
        if (concept) {
          expectedConceptId = concept._id;
        }
      }
    }
  }

  // --- check which intended GameContent titles already exist ----
  const existingDocs = await GameContent.find({
    game_type: target.actualGameType,
    title: { $in: target.intendedTitles },
  });

  result.present = existingDocs.length;
  result.presentTitles = existingDocs.map((d) => d.title);
  result.missingTitles = target.intendedTitles.filter(
    (t) => !result.presentTitles.includes(t),
  );
  result.missing = result.missingTitles.length;

  // Duplicate-risk check: an existing doc with a matching
  // game_type+title but attached to a DIFFERENT concept than the
  // one this seed targets is a real conflict, not a clean re-run.
  if (expectedConceptId) {
    const mismatched = existingDocs.filter(
      (d) => String(d.concept_id) !== String(expectedConceptId),
    );
    if (mismatched.length > 0) {
      result.duplicateRisk = true;
      result.duplicateNote = `${mismatched.length} existing GameContent doc(s) share game_type+title with this seed's intended output but point to a DIFFERENT concept_id than expected.`;
    }
  }

  // --- all-grades vs target-grade breakdown for this game_type ---
  const breakdown = await getGameTypeGradeBreakdown(target.actualGameType);
  result.allGradesTotalForGameType = breakdown.length;
  result.targetGradeTotalForGameType = breakdown.filter(
    (d) => d.grade === target.expectedGrade,
  ).length;

  // --- classify ---------------------------------------------------
  if (result.duplicateRisk) {
    result.status = "POTENTIAL DUPLICATE RISK";
    result.reason = result.duplicateNote;
  } else if (result.present === result.intended && result.intended > 0) {
    result.status = "ALREADY COMPLETE";
    result.reason = "All intended target-grade GameContent records already present.";
  } else if (result.present === 0) {
    if (target.mode === "prerequisite-concept" || expectedConceptId || target.subjectQuery) {
      result.status = "SAFE TO RUN";
      result.reason =
        target.mode === "prerequisite-concept"
          ? "Prerequisite concept exists; no intended records present yet; seed is idempotent (findOne-before-create on game_type+title)."
          : "Seed will find-or-create its own Subject/Chapter/Concept chain (idempotent); no intended records present yet.";
    } else {
      result.status = "ERROR / COULD NOT VERIFY";
      result.reason = "Could not confirm prerequisite chain state.";
    }
  } else {
    result.status = "PARTIALLY PRESENT";
    result.reason = `${result.present}/${result.intended} intended records already present; remainder missing. Seed is idempotent per-title, so running it will only create the missing ones — but flagged for review per audit policy.`;
  }

  return result;
}

// =================================================================
// MAIN
// =================================================================
async function main() {
  console.log("====================================================");
  console.log("LEARNOVA — STRICT 9-SEED PRODUCTION PREFLIGHT AUDIT");
  console.log("====================================================\n");

  const { connected, reason } = await connectReadOnly();

  if (!connected) {
    console.log("LIVE DATABASE STATUS: BLOCKED");
    console.log(`REASON: ${reason}\n`);
  } else {
    console.log("LIVE DATABASE STATUS: CONNECTED (read-only queries only)\n");
  }

  const results = [];
  for (const target of TARGETS) {
    // eslint-disable-next-line no-await-in-loop
    const r = await analyzeTarget(target, connected);
    results.push(r);
  }

  // ---------------- STEP 5 — grade-scoped counts -----------------
  console.log("====================================================");
  console.log("STEP 5 — TARGET CONTENT BY ACTUAL GRADE");
  console.log("====================================================");
  for (const r of results) {
    console.log(`\n${r.actualGameType}`);
    if (connected) {
      console.log(`  All grades: ${r.allGradesTotalForGameType}`);
      console.log(`  Grade ${r.expectedGrade}: ${r.targetGradeTotalForGameType}`);
      console.log(
        `  Target concepts covered: ${r.present}/${r.intended} intended GameContent titles`,
      );
      console.log(`  Target concepts missing: ${r.missing}`);
    } else {
      console.log("  (live database blocked — counts unavailable)");
    }
  }

  // ---------------- STEP 8 — safe commands ------------------------
  console.log("\n====================================================");
  console.log("SAFE COMMANDS TO RUN");
  console.log("====================================================");
  const safe = results.filter((r) => r.status === "SAFE TO RUN");
  if (safe.length === 0) {
    console.log("(none)");
  } else {
    for (const r of safe) {
      console.log(`node ${r.seedFile}`);
    }
  }

  console.log("\n====================================================");
  console.log("DO NOT RUN");
  console.log("====================================================");
  const notSafe = results.filter((r) => r.status !== "SAFE TO RUN");
  if (notSafe.length === 0) {
    console.log("(none)");
  } else {
    for (const r of notSafe) {
      console.log(`${r.seedFile}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Reason: ${r.reason || "(see status)"}`);
    }
  }

  // ---------------- STEP 9 — target summary table ------------------
  console.log("\n====================================================");
  console.log("STEP 9 — TARGET SUMMARY");
  console.log("====================================================");
  console.log("| # | Seed | Grade | Game Type | Intended | Present | Missing | Status |");
  console.log("|---|------|-------|-----------|----------|---------|---------|--------|");
  results.forEach((r, i) => {
    const present = r.present === null ? "N/A" : r.present;
    const missing = r.missing === null ? "N/A" : r.missing;
    console.log(
      `| ${i + 1} | ${r.seedFile} | ${r.expectedGrade} | ${r.actualGameType} | ${r.intended} | ${present} | ${missing} | ${r.status} |`,
    );
  });

  console.log("\nBIOLOGY GRADE 11/12 REQUIRED SLOTS");
  console.log("-----------------------------------");
  results.slice(0, 5).forEach((r) => {
    const line =
      r.present === null
        ? `${r.actualGameType} Grade ${r.expectedGrade}: N/A (live database blocked)`
        : `${r.actualGameType} Grade ${r.expectedGrade}: ${r.missing} missing (${r.present}/${r.intended} present)`;
    console.log(line);
  });

  console.log("\nPHYSICS REQUIRED SLOTS");
  console.log("----------------------");
  results.slice(5, 9).forEach((r) => {
    const line =
      r.present === null
        ? `${r.actualGameType} Grade ${r.expectedGrade}: N/A (live database blocked)`
        : `${r.actualGameType} Grade ${r.expectedGrade}: ${r.missing} missing (${r.present}/${r.intended} present)`;
    console.log(line);
  });

  // ---------------- Contradictions / notes -------------------------
  const contradictions = results.filter((r) => r.reason && r.reason.startsWith("CONTRADICTION"));
  if (contradictions.length > 0) {
    console.log("\n====================================================");
    console.log("CONTRADICTIONS VS. EXPECTED VALUES");
    console.log("====================================================");
    contradictions.forEach((r) => console.log(`${r.seedFile}: ${r.reason}`));
  }

  // ---------------- STEP 10 — final verdict -------------------------
  console.log("\n====================================================");
  console.log("STEP 10 — FINAL VERDICT");
  console.log("====================================================");

  let verdict;
  if (!connected) {
    verdict = "PREFLIGHT RESULT: LIVE DATABASE BLOCKED";
  } else if (results.some((r) => r.status === "ERROR / COULD NOT VERIFY")) {
    verdict = "PREFLIGHT RESULT: MANUAL REVIEW REQUIRED";
  } else if (results.every((r) => r.status === "ALREADY COMPLETE")) {
    verdict = "PREFLIGHT RESULT: ALL 9 TARGETS VERIFIED";
  } else if (safe.length > 0) {
    verdict = "PREFLIGHT RESULT: SAFE SEEDS AVAILABLE";
  } else {
    verdict = "PREFLIGHT RESULT: MANUAL REVIEW REQUIRED";
  }

  console.log(verdict);
  console.log(`\nDatabase writes performed: ${dbWritesPerformed}`);

  if (dbWritesPerformed !== 0) {
    // This should be structurally unreachable — this script never
    // calls any write method — but fail loudly instead of silently
    // if it is ever true.
    throw new Error("INTEGRITY VIOLATION: dbWritesPerformed !== 0");
  }
}

main()
  .catch((err) => {
    console.error("\nChecker encountered an error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (_) {
      // ignore disconnect errors
    }
  });

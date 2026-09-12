#!/usr/bin/env node
"use strict";

/**
 * Structural Coverage Audit — READ-ONLY.
 *
 * Statically inspects the project's seed files and registry/route/
 * scoring source files as TEXT (never require()'d, never executed,
 * no MongoDB connection) and reports:
 *   - the Grade 4-12 x Subject x GameMechanic matrix
 *   - backend/frontend game-type registry parity
 *   - frontend route -> component -> file-on-disk parity
 *   - backend scoring-dispatch coverage
 *   - seed-content structural issues (duplicate ids/titles, broken
 *     correct_piece_ids / correct_order references)
 *
 * This script NEVER modifies seed files, source files, or a database,
 * and NEVER executes a seed script. It only reads.
 *
 * Usage:
 *   node scripts/audit/structuralAudit.js            # human report
 *   node scripts/audit/structuralAudit.js --json      # JSON only (stdout)
 *   node scripts/audit/structuralAudit.js --json-file out.json
 */

const fs = require("fs");
const path = require("path");

const { scanAllSeeds } = require("./lib/seedScanner");
const {
  scanBackendRegistry,
  scanFrontendRegistry,
  scanAppRoutes,
  checkComponentFilesExist,
  scanScoringDispatch,
} = require("./lib/registryScanner");

const BACKEND_ROOT = path.resolve(__dirname, "..", "..");
const FRONTEND_SRC_ROOT = path.resolve(BACKEND_ROOT, "..", "frontend", "src");

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

function runAudit() {
  const errors = [];
  const warnings = [];
  const unknowns = [];
  const infos = [];

  function pushIssues(list) {
    list.forEach((it) => {
      if (it.level === "error") errors.push(it);
      else if (it.level === "warn") warnings.push(it);
      else if (it.level === "unknown") unknowns.push(it);
      else infos.push(it);
    });
  }

  // ---- Seed content scan (CHECK 1, 5, 6, 7) ----
  const seedScan = scanAllSeeds(BACKEND_ROOT);
  seedScan.perFile.forEach((pf) => pushIssues(pf.issues));
  pushIssues(seedScan.crossFileIssues);

  // ---- Registry scans (CHECK 2) ----
  const backendRegistry = scanBackendRegistry(BACKEND_ROOT);
  const frontendRegistry = scanFrontendRegistry(FRONTEND_SRC_ROOT);
  const backendTypes = new Set(backendRegistry.entries.map((e) => e.gameType));
  const frontendTypes = new Set(frontendRegistry.entries.map((e) => e.gameType));

  backendRegistry.duplicates.forEach((d) =>
    errors.push({
      level: "error",
      file: backendRegistry.filePath,
      message: `Duplicate backend registry entry for game_type "${d.gameType}" (${d.count}x).`,
    }),
  );
  frontendRegistry.duplicates.forEach((d) =>
    errors.push({
      level: "error",
      file: frontendRegistry.filePath,
      message: `Duplicate frontend registry entry for game_type "${d.gameType}" (${d.count}x).`,
    }),
  );

  const missingFrontend = [...backendTypes].filter((t) => !frontendTypes.has(t));
  const missingBackend = [...frontendTypes].filter((t) => !backendTypes.has(t));
  missingFrontend.forEach((t) =>
    errors.push({
      level: "error",
      file: frontendRegistry.filePath,
      message: `game_type "${t}" is registered in backend gameTypeRegistry.js but missing from frontend gameRegistry.js.`,
    }),
  );
  missingBackend.forEach((t) =>
    errors.push({
      level: "error",
      file: backendRegistry.filePath,
      message: `game_type "${t}" is registered in frontend gameRegistry.js but missing from backend gameTypeRegistry.js.`,
    }),
  );

  // ---- Routes / components (CHECK 3) ----
  const appRoutes = scanAppRoutes(FRONTEND_SRC_ROOT);
  const routeByPath = {};
  appRoutes.routes.forEach((r) => {
    routeByPath[r.route] = r;
  });

  const routeResults = frontendRegistry.entries.map((entry) => {
    const routeInfo = routeByPath[entry.route];
    if (!routeInfo) {
      errors.push({
        level: "error",
        file: appRoutes.filePath,
        message: `Frontend registry route "${entry.route}" (${entry.gameType}) has no matching <Route> in App.jsx.`,
      });
      return { gameType: entry.gameType, route: entry.route, status: "ROUTE_MISSING" };
    }
    if (!routeInfo.component) {
      warnings.push({
        level: "warn",
        file: appRoutes.filePath,
        message: `Route "${entry.route}" (${entry.gameType}) exists but no rendered component could be statically detected.`,
      });
      return {
        gameType: entry.gameType,
        route: entry.route,
        status: "COMPONENT_NOT_DETECTED",
      };
    }
    const fileCheck = checkComponentFilesExist(
      FRONTEND_SRC_ROOT,
      appRoutes.lazyImports,
      [routeInfo.component],
    )[routeInfo.component];
    if (fileCheck.status === "NO_LAZY_IMPORT_FOUND") {
      errors.push({
        level: "error",
        file: appRoutes.filePath,
        message: `Route "${entry.route}" renders <${routeInfo.component} /> but no matching lazy() import was found.`,
      });
      return {
        gameType: entry.gameType,
        route: entry.route,
        component: routeInfo.component,
        status: "LAZY_IMPORT_MISSING",
      };
    }
    if (!fileCheck.exists) {
      errors.push({
        level: "error",
        file: fileCheck.resolvedPath,
        message: `Route "${entry.route}" (${entry.gameType}) imports "${fileCheck.importPath}" but that file does not exist on disk.`,
      });
      return {
        gameType: entry.gameType,
        route: entry.route,
        component: routeInfo.component,
        status: "COMPONENT_FILE_MISSING",
      };
    }
    return {
      gameType: entry.gameType,
      route: entry.route,
      component: routeInfo.component,
      status: "OK",
    };
  });

  // Orphan App.jsx game routes (a route exists but no registry entry
  // points to it).
  const registryRoutes = new Set(frontendRegistry.entries.map((e) => e.route));
  appRoutes.routes
    .filter((r) => !registryRoutes.has(r.route))
    .forEach((r) =>
      warnings.push({
        level: "warn",
        file: appRoutes.filePath,
        message: `App.jsx has a /games route "${r.route}" with no corresponding frontend gameRegistry.js entry (orphan route).`,
      }),
    );

  // ---- Scoring dispatch (CHECK 4) ----
  const scoring = scanScoringDispatch(BACKEND_ROOT);
  const scoredTypes = new Set([
    ...scoring.checkAttemptTypes,
    ...scoring.multiQuestionTypes,
  ]);
  const scoringResults = [...backendTypes].map((gameType) => {
    const inCheckAttempt = scoring.checkAttemptTypes.includes(gameType);
    const inMultiQuestion = scoring.multiQuestionTypes.includes(gameType);
    const covered = inCheckAttempt || inMultiQuestion;
    if (!covered) {
      errors.push({
        level: "error",
        file: scoring.filePath,
        message: `game_type "${gameType}" is registered but has no detectable scoring path (not in checkAttempt, not in MULTI_QUESTION_GAME_TYPES).`,
      });
    }
    return {
      gameType,
      via: inMultiQuestion
        ? "MULTI_QUESTION_GAME_TYPES + checkMultiQuestionAttempt"
        : inCheckAttempt
          ? "checkAttempt branch"
          : "NONE_DETECTED",
      covered,
    };
  });

  // ---- Registered-but-unseeded / seeded-but-unregistered (CHECK 5) ----
  const seededTypes = new Set(
    seedScan.resolvedGameContents.map((gc) => gc.gameType).filter(Boolean),
  );
  const registeredButUnseeded = [...backendTypes].filter(
    (t) => !seededTypes.has(t),
  );
  const seededButUnregistered = [...seededTypes].filter(
    (t) => !backendTypes.has(t),
  );
  registeredButUnseeded.forEach((t) =>
    warnings.push({
      level: "warn",
      file: "(cross-cutting)",
      message: `game_type "${t}" is registered (backend+frontend) but no GameContent seed file was found to create it. If this is a quiz-only/Question-model mechanic by design, this is expected; otherwise it's an unseeded registry entry.`,
    }),
  );
  seededButUnregistered.forEach((t) =>
    errors.push({
      level: "error",
      file: "(cross-cutting)",
      message: `game_type "${t}" appears in a GameContent seed but is NOT in backend gameTypeRegistry.js (orphan seed content).`,
    }),
  );

  // ---- Grade x Subject x Mechanic matrix (CHECK 6) ----
  // Build grade -> subject -> { chapters, concepts, gameContentCount,
  // gameTypesUsed } purely from what curriculum seeds actually
  // declared (CHECK 1: never trust filenames alone for the matrix —
  // this uses resolved Subject/Chapter grade+name, not filenames).
  const matrix = {}; // grade -> subjectName -> stats
  GRADES.forEach((g) => (matrix[g] = {}));

  function ensureCell(grade, subject) {
    if (!matrix[grade]) matrix[grade] = {};
    if (!matrix[grade][subject]) {
      matrix[grade][subject] = {
        chapters: new Set(),
        concepts: new Set(),
        gameTypes: new Set(),
        gameContentCount: 0,
      };
    }
    return matrix[grade][subject];
  }

  seedScan.perFile.forEach((pf) => {
    pf.chapterDefs.forEach((chd) => {
      if (chd.grade != null && chd.subjectName && chd.title) {
        const cell = ensureCell(chd.grade, chd.subjectName);
        cell.chapters.add(chd.title);
      }
    });
    pf.conceptDefs.forEach((cd) => {
      if (cd.grade != null && cd.subjectName) {
        const cell = ensureCell(cd.grade, cd.subjectName);
        if (cd.title) cell.concepts.add(cd.title);
      }
    });
  });

  seedScan.resolvedGameContents.forEach((gc) => {
    const grade = gc.resolvedGrade != null ? gc.resolvedGrade : gc.filenameGrade;
    const subject = gc.resolvedSubjectName;
    if (grade == null || !subject) return; // can't place in matrix confidently
    const cell = ensureCell(grade, subject);
    cell.gameContentCount += 1;
    if (gc.gameType) cell.gameTypes.add(gc.gameType);
  });

  const matrixReport = {};
  GRADES.forEach((g) => {
    matrixReport[g] = Object.entries(matrix[g] || {}).map(
      ([subject, stats]) => {
        let status;
        if (stats.gameTypes.size > 0) status = "✅ GAME MECHANICS PRESENT";
        else if (stats.concepts.size > 0 || stats.chapters.size > 0)
          status = "⚠️ CONTENT PRESENT BUT NO GAME MECHANIC";
        else status = "❌ SUBJECT/CONTENT MISSING";
        return {
          subject,
          chapters: stats.chapters.size,
          concepts: stats.concepts.size,
          gameContent: stats.gameContentCount,
          gameTypes: [...stats.gameTypes],
          status,
        };
      },
    );
  });

  // ---- Special Biology 11/12 verification (CHECK 7) ----
  function bioCheck(grade, expectedTypes) {
    const cell = (matrixReport[grade] || []).find((s) => s.subject === "Biology");
    const present = cell ? cell.gameTypes : [];
    return expectedTypes.map((t) => ({
      gameType: t,
      grade,
      present: present.includes(t),
    }));
  }
  const biology11Check = bioCheck(11, ["BIO_DIAGNOSIS", "BIO_VIRTUAL_LAB"]);
  const biology12Check = bioCheck(12, [
    "BIO_DIAGNOSIS",
    "BIO_SPECIMEN_ANALYSIS",
    "BIO_VIRTUAL_LAB",
    "BIO_ECOSYSTEM_BALANCE",
    "BIO_GENETICS_SIMULATOR",
  ]);
  [...biology11Check, ...biology12Check].forEach((c) => {
    if (!c.present) {
      errors.push({
        level: "error",
        file: "(cross-cutting)",
        message: `Expected Biology Grade ${c.grade} mechanic "${c.gameType}" was NOT found present in the resolved matrix.`,
      });
    }
  });

  // ---- Totals (CHECK 8) ----
  let totalCells = 0;
  let cellsWithMechanics = 0;
  let cellsWithoutMechanics = 0;
  let totalChapters = 0;
  let totalConcepts = 0;
  GRADES.forEach((g) => {
    matrixReport[g].forEach((row) => {
      totalCells += 1;
      totalChapters += row.chapters;
      totalConcepts += row.concepts;
      if (row.gameTypes.length > 0) cellsWithMechanics += 1;
      else cellsWithoutMechanics += 1;
    });
  });

  const summary = {
    totalGrades: GRADES.length,
    totalApplicableSubjectCells: totalCells,
    cellsWithGameMechanics: cellsWithMechanics,
    cellsWithoutGameMechanics: cellsWithoutMechanics,
    totalChapters,
    totalConcepts,
    totalUniqueGameTypesRegistered: backendRegistry.entries.length,
    totalUniqueGameTypesSeeded: seededTypes.size,
    frontendRouteCoveragePct: pct(
      routeResults.filter((r) => r.status === "OK").length,
      routeResults.length,
    ),
    backendScoringCoveragePct: pct(
      scoringResults.filter((r) => r.covered).length,
      scoringResults.length,
    ),
    registryParityErrors: missingFrontend.length + missingBackend.length,
    structuralErrorCount: errors.length,
    structuralWarningCount: warnings.length,
    structuralUnknownCount: unknowns.length,
    liveDbVerification: "BLOCKED — no MongoDB connection available in this environment; structural checks only.",
    auditPasses: errors.length === 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    backendRegistry,
    frontendRegistry,
    appRoutes: { filePath: appRoutes.filePath, routeCount: appRoutes.routes.length },
    routeResults,
    scoring: {
      filePath: scoring.filePath,
      checkAttemptFound: scoring.checkAttemptFound,
      multiQuestionTypeCount: scoring.multiQuestionTypes.length,
    },
    scoringResults,
    registeredButUnseeded,
    seededButUnregistered,
    matrixReport,
    biology11Check,
    biology12Check,
    errors,
    warnings,
    unknowns,
    infos,
    summary,
  };
}

function pct(num, denom) {
  if (denom === 0) return null;
  return Math.round((num / denom) * 1000) / 10;
}

function printHumanReport(result) {
  const { summary } = result;
  console.log("=".repeat(70));
  console.log("STRUCTURAL COVERAGE AUDIT (read-only, static, no DB)");
  console.log("Generated:", result.generatedAt);
  console.log("=".repeat(70));

  GRADES.forEach((g) => {
    const rows = result.matrixReport[g];
    if (!rows || rows.length === 0) return;
    console.log(`\nGRADE ${g}`);
    console.log(
      "Subject".padEnd(20) +
        "Chapters".padEnd(10) +
        "GameContent".padEnd(13) +
        "Mechanics".padEnd(10) +
        "Status",
    );
    rows
      .sort((a, b) => a.subject.localeCompare(b.subject))
      .forEach((r) => {
        console.log(
          r.subject.padEnd(20) +
            String(r.chapters).padEnd(10) +
            String(r.gameContent).padEnd(13) +
            String(r.gameTypes.length).padEnd(10) +
            r.status,
        );
      });
  });

  console.log("\n" + "-".repeat(70));
  console.log("BIOLOGY GRADE 11/12 SPECIAL VERIFICATION");
  console.log("-".repeat(70));
  [...result.biology11Check, ...result.biology12Check].forEach((c) => {
    console.log(
      `  Grade ${c.grade} ${c.gameType}: ${c.present ? "PRESENT ✅" : "MISSING ❌"}`,
    );
  });

  console.log("\n" + "-".repeat(70));
  console.log("REGISTRY / ROUTE / SCORING PARITY");
  console.log("-".repeat(70));
  console.log(`Backend registry entries:  ${result.backendRegistry.entries.length}`);
  console.log(`Frontend registry entries: ${result.frontendRegistry.entries.length}`);
  console.log(
    `Route parity OK:           ${result.routeResults.filter((r) => r.status === "OK").length}/${result.routeResults.length}`,
  );
  console.log(
    `Scoring coverage:          ${result.scoringResults.filter((r) => r.covered).length}/${result.scoringResults.length}`,
  );
  if (result.registeredButUnseeded.length) {
    console.log(
      `Registered but unseeded (${result.registeredButUnseeded.length}): ${result.registeredButUnseeded.join(", ")}`,
    );
  }
  if (result.seededButUnregistered.length) {
    console.log(
      `Seeded but unregistered (${result.seededButUnregistered.length}): ${result.seededButUnregistered.join(", ")}`,
    );
  }

  console.log("\n" + "-".repeat(70));
  console.log(`ERRORS (${result.errors.length})`);
  console.log("-".repeat(70));
  result.errors.forEach((e) => console.log(`  [ERROR] ${e.file}: ${e.message}`));

  console.log(`\nWARNINGS (${result.warnings.length})`);
  result.warnings.forEach((w) => console.log(`  [WARN]  ${w.file}: ${w.message}`));

  console.log(`\nUNKNOWN / NEEDS LIVE VERIFICATION (${result.unknowns.length})`);
  result.unknowns.forEach((u) => console.log(`  [UNKNOWN] ${u.file}: ${u.message}`));

  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  Object.entries(summary).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log("\nAUDIT RESULT:", summary.auditPasses ? "PASS ✅" : "FAIL ❌ (errors found)");
}

function main() {
  const args = process.argv.slice(2);
  const result = runAudit();

  const jsonFileIdx = args.indexOf("--json-file");
  if (jsonFileIdx !== -1 && args[jsonFileIdx + 1]) {
    fs.writeFileSync(args[jsonFileIdx + 1], JSON.stringify(result, null, 2));
    console.log(`Wrote JSON report to ${args[jsonFileIdx + 1]}`);
    return;
  }

  if (args.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printHumanReport(result);
}

if (require.main === module) {
  main();
}

module.exports = { runAudit, GRADES };

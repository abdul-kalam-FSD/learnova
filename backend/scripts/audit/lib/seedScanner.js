"use strict";

const fs = require("fs");
const path = require("path");
const {
  findModelCalls,
  extractField,
  extractNumberField,
  extractRefVar,
  extractTopLevelField,
  splitTopLevelObjects,
  collectIdFields,
  extractStringArrayField,
} = require("./parseUtils");

// Every top-level backend/seed*.js file is a curriculum/content seed.
// Deliberately excludes anything under scripts/ (this audit tool
// itself) or node_modules.
function findSeedFiles(backendRoot) {
  return fs
    .readdirSync(backendRoot)
    .filter((f) => /^seed.*\.js$/i.test(f))
    .map((f) => path.join(backendRoot, f))
    .sort();
}

function filenameGrade(filePath) {
  const base = path.basename(filePath);
  const m = base.match(/Grade0*(\d{1,2})/i);
  return m ? parseInt(m[1], 10) : null;
}

// ---- Pass 1: parse one file's local Subject/Chapter/Concept/GameContent
// declarations and references, without cross-file resolution yet. ----
function parseFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const file = path.basename(filePath);

  const localVars = {}; // varName -> { kind, ...fields }
  const chapterDefs = []; // { title, grade, subjectName, strand, sourceFile } from Chapter.create
  const conceptDefs = []; // { title, chapterVar, explanationPresent, sourceFile }
  const conceptRefs = []; // Concept.findOne({ title }) references made by this file
  const gameContents = []; // { game_type, conceptVar, conceptTitleRef, challenges, sourceFile }
  const questionInserts = []; // { conceptVar, count }
  const issues = []; // structural issues found purely within this file

  // Subject.create / Subject.findOne — the common project pattern is
  // `let subject = await Subject.findOne({ grade: N, name: /x/i });
  //  if (!subject) { subject = await Subject.create({ name: "X", grade: N }); }`
  // Both calls assign to the SAME variable. The findOne filter often
  // uses a regex literal for `name` (not a quoted string), which
  // extractField can't read — so calls must be merged in document
  // order, keeping an already-known field rather than letting a call
  // that can't detect it overwrite good data with null.
  const subjectCalls = [
    ...findModelCalls(content, "Subject", "create").map((c) => ({ ...c, kind: "create" })),
    ...findModelCalls(content, "Subject", "findOne").map((c) => ({ ...c, kind: "findOne" })),
  ].sort((a, b) => a.matchIndex - b.matchIndex);
  for (const call of subjectCalls) {
    const name = extractField(call.argsText, "name");
    const grade = extractNumberField(call.argsText, "grade");
    if (!call.assignedVar) continue;
    const existing = localVars[call.assignedVar];
    localVars[call.assignedVar] = {
      kind: "subject",
      name: name != null ? name : existing && existing.name != null ? existing.name : null,
      grade: grade != null ? grade : existing && existing.grade != null ? existing.grade : null,
      sourceFile: file,
      via: call.kind,
    };
  }

  // Chapter.create
  for (const call of findModelCalls(content, "Chapter", "create")) {
    const title = extractTopLevelField(call.argsText, "title");
    const unitName = extractTopLevelField(call.argsText, "unit_name");
    const strand = extractTopLevelField(call.argsText, "strand");
    const subjectVar = extractRefVar(call.argsText, "subject_id");
    const orderIndex = extractTopLevelField(call.argsText, "order_index", {
      isString: false,
    });
    const subjectInfo = subjectVar ? localVars[subjectVar] : null;
    if (call.assignedVar) {
      localVars[call.assignedVar] = {
        kind: "chapter",
        title,
        unitName,
        strand,
        orderIndex,
        grade: subjectInfo ? subjectInfo.grade : null,
        subjectName: subjectInfo ? subjectInfo.name : null,
        subjectVarResolved: !!subjectInfo,
        sourceFile: file,
      };
    }
    if (title && subjectVar && !subjectInfo) {
      issues.push({
        level: "warn",
        file,
        message: `Chapter "${title}" references subject var "${subjectVar}" that could not be resolved in this file (may be resolved across an earlier require/import the static scanner can't follow).`,
      });
    }
    if (title) {
      chapterDefs.push({
        title,
        grade: subjectInfo ? subjectInfo.grade : null,
        subjectName: subjectInfo ? subjectInfo.name : null,
        strand,
        sourceFile: file,
      });
    }
  }

  // Chapter.findOne — some content-extension seeds (e.g. a new
  // sentence-builder mechanic added to an existing chapter) look up a
  // chapter created in a DIFFERENT file by title, rather than
  // creating it themselves. Record the var -> title link so a later
  // Concept.create in *this* file that references chapter_id can
  // still be traced back to a title (grade gets backfilled cross-file
  // in scanAllSeeds via the global chapter pool).
  for (const call of findModelCalls(content, "Chapter", "findOne")) {
    const title = extractField(call.argsText, "title");
    if (call.assignedVar && title) {
      // Don't clobber a var that was already resolved via
      // Chapter.create in this same file (the common
      // findOne-then-create-if-missing guard pattern).
      if (!localVars[call.assignedVar]) {
        localVars[call.assignedVar] = {
          kind: "chapter",
          title,
          unitName: null,
          strand: null,
          grade: null,
          subjectName: null,
          sourceFile: file,
          unresolvedViaFindOne: true,
        };
      }
    }
  }

  // Concept.create
  for (const call of findModelCalls(content, "Concept", "create")) {
    const title = extractTopLevelField(call.argsText, "title");
    const chapterVar = extractRefVar(call.argsText, "chapter_id");
    const hasExplanation = /\bexplanation_text\s*:/.test(call.argsText);
    const chapterInfo = chapterVar ? localVars[chapterVar] : null;
    if (call.assignedVar) {
      localVars[call.assignedVar] = {
        kind: "concept",
        title,
        chapterTitle: chapterInfo ? chapterInfo.title : null,
        grade: chapterInfo ? chapterInfo.grade : null,
        subjectName: chapterInfo ? chapterInfo.subjectName : null,
        strand: chapterInfo ? chapterInfo.strand : null,
        sourceFile: file,
      };
    }
    if (title) {
      conceptDefs.push({
        title,
        grade: chapterInfo ? chapterInfo.grade : null,
        subjectName: chapterInfo ? chapterInfo.subjectName : null,
        chapterTitle: chapterInfo ? chapterInfo.title : null,
        strand: chapterInfo ? chapterInfo.strand : null,
        hasExplanation,
        sourceFile: file,
      });
    }
  }

  // Concept.findOne — how game-content seeds link back to a concept
  // defined in a curriculum batch file.
  for (const call of findModelCalls(content, "Concept", "findOne")) {
    const title = extractField(call.argsText, "title");
    if (call.assignedVar) {
      localVars[call.assignedVar] = {
        kind: "conceptRef",
        title,
        sourceFile: file,
      };
    }
    if (title) {
      conceptRefs.push({ title, sourceFile: file });
    }
  }

  // Question.insertMany / Question.create — used only to confirm a
  // concept has quiz content (for the "Question-model-only" check),
  // not parsed field-by-field.
  for (const kind of ["insertMany", "create"]) {
    for (const call of findModelCalls(content, "Question", kind)) {
      const conceptVar = extractRefVar(call.argsText, "concept_id");
      // insertMany's argument is an array; count elements at depth 0.
      const roughCount =
        kind === "insertMany"
          ? splitTopLevelObjects(call.argsText).length
          : 1;
      questionInserts.push({
        conceptVar,
        count: roughCount,
        sourceFile: file,
      });
    }
  }

  // GameContent.create — the primary game-mechanic content signal.
  // Two shapes seen in the codebase: (a) a single inline .create({...})
  // call, or (b) a `for (const level of levels) { ... GameContent.create({...}) }`
  // loop where game_type/concept are the same for every iteration. Both
  // are handled the same way: parse the .create({...}) call itself,
  // and separately look for a preceding `const levels = [...]` /
  // `const challenges = [...]` array to analyze per-challenge structure.
  for (const call of findModelCalls(content, "GameContent", "create")) {
    const gameType = extractTopLevelField(call.argsText, "game_type");
    const conceptVar = extractRefVar(call.argsText, "concept_id");
    const conceptRefInfo = conceptVar ? localVars[conceptVar] : null;
    gameContents.push({
      gameType,
      conceptVar,
      conceptTitleRef: conceptRefInfo ? conceptRefInfo.title : null,
      sourceFile: file,
      lineNumber: call.lineNumber,
    });
  }
  for (const call of findModelCalls(content, "GameContent", "insertMany")) {
    const objs = splitTopLevelObjects(call.argsText);
    for (const obj of objs) {
      const gameType = extractTopLevelField(obj, "game_type");
      const conceptVar = extractRefVar(obj, "concept_id");
      const conceptRefInfo = conceptVar ? localVars[conceptVar] : null;
      gameContents.push({
        gameType,
        conceptVar,
        conceptTitleRef: conceptRefInfo ? conceptRefInfo.title : null,
        sourceFile: file,
        lineNumber: call.lineNumber,
      });
    }
  }

  // Challenge/level array structural check — find every top-level
  // `const NAME = [ ... ]` whose elements look like challenge objects
  // (contain a `payload:` field), and validate ID references inside
  // each element's payload.
  const arrayDeclRe =
    /\b(?:const|let)\s+(\w+)\s*=\s*\[/g;
  let am;
  while ((am = arrayDeclRe.exec(content)) !== null) {
    const openIdx = content.indexOf("[", am.index);
    const { findMatchingBracketEnd } = require("./parseUtils");
    const endIdx = findMatchingBracketEnd(content, openIdx);
    if (endIdx === -1) continue;
    const inner = content.slice(openIdx + 1, endIdx - 1);
    const elements = splitTopLevelObjects(inner);
    if (elements.length === 0) continue;
    // Only treat this as a "challenge array" if elements look like
    // game levels (have a payload field) — skip option/evidence arrays
    // and other incidental array literals.
    const looksLikeChallengeArray = elements.some((el) =>
      /\bpayload\s*:/.test(el),
    );
    if (!looksLikeChallengeArray) continue;

    const titles = [];
    elements.forEach((el, idx) => {
      const title = extractTopLevelField(el, "title");
      if (title) titles.push(title);

      // Pull the payload sub-object for id/reference checks.
      const payloadMatch = el.match(/\bpayload\s*:\s*\{/);
      if (!payloadMatch) return;
      const payloadOpenIdx =
        el.indexOf("{", payloadMatch.index + payloadMatch[0].length - 1);
      const payloadEndIdx = findMatchingBracketEnd(el, payloadOpenIdx);
      if (payloadEndIdx === -1) return;
      const payloadText = el.slice(payloadOpenIdx, payloadEndIdx);

      // Multi-question payloads (MULTI_QUESTION_GAME_TYPES — Speed/
      // Boss Challenge mechanics) hold a `questions: [...]` array
      // where EACH question has its own locally-scoped `options`
      // ids (typically "a"/"b"/"c"/"d" per question, by design —
      // see backend/src/controllers/gameControllers.js
      // MULTI_QUESTION_GAME_TYPES). Checking id uniqueness across
      // the WHOLE payload would flag every reused "a"/"b" option
      // letter as a false-positive duplicate. Detect this shape and
      // scope the duplicate-id check to each question individually
      // instead of the whole payload.
      const questionsFieldMatch = payloadText.match(/\bquestions\s*:\s*\[/);
      if (questionsFieldMatch) {
        const qOpenIdx = payloadText.indexOf(
          "[",
          questionsFieldMatch.index + questionsFieldMatch[0].length - 1,
        );
        const qEndIdx = findMatchingBracketEnd(payloadText, qOpenIdx);
        if (qEndIdx !== -1) {
          const qInner = payloadText.slice(qOpenIdx + 1, qEndIdx - 1);
          const questionObjs = splitTopLevelObjects(qInner);
          questionObjs.forEach((qObj, qIdx) => {
            const qIds = collectIdFields(qObj);
            const qCounts = {};
            qIds.forEach((id) => (qCounts[id] = (qCounts[id] || 0) + 1));
            const qDupes = Object.keys(qCounts).filter((id) => qCounts[id] > 1);
            if (qDupes.length > 0) {
              issues.push({
                level: "error",
                file,
                message: `Array "${am[1]}" element #${idx + 1} ("${title || "untitled"}"), question #${qIdx + 1}: duplicate id value(s) within that question's own options: ${qDupes.join(", ")}.`,
              });
            }
          });
        }
        // correct_piece_ids / correct_order / hotspot reference
        // checks below don't apply to this schema (multi-question
        // payloads use per-question correct_option_id/correct_answer
        // instead) — skip them for this element.
        return;
      }

      const definedIds = collectIdFields(payloadText);
      const idCounts = {};
      definedIds.forEach((id) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      const dupes = Object.keys(idCounts).filter((id) => idCounts[id] > 1);
      if (dupes.length > 0) {
        issues.push({
          level: "error",
          file,
          message: `Array "${am[1]}" element #${idx + 1} ("${title || "untitled"}") has duplicate id value(s): ${dupes.join(", ")}.`,
        });
      }

      const idSet = new Set(definedIds);
      const referenceFields = [
        "correct_piece_ids",
        "correct_order",
        "hotspot_ids",
        "correct_hotspot_ids",
      ];
      for (const field of referenceFields) {
        const refs = extractStringArrayField(payloadText, field);
        if (refs === null) continue;
        if (refs.length === 0) {
          issues.push({
            level: "warn",
            file,
            message: `Array "${am[1]}" element #${idx + 1} ("${title || "untitled"}") has an empty "${field}" array.`,
          });
          continue;
        }
        const broken = refs.filter((r) => !idSet.has(r));
        if (broken.length > 0 && idSet.size > 0) {
          issues.push({
            level: "error",
            file,
            message: `Array "${am[1]}" element #${idx + 1} ("${title || "untitled"}") field "${field}" references id(s) not defined in this challenge's own id set: ${broken.join(", ")}.`,
          });
        } else if (idSet.size === 0) {
          // No `id:` fields at all in this payload (e.g. a mapping-
          // style or free-form payload) — per the false-positive
          // protection rule, don't flag this as broken; it's a
          // legitimate alternative schema. Record as unknown instead.
          issues.push({
            level: "unknown",
            file,
            message: `Array "${am[1]}" element #${idx + 1} ("${title || "untitled"}") has a "${field}" reference field but no local "id:" fields to validate against — likely a non-ID-array schema (e.g. mapping-style payload). NEEDS LIVE VERIFICATION / MANUAL REVIEW.`,
          });
        }
      }

      // "mapping"-style fields (e.g. Genetics Simulator) are
      // intentionally NOT validated as ID references — they map
      // concept values (genotypes, phenotypes) rather than
      // challenge piece IDs. Just record their presence.
      const mappingFieldMatch = payloadText.match(/\b(\w*mapping)\s*:/i);
      if (mappingFieldMatch) {
        issues.push({
          level: "info",
          file,
          message: `Array "${am[1]}" element #${idx + 1} ("${title || "untitled"}") uses a "${mappingFieldMatch[1]}" field — treated as a legitimate special schema (values map concepts, not challenge piece IDs), not validated as ID references.`,
        });
      }
    });

    // Duplicate challenge titles within the same array (proxy for
    // duplicate challenge IDs, since these seeds don't give levels an
    // explicit top-level "id" — findOne-before-create upserts key off
    // {game_type, title}, so a duplicate title IS a duplicate challenge).
    const titleCounts = {};
    titles.forEach((t) => {
      titleCounts[t] = (titleCounts[t] || 0) + 1;
    });
    Object.keys(titleCounts)
      .filter((t) => titleCounts[t] > 1)
      .forEach((t) => {
        issues.push({
          level: "error",
          file,
          message: `Array "${am[1]}" has duplicate challenge title "${t}" (${titleCounts[t]}x) — findOne-before-create upsert keys off {game_type, title}, so duplicates here mean one challenge silently overwrites/skips another.`,
        });
      });
  }

  return {
    file,
    filenameGrade: filenameGrade(filePath),
    localVars,
    chapterDefs,
    conceptDefs,
    conceptRefs,
    gameContents,
    questionInserts,
    issues,
  };
}

// ---- Pass 2: cross-file resolution. Concept definitions from ALL
// files are pooled by title so that a GameContent seed in file B can
// resolve the concept it Concept.findOne()'d, even though that
// concept was Concept.create()'d in file A. ----
function scanAllSeeds(backendRoot) {
  const files = findSeedFiles(backendRoot);
  const perFile = files.map(parseFile);

  // Pool chapter definitions by title first, so concepts whose
  // Chapter was only Chapter.findOne()'d in their own file (created
  // in a different file — the "add a mechanic to an existing chapter"
  // pattern) can still be traced back to a grade/subject.
  const chapterPool = {}; // title -> [{grade, subjectName, strand, sourceFile}, ...]
  perFile.forEach((pf) => {
    pf.chapterDefs.forEach((chd) => {
      if (!chd.title) return;
      if (!chapterPool[chd.title]) chapterPool[chd.title] = [];
      chapterPool[chd.title].push(chd);
    });
  });

  function resolveChapterTitle(title) {
    const defs = (chapterPool[title] || []).filter((d) => d.grade != null);
    if (defs.length === 0) return null;
    const grades = new Set(defs.map((d) => d.grade));
    if (grades.size !== 1) return null; // ambiguous, don't guess
    return defs[0];
  }

  // Backfill any concept whose local resolution came up empty
  // (chapter was findOne-only in its own file) using the global
  // chapter pool.
  perFile.forEach((pf) => {
    pf.conceptDefs.forEach((cd) => {
      if (cd.grade == null && cd.chapterTitle) {
        const resolved = resolveChapterTitle(cd.chapterTitle);
        if (resolved) {
          cd.grade = resolved.grade;
          cd.subjectName = resolved.subjectName;
          cd.strand = resolved.strand;
        }
      }
    });
  });

  // Pool concept definitions by title. If the same title is defined
  // in more than one file with different grades, that's a real
  // ambiguity worth surfacing, not silently picking one.
  const conceptPool = {}; // title -> [{grade, subjectName, chapterTitle, sourceFile}, ...]
  perFile.forEach((pf) => {
    pf.conceptDefs.forEach((cd) => {
      if (!cd.title) return;
      if (!conceptPool[cd.title]) conceptPool[cd.title] = [];
      conceptPool[cd.title].push(cd);
    });
  });

  const crossFileIssues = [];
  Object.entries(conceptPool).forEach(([title, defs]) => {
    const grades = new Set(defs.map((d) => d.grade).filter((g) => g != null));
    if (grades.size > 1) {
      crossFileIssues.push({
        level: "warn",
        file: defs.map((d) => d.sourceFile).join(", "),
        message: `Concept title "${title}" is defined with different grades across files: ${[...grades].join(", ")}.`,
      });
    }
  });

  // Resolve every GameContent entry's grade via its concept reference.
  const resolvedGameContents = [];
  perFile.forEach((pf) => {
    pf.gameContents.forEach((gc) => {
      let resolvedTitle = gc.conceptTitleRef;
      let grade = null;
      let subjectName = null;
      let chapterTitle = null;
      let resolution = "UNKNOWN";

      if (!gc.gameType) {
        crossFileIssues.push({
          level: "error",
          file: gc.sourceFile,
          message: `GameContent.create() near line ${gc.lineNumber} has no statically-detectable "game_type" field.`,
        });
      }

      if (resolvedTitle && conceptPool[resolvedTitle]) {
        const defs = conceptPool[resolvedTitle];
        const withGrade = defs.filter((d) => d.grade != null);
        if (withGrade.length > 0) {
          // Prefer a unique grade; if multiple distinct grades exist
          // for this title, mark ambiguous rather than guessing.
          const grades = new Set(withGrade.map((d) => d.grade));
          if (grades.size === 1) {
            grade = [...grades][0];
            subjectName = withGrade[0].subjectName;
            chapterTitle = withGrade[0].chapterTitle;
            resolution = "RESOLVED_VIA_CONCEPT_TITLE";
          } else {
            resolution = "AMBIGUOUS_MULTIPLE_GRADES";
          }
        }
      } else if (gc.conceptVar) {
        resolution = "CONCEPT_VAR_UNRESOLVED";
      } else {
        resolution = "NO_CONCEPT_LINK_DETECTED";
      }

      resolvedGameContents.push({
        gameType: gc.gameType,
        sourceFile: gc.sourceFile,
        filenameGrade: pf.filenameGrade,
        conceptTitleRef: resolvedTitle,
        resolvedGrade: grade,
        resolvedSubjectName: subjectName,
        resolvedChapterTitle: chapterTitle,
        resolution,
      });

      if (
        resolution === "RESOLVED_VIA_CONCEPT_TITLE" &&
        pf.filenameGrade != null &&
        grade != null &&
        pf.filenameGrade !== grade
      ) {
        crossFileIssues.push({
          level: "warn",
          file: gc.sourceFile,
          message: `Filename implies Grade ${pf.filenameGrade} but the linked concept "${resolvedTitle}" resolves to Grade ${grade}.`,
        });
      }
    });
  });

  return {
    perFile,
    conceptPool,
    resolvedGameContents,
    crossFileIssues,
  };
}

module.exports = {
  findSeedFiles,
  filenameGrade,
  parseFile,
  scanAllSeeds,
};

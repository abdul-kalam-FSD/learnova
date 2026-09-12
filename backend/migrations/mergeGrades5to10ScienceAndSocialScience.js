/**
 * Gap 1 + Gap 3 fix, Grades 5-10 (the rest of the fix started by
 * migrations/mergeGrade4ScienceAndSocialScience.js).
 *
 * For each grade below, merges any separate top-level Biology /
 * Chemistry / Physics Subjects into a single "Science" Subject, and
 * any separate top-level History / Geography Subjects into a single
 * "Social Science" Subject — creating the target if it doesn't exist
 * yet, or reusing it if it does (e.g. Grade 9's existing standalone
 * "Social Science" subject is a target with zero sources here,
 * since Gap 3 doesn't apply at Grade 9 per the audit matrix). Every
 * moved chapter is tagged strand: "<source subject name>".
 *
 * Grade 5 has no top-level Bio/Chem/Physics or History/Geography
 * Subjects to merge (per the audit's curriculum matrix, Grade 5's
 * problem is a coverage gap — Gap 4 — not a hierarchy gap), so it's
 * intentionally left out of MERGE_GROUPS below rather than run as a
 * no-op.
 *
 * No Chapter/Concept/GameContent _ids ever change, so
 * UserConceptMastery and QuizzSession records (which key off
 * concept_id, never subject_id) stay valid throughout.
 *
 * DRY RUN BY DEFAULT. Prints exactly what it would move/create/delete
 * and writes nothing. Pass --execute to actually apply the plan.
 *
 *   node migrations/mergeGrades5to10ScienceAndSocialScience.js            # dry run
 *   node migrations/mergeGrades5to10ScienceAndSocialScience.js --execute  # applies it
 *   node migrations/mergeGrades5to10ScienceAndSocialScience.js --grade 8  # one grade only
 *
 * Safe to re-run: it's built on buildMergePlan, which is idempotent
 * (see tests/unit/subjectMergePlan.test.js) — a second run against
 * an already-migrated grade plans zero moves and zero deletions.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Subject = require("../src/models/Subject");
const Chapter = require("../src/models/Chapter");
const { buildMergePlan, NEW_TARGET_SUBJECT_ID } = require("../src/utils/subjectMergePlan");

// Per the audit's curriculum matrix (Section C) and a direct read of
// each grade's seed files: only list the merge groups that actually
// have something to merge at that grade. A group with an empty
// sourceNames list would just be a documented no-op, so it's omitted
// instead.
const GRADE_MERGE_GROUPS = {
  6: [{ targetName: "Science", sourceNames: ["Physics"] }],
  7: [{ targetName: "Social Science", sourceNames: ["History"] }],
  8: [
    { targetName: "Science", sourceNames: ["Chemistry"] },
    { targetName: "Social Science", sourceNames: ["History", "Geography"] },
  ],
  9: [{ targetName: "Science", sourceNames: ["Biology", "Chemistry", "Physics"] }],
  10: [{ targetName: "Science", sourceNames: ["Biology", "Chemistry", "Physics"] }],
};

async function loadGroupInput(grade, group) {
  const targetDoc = await Subject.findOne({ grade, name: group.targetName });

  const sources = [];
  for (const name of group.sourceNames) {
    const subjectDoc = await Subject.findOne({ grade, name });
    let chapters = [];
    if (subjectDoc) {
      const chapterDocs = await Chapter.find({ subject_id: subjectDoc._id });
      chapters = chapterDocs.map((c) => ({
        id: String(c._id),
        title: c.title,
        subject_id: String(c.subject_id),
        strand: c.strand || null,
      }));
    }
    sources.push({
      name,
      subjectId: subjectDoc ? String(subjectDoc._id) : null,
      chapters,
    });
  }

  return {
    grade,
    target: { name: group.targetName, existingId: targetDoc ? String(targetDoc._id) : null },
    sources,
  };
}

function printPlan(groupLabel, plan) {
  console.log(`\n=== ${groupLabel} ===`);
  console.log(
    plan.createTargetSubject
      ? `Create new Subject "${plan.targetName}" (grade ${plan.grade})`
      : `Reuse existing Subject "${plan.targetName}" (${plan.targetSubjectId})`,
  );
  if (plan.chapterMoves.length === 0) {
    console.log("No chapters to move.");
  } else {
    for (const move of plan.chapterMoves) {
      console.log(
        `  MOVE chapter "${move.chapterTitle}" (${move.chapterId}) from ${move.fromSubjectName} -> ${plan.targetName}, strand="${move.strand}"`,
      );
    }
  }
  if (plan.subjectDeletions.length === 0) {
    console.log("No subjects to delete.");
  } else {
    for (const del of plan.subjectDeletions) {
      console.log(`  DELETE now-empty Subject "${del.subjectName}" (${del.subjectId})`);
    }
  }
  if (plan.skipped.length > 0) {
    console.log(`  (${plan.skipped.length} chapter(s) already migrated in a prior run, skipped.)`);
  }
  if (plan.notes.length > 0) {
    console.log("  NOTES:");
    for (const note of plan.notes) console.log(`   - ${note}`);
  }
}

async function applyPlan(plan) {
  let targetId = plan.targetSubjectId;

  if (plan.createTargetSubject) {
    const created = await Subject.create({ name: plan.targetName, grade: plan.grade });
    targetId = String(created._id);
    console.log(`Created Subject "${plan.targetName}" (grade ${plan.grade}): ${targetId}`);
  }

  for (const move of plan.chapterMoves) {
    const resolvedTarget = move.toSubjectId === NEW_TARGET_SUBJECT_ID ? targetId : move.toSubjectId;
    await Chapter.updateOne(
      { _id: move.chapterId },
      { $set: { subject_id: resolvedTarget, strand: move.strand } },
    );
    console.log(`  Moved chapter ${move.chapterId} -> ${resolvedTarget} (strand: ${move.strand})`);
  }

  for (const del of plan.subjectDeletions) {
    await Subject.deleteOne({ _id: del.subjectId });
    console.log(`  Deleted Subject ${del.subjectId} (${del.subjectName})`);
  }

  return targetId;
}

async function run() {
  const execute = process.argv.includes("--execute");
  const gradeFlagIndex = process.argv.indexOf("--grade");
  const onlyGrade = gradeFlagIndex !== -1 ? Number(process.argv[gradeFlagIndex + 1]) : null;

  const grades = onlyGrade ? [onlyGrade] : Object.keys(GRADE_MERGE_GROUPS).map(Number);

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");
  console.log(execute ? "MODE: EXECUTE (writing changes)" : "MODE: DRY RUN (no changes will be written)");

  for (const grade of grades) {
    const groups = GRADE_MERGE_GROUPS[grade];
    if (!groups) {
      console.log(`\nGrade ${grade}: no merge groups configured, skipping.`);
      continue;
    }
    for (const group of groups) {
      const input = await loadGroupInput(grade, group);
      const plan = buildMergePlan(input);
      printPlan(`Grade ${grade}: ${group.sourceNames.join(" + ")} -> ${group.targetName}`, plan);

      if (execute) {
        await applyPlan(plan);
      }
    }
  }

  if (!execute) {
    console.log("\nDry run complete. Re-run with --execute to apply the plan above.");
  } else {
    console.log("\nMigration applied.");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

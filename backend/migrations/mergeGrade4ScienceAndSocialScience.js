/**
 * Gap 1 + Gap 3 fix, Grade 4 proof-of-concept.
 *
 * Merges Grade 4's separate top-level Biology / Chemistry / Physics
 * Subjects into a single new "Science" Subject (chapters tagged
 * strand: "Biology" / "Chemistry" / "Physics"), and merges the
 * separate History / Geography Subjects into the *existing* Grade 4
 * "Social Science" Subject (chapters tagged strand accordingly),
 * leaving its pre-existing civics chapter untouched.
 *
 * No Chapter/Concept/GameContent _ids ever change, so
 * UserConceptMastery and QuizzSession records (which key off
 * concept_id, never subject_id) stay valid throughout.
 *
 * DRY RUN BY DEFAULT. Prints exactly what it would move/create/delete
 * and writes nothing. Pass --execute to actually apply the plan.
 *
 *   node migrations/mergeGrade4ScienceAndSocialScience.js            # dry run
 *   node migrations/mergeGrade4ScienceAndSocialScience.js --execute  # applies it
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

const GRADE = 4;

const MERGE_GROUPS = [
  { targetName: "Science", sourceNames: ["Biology", "Chemistry", "Physics"] },
  { targetName: "Social Science", sourceNames: ["History", "Geography"] },
];

async function loadGroupInput(group) {
  const targetDoc = await Subject.findOne({ grade: GRADE, name: group.targetName });

  const sources = [];
  for (const name of group.sourceNames) {
    const subjectDoc = await Subject.findOne({ grade: GRADE, name });
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
    grade: GRADE,
    target: { name: group.targetName, existingId: targetDoc ? String(targetDoc._id) : null },
    sources,
  };
}

function printPlan(groupLabel, plan) {
  console.log(`\n=== ${groupLabel} ===`);
  console.log(
    plan.createTargetSubject
      ? `Create new Subject "${plan.targetName}" (grade ${GRADE})`
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
    const created = await Subject.create({ name: plan.targetName, grade: GRADE });
    targetId = String(created._id);
    console.log(`Created Subject "${plan.targetName}": ${targetId}`);
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

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");
  console.log(execute ? "MODE: EXECUTE (writing changes)" : "MODE: DRY RUN (no changes will be written)");

  for (const group of MERGE_GROUPS) {
    const input = await loadGroupInput(group);
    const plan = buildMergePlan(input);
    printPlan(`Grade ${GRADE}: ${group.sourceNames.join(" + ")} -> ${group.targetName}`, plan);

    if (execute) {
      await applyPlan(plan);
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

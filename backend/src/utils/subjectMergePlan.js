/**
 * Pure planning logic for the Gap 1 + Gap 3 curriculum fix: merging
 * discipline-specific top-level Subjects (e.g. Biology, Chemistry,
 * Physics, History, Geography) into a single integrated Subject
 * (e.g. "Science", "Social Science") per grade, tagging each moved
 * Chapter with a `strand` so mastery/analytics can still tell the
 * disciplines apart without them being separate Subject documents.
 *
 * This file does NOT touch mongoose or the network. It takes a plain
 * description of what's currently in the DB for one grade's merge
 * group and returns a plan of what should change. The DB-facing
 * migration script (migrations/mergeGrade4ScienceAndSocialScience.js
 * and its per-grade siblings) is a thin wrapper: fetch data -> call
 * buildMergePlan -> apply the plan. Keeping the decision logic here,
 * pure and unit-tested, is what makes it possible to verify
 * correctness (including the idempotency and "reuse the existing
 * target subject" cases) without a live MongoDB.
 *
 * Input shape:
 * {
 *   grade: 4,
 *   target: {
 *     name: "Science",
 *     // Existing Subject._id as a string if one was found in the DB
 *     // for {grade, name}, otherwise null. When null, the plan
 *     // includes createTargetSubject: true and every chapter move
 *     // points at the placeholder id NEW_TARGET_SUBJECT_ID (the
 *     // DB-facing script substitutes the real id once it creates
 *     // the document).
 *     existingId: "abc123" | null,
 *   },
 *   sources: [
 *     {
 *       name: "Biology",              // becomes chapter.strand
 *       subjectId: "def456" | null,   // null = no such Subject exists (nothing to do)
 *       // Chapters currently found via Chapter.find({ subject_id: subjectId }).
 *       // Pass an empty array if subjectId is null.
 *       chapters: [
 *         { id: "chap1", subject_id: "def456", strand: null },
 *       ],
 *     },
 *   ],
 * }
 *
 * Output shape:
 * {
 *   createTargetSubject: boolean,
 *   targetName: string,
 *   targetSubjectId: string | null,   // null only when createTargetSubject is true
 *   chapterMoves: [
 *     { chapterId, chapterTitle, fromSubjectId, fromSubjectName, strand, toSubjectId }
 *   ],
 *   subjectDeletions: [ { subjectId, subjectName } ],
 *   skipped: [ { chapterId, reason } ],   // already migrated in a prior run
 *   notes: [ string ],                    // human-readable anomalies worth a look
 * }
 */

const NEW_TARGET_SUBJECT_ID = "NEW_TARGET_SUBJECT_ID";

function buildMergePlan({ grade, target, sources }) {
  if (!target || !target.name) {
    throw new Error("buildMergePlan: target.name is required");
  }
  if (!Array.isArray(sources)) {
    throw new Error("buildMergePlan: sources must be an array");
  }

  const createTargetSubject = !target.existingId;
  const toSubjectId = target.existingId || NEW_TARGET_SUBJECT_ID;

  const plan = {
    grade,
    createTargetSubject,
    targetName: target.name,
    targetSubjectId: target.existingId || null,
    chapterMoves: [],
    subjectDeletions: [],
    skipped: [],
    notes: [],
  };

  for (const source of sources) {
    if (!source || !source.name) {
      plan.notes.push("Skipped a source with no name.");
      continue;
    }

    // Never plan to delete the target itself. This is what makes
    // "reuse the existing Social Science subject" safe even if a
    // caller accidentally lists it as its own source: its chapters
    // are simply left alone, not merged into itself, not deleted.
    if (source.subjectId && target.existingId && source.subjectId === target.existingId) {
      plan.notes.push(
        `Source "${source.name}" is the same document as the target subject — left untouched, not treated as a merge source.`,
      );
      continue;
    }

    if (!source.subjectId) {
      // No such Subject exists in the DB for this grade/name — either
      // it was already fully migrated and deleted in a prior run, or
      // it never existed. Either way there's nothing to move or delete.
      continue;
    }

    const chapters = Array.isArray(source.chapters) ? source.chapters : [];
    let remaining = 0;

    for (const chapter of chapters) {
      const alreadyMoved =
        chapter.subject_id === toSubjectId && chapter.strand === source.name;

      if (alreadyMoved) {
        plan.skipped.push({
          chapterId: chapter.id,
          reason: `Already moved to "${target.name}" with strand "${source.name}".`,
        });
        continue;
      }

      if (chapter.subject_id === source.subjectId) {
        plan.chapterMoves.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          fromSubjectId: source.subjectId,
          fromSubjectName: source.name,
          strand: source.name,
          toSubjectId,
        });
        continue;
      }

      // Chapter claims to belong to this source (it was returned by a
      // query scoped to source.subjectId) but its subject_id field
      // says otherwise — data inconsistency, not something to silently
      // move. Leave it alone and flag it so a human looks.
      remaining += 1;
      plan.notes.push(
        `Chapter "${chapter.title}" (${chapter.id}) was fetched under "${source.name}" but its subject_id doesn't match — left untouched, investigate before deleting the subject.`,
      );
    }

    // Only plan to delete the source Subject document once every
    // chapter that was under it is accounted for (moved this run, or
    // already moved in a prior run) and nothing anomalous held it back.
    if (remaining === 0) {
      plan.subjectDeletions.push({
        subjectId: source.subjectId,
        subjectName: source.name,
      });
    }
  }

  return plan;
}

module.exports = { buildMergePlan, NEW_TARGET_SUBJECT_ID };

// Curriculum context for shared games whose game_type is reused across
// subjects/grades (Phase 10B). Reads the additive metadata that
// GET /games/content already returns (Phase 10A):
//
//   level.concept_id = {
//     _id, title, explanation_text,
//     chapter: { title, strand, subject: { name, grade } } | null
//   }
//
// Every helper is null-safe and never throws: concept_id, chapter,
// subject and strand may each be missing (older responses, orphan
// concepts, chapters without a strand). No grade/subject branching
// lives here — it only extracts and formats what the data says.

const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const obj = (v) => (v && typeof v === "object" ? v : null);

export function getLevelContext(level) {
  const concept = obj(obj(level)?.concept_id);
  const chapter = obj(concept?.chapter);
  const subject = obj(chapter?.subject);
  return {
    conceptTitle: text(concept?.title),
    chapterTitle: text(chapter?.title),
    strand: text(chapter?.strand),
    subjectName: text(subject?.name),
    subjectGrade: Number.isFinite(subject?.grade) ? subject.grade : null,
  };
}

// "SUBJECT · CHAPTER" (upper-case) from whatever parts exist, else fallback.
export function contextLabel(ctx, fallback) {
  const parts = [text(ctx?.subjectName), text(ctx?.chapterTitle)].filter(Boolean);
  return parts.length ? parts.join(" · ").toUpperCase() : fallback;
}

// [subject, concept] skill chips from real data, else the fallback list.
export function contextSkills(ctx, fallback) {
  const parts = [text(ctx?.subjectName), text(ctx?.conceptTitle)].filter(Boolean);
  return parts.length ? parts : fallback;
}

// For level-select: a subject/chapter is only reported when EVERY level
// shares it (levels in one list can mix subjects/chapters). Otherwise null,
// so contextLabel() falls back to the neutral label.
export function commonContext(levels) {
  const list = Array.isArray(levels) ? levels.map(getLevelContext) : [];
  const shared = (key) => {
    if (!list.length) return null;
    const first = list[0][key];
    return first && list.every((c) => c[key] === first) ? first : null;
  };
  return {
    subjectName: shared("subjectName"),
    chapterTitle: shared("chapterTitle"),
    conceptTitle: null,
    strand: null,
    subjectGrade: null,
  };
}

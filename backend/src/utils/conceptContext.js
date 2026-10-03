// Curriculum context for GET /api/games/content.
//
// Shapes the (nested-populated) GameContent.concept_id into a plain,
// additive object:
//
//   {
//     _id, title, explanation_text,            // unchanged, as before
//     chapter: {                               // NEW (nullable)
//       title,
//       strand,                                // nullable: only some chapters set it
//       subject: { name, grade },              // nullable
//     },
//   }
//
// Built from the existing relationship
//   GameContent.concept_id -> Concept.chapter_id -> Chapter.subject_id -> Subject
// (no new stored fields). Internal ids of Chapter/Subject and any other
// Subject/Chapter fields are deliberately NOT exposed.
//
// Defensive on purpose: a concept that was not populated (null, a bare
// ObjectId) is returned exactly as received, so existing behaviour never
// breaks; a missing chapter/subject yields null rather than an error.
const isPopulated = (doc, key) =>
  doc !== null && typeof doc === "object" && doc[key] !== undefined;

const toConceptContext = (concept) => {
  if (!isPopulated(concept, "title")) return concept;

  const chapter = isPopulated(concept.chapter_id, "title") ? concept.chapter_id : null;
  const subject = chapter && isPopulated(chapter.subject_id, "name") ? chapter.subject_id : null;

  return {
    _id: concept._id,
    title: concept.title,
    explanation_text: concept.explanation_text,
    chapter: chapter
      ? {
          title: chapter.title,
          strand: chapter.strand ?? null,
          subject: subject ? { name: subject.name, grade: subject.grade } : null,
        }
      : null,
  };
};

module.exports = { toConceptContext };

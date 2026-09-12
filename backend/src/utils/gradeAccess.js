const Concept = require("../models/Concept");
const Chapter = require("../models/Chapter");
const Subject = require("../models/Subject");
const User = require("../models/User");

// Same Subject(grade) -> Chapter -> Concept walk that getCases/
// getRecommendedCase already used for *listing* content by grade —
// pulled out here so startCase/startGame can use it to *authorize*
// a specific content ID, instead of trusting whatever ID the client
// sends (cross-grade IDOR fix).
const getGradeConceptIds = async (grade) => {
  const subjectIds = await Subject.find({ grade }).distinct("_id");
  const chapterIds = await Chapter.find({ subject_id: { $in: subjectIds } }).distinct("_id");
  const conceptIds = await Concept.find({ chapter_id: { $in: chapterIds } }).distinct("_id");
  return conceptIds.map((id) => id.toString());
};

// Verifies the requesting user's own grade covers the given
// concept_id(s) (single id or array — a Case has several, a
// GameContent has one). Returns { allowed, userGrade }.
const verifyGradeAccess = async (userId, conceptIds) => {
  const user = await User.findById(userId).select("grade");
  if (!user) return { allowed: false, userGrade: null };

  const ids = (Array.isArray(conceptIds) ? conceptIds : [conceptIds]).map((id) =>
    id.toString(),
  );
  const gradeConceptIds = await getGradeConceptIds(user.grade);
  const allowed = ids.some((id) => gradeConceptIds.includes(id));
  return { allowed, userGrade: user.grade };
};

module.exports = { verifyGradeAccess, getGradeConceptIds };

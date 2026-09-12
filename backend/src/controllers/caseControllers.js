const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const Case = require("../models/Case");
const Question = require("../models/Question");
const QuizSession = require("../models/QuizzSession");
const User = require("../models/User");
const Subject = require("../models/Subject");
const Chapter = require("../models/Chapter");
const Concept = require("../models/Concept");
const UserConceptMastery = require("../models/UserConceptMastery");
const { verifyGradeAccess } = require("../utils/gradeAccess");

const CASE_SELECT_FIELDS =
  "title intro_text mission_text clue_count dragdrop_task matching_task";
const COMPLETE_CASE_FILTER = {
  "dragdrop_task.items.0": { $exists: true },
  "matching_task.pairs.0": { $exists: true },
};
const findBestCaseForConcepts = async (conceptIds) => {
  if (!conceptIds || conceptIds.length === 0) return null;

  const [best] = await Case.aggregate([
    { $match: { concept_ids: { $in: conceptIds }, ...COMPLETE_CASE_FILTER } },
    {
      $addFields: {
        matchCount: {
          $size: { $setIntersection: ["$concept_ids", conceptIds] },
        },
      },
    },
    { $sort: { matchCount: -1, created_at: -1 } },
    { $limit: 1 },
  ]);

  if (!best) return null;
  return Case.findById(best._id).select(CASE_SELECT_FIELDS);
};

const getRecommendedCase = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("grade");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const subjectIds = await Subject.find({ grade: user.grade }).distinct(
      "_id",
    );
    const chapterIds = await Chapter.find({
      subject_id: { $in: subjectIds },
    }).distinct("_id");
    const gradeConceptIds = await Concept.find({
      chapter_id: { $in: chapterIds },
    }).distinct("_id");

    const masteries = await UserConceptMastery.find({
      user_id: userId,
      concept_id: { $in: gradeConceptIds },
    }).select("concept_id state");

    const weakConceptIds = masteries
      .filter((m) => m.state === "weak")
      .map((m) => m.concept_id);
    const learningConceptIds = masteries
      .filter((m) => m.state === "learning")
      .map((m) => m.concept_id);

    let recommendedCase = await findBestCaseForConcepts(weakConceptIds);
    let reason = "weak-concept";

    if (!recommendedCase) {
      recommendedCase = await findBestCaseForConcepts(learningConceptIds);
      reason = "learning-concept";
    }

    if (!recommendedCase) {
      recommendedCase = await Case.findOne({
        concept_ids: { $in: gradeConceptIds },
        ...COMPLETE_CASE_FILTER,
      })
        .select(CASE_SELECT_FIELDS)
        .sort({ created_at: -1 });
      reason = "fallback-any-case";
    }

    if (!recommendedCase) {
      return res.status(404).json({ message: "No cases available yet" });
    }

    res.status(200).json({ case: recommendedCase, reason });
  } catch (err) {
    sendError(res, err);
  }
};

const getCases = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("grade");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const subjectIds = await Subject.find({ grade: user.grade }).distinct(
      "_id",
    );
    const chapterIds = await Chapter.find({
      subject_id: { $in: subjectIds },
    }).distinct("_id");
    const conceptIds = await Concept.find({
      chapter_id: { $in: chapterIds },
    }).distinct("_id");

    const cases = await Case.find({
      concept_ids: { $in: conceptIds },
      ...COMPLETE_CASE_FILTER,
    })
      .select("title intro_text mission_text clue_count")
      .sort({ created_at: -1 });

    res.status(200).json({ cases });
  } catch (err) {
    sendError(res, err);
  }
};

const startCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ message: "Invalid case id" });
    }

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ message: "Case not found" });
    }

    // SECURITY: getCases/getRecommendedCase already scope by grade for
    // *listing*, but startCase previously trusted any caseId the client
    // sent — a cross-grade IDOR. Verify it here too.
    const { allowed } = await verifyGradeAccess(userId, caseDoc.concept_ids);
    if (!allowed) {
      return res.status(403).json({ message: "This case is not available for your grade" });
    }

    const questions = await Question.find({
      concept_id: { $in: caseDoc.concept_ids },
    }).limit(caseDoc.clue_count);

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ message: "No questions available for this case" });
    }

    const session = await QuizSession.create({
      user_id: userId,
      case_id: caseDoc._id,
      session_type: "case-investigation",
      started_at: new Date(),
      eligible_question_ids: questions.map((q) => q._id),
      questions: [],
    });

    res.status(201).json({
      sessionId: session._id,
      case: {
        id: caseDoc._id,
        title: caseDoc.title,
        intro_text: caseDoc.intro_text,
        mission_text: caseDoc.mission_text,
        dragdrop_task: caseDoc.dragdrop_task,
        matching_task: caseDoc.matching_task,
        theory_prompt: caseDoc.theory_prompt,
        theory_options: caseDoc.theory_options,
        experiment: caseDoc.experiment,
      },
      totalClues: questions.length,
      clues: questions.map((q) => ({
        question: {
          id: q._id,
          concept_id: q.concept_id,
          question_text: q.question_text,
          options: q.options,
        },
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { getCases, startCase, getRecommendedCase };
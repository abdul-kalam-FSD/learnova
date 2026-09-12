const mongoose = require("mongoose");
const QuizSession = require("../models/QuizzSession");
const User = require("../models/User");
const UserConceptMastery = require("../models/UserConceptMastery");
const Subject = require("../models/Subject");
const Chapter = require("../models/Chapter");
const Concept = require("../models/Concept");
const GameContent = require("../models/GameContent");
const { SESSION_TYPE_LABELS } = require("./quizStats");
const { GAME_TYPE_TO_LABEL } = require("./gameTypeRegistry");

// All the dashboard rollups below are shared by the Admin dashboard
// (unscoped — `studentIdFilter: null`) and the Teacher dashboard
// (scoped to that teacher's own students via resolveScopedStudentIds
// in teacherControllers.js). Keeping this in one place means the two
// dashboards can never quietly compute "average accuracy" or "weak
// areas" two different ways.

// completed-session match stage, optionally restricted to a specific
// set of student ids (teacher scoping) — null means "every student".
function completedSessionMatch(studentIds) {
  const match = { completed_at: { $ne: null } };
  if (studentIds) {
    match.user_id = { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }
  return match;
}

// Average accuracy across every completed session that actually has
// answered questions (game sessions with a free-form game_payload and
// no `questions` array are excluded rather than counted as 0%, which
// would understate performance for subjects that are all-game).
async function computeAvgPerformance(studentIds) {
  const rows = await QuizSession.aggregate([
    { $match: completedSessionMatch(studentIds) },
    {
      $project: {
        totalQuestions: { $size: "$questions" },
        correctCount: {
          $size: { $filter: { input: "$questions", as: "q", cond: "$$q.is_correct" } },
        },
      },
    },
    { $match: { totalQuestions: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        totalCorrect: { $sum: "$correctCount" },
        totalAnswered: { $sum: "$totalQuestions" },
        sessionCount: { $sum: 1 },
      },
    },
  ]);

  if (!rows.length || rows[0].totalAnswered === 0) {
    return { accuracy: null, sessionsCounted: 0 };
  }
  return {
    accuracy: Math.round((rows[0].totalCorrect / rows[0].totalAnswered) * 100),
    sessionsCounted: rows[0].sessionCount,
  };
}

// Accuracy broken down by grade (via the session's user) — lets a
// dashboard show "Grade 7: 68%, Grade 8: 74%..." instead of a single
// flat number.
async function computeGradePerformance(studentIds) {
  const rows = await QuizSession.aggregate([
    { $match: completedSessionMatch(studentIds) },
    {
      $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" },
    },
    { $unwind: "$user" },
    {
      $project: {
        grade: "$user.grade",
        totalQuestions: { $size: "$questions" },
        correctCount: {
          $size: { $filter: { input: "$questions", as: "q", cond: "$$q.is_correct" } },
        },
      },
    },
    { $match: { totalQuestions: { $gt: 0 } } },
    {
      $group: {
        _id: "$grade",
        totalCorrect: { $sum: "$correctCount" },
        totalAnswered: { $sum: "$totalQuestions" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({
    grade: r._id,
    accuracy: r.totalAnswered > 0 ? Math.round((r.totalCorrect / r.totalAnswered) * 100) : 0,
  }));
}

// Accuracy broken down by subject. Only covers question-based
// sessions (weak-concept-targeted, chapter-review, case-investigation)
// since those are the only ones whose answers point at a
// concept -> chapter -> subject chain; pure game-session rows (no
// `questions`) aren't included here — see computeGameActivityBySubject
// for that side of the picture instead of guessing a subject for them.
async function computeSubjectPerformance(studentIds) {
  const rows = await QuizSession.aggregate([
    { $match: completedSessionMatch(studentIds) },
    { $unwind: "$questions" },
    {
      $lookup: { from: "concepts", localField: "questions.concept_id", foreignField: "_id", as: "concept" },
    },
    { $unwind: "$concept" },
    {
      $lookup: { from: "chapters", localField: "concept.chapter_id", foreignField: "_id", as: "chapter" },
    },
    { $unwind: "$chapter" },
    {
      $lookup: { from: "subjects", localField: "chapter.subject_id", foreignField: "_id", as: "subject" },
    },
    { $unwind: "$subject" },
    {
      $group: {
        _id: "$subject.name",
        totalAnswered: { $sum: 1 },
        totalCorrect: { $sum: { $cond: ["$questions.is_correct", 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({
    subject: r._id,
    accuracy: Math.round((r.totalCorrect / r.totalAnswered) * 100),
    questionsAnswered: r.totalAnswered,
  }));
}

// Same idea as computeSubjectPerformance, but for game-session rows,
// which don't have a `questions` array to $unwind — their outcome
// lives in game_payload, and their subject is reached via
// content_id -> GameContent -> Concept -> Chapter -> Subject instead
// of a per-question concept_id. This is the function the comment on
// computeSubjectPerformance above used to point to before it existed;
// without it, every game completion was invisible to the "Performance
// by subject" dashboard even though `gamesPlayed` counted it.
async function computeGameSubjectPerformance(studentIds) {
  const match = completedSessionMatch(studentIds);
  match.session_type = "game-session";

  const rows = await QuizSession.aggregate([
    { $match: match },
    {
      $lookup: { from: "gamecontents", localField: "content_id", foreignField: "_id", as: "content" },
    },
    { $unwind: { path: "$content", preserveNullAndEmptyArrays: true } },
    {
      $lookup: { from: "concepts", localField: "content.concept_id", foreignField: "_id", as: "concept" },
    },
    { $unwind: { path: "$concept", preserveNullAndEmptyArrays: true } },
    {
      $lookup: { from: "chapters", localField: "concept.chapter_id", foreignField: "_id", as: "chapter" },
    },
    { $unwind: { path: "$chapter", preserveNullAndEmptyArrays: true } },
    {
      $lookup: { from: "subjects", localField: "chapter.subject_id", foreignField: "_id", as: "subject" },
    },
    { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },
    { $match: { "subject.name": { $ne: null } } },
    {
      $project: {
        subjectName: "$subject.name",
        correctCount: {
          $ifNull: [
            "$game_payload.correct_count",
            { $cond: ["$game_payload.is_correct", 1, 0] },
          ],
        },
        totalCount: { $ifNull: ["$game_payload.total_count", 1] },
      },
    },
    {
      $group: {
        _id: "$subjectName",
        totalCorrect: { $sum: "$correctCount" },
        totalAnswered: { $sum: "$totalCount" },
        sessionCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({
    subject: r._id,
    accuracy: r.totalAnswered > 0 ? Math.round((r.totalCorrect / r.totalAnswered) * 100) : 0,
    gamesCompleted: r.sessionCount,
  }));
}

// Same "classify a concept from its student mastery split" rule
// teacherControllers.getWeakAreas uses, factored out so the admin
// dashboard's "top weak areas" card can't drift from the teacher
// view's definition of "needs attention".
function classifyConceptStatus({ weak, strong, total }) {
  if (total === 0) return "developing";
  const strongPercent = (strong / total) * 100;
  const weakPercent = (weak / total) * 100;
  if (strongPercent >= 70) return "mastered";
  if (weakPercent >= 50) return "needs-attention";
  return "developing";
}

// Top N concepts most students are weak on, optionally scoped to a
// set of student ids. Concepts nobody has attempted yet are left out
// entirely rather than shown as "0% mastered" — there's no data to
// support that claim.
async function computeTopWeakAreas(studentIds, limit = 5) {
  const pipeline = [];
  if (studentIds) {
    pipeline.push({
      $match: { user_id: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) } },
    });
  }
  pipeline.push(
    { $group: { _id: { concept_id: "$concept_id", state: "$state" }, count: { $sum: 1 } } },
    {
      $group: {
        _id: "$_id.concept_id",
        counts: { $push: { state: "$_id.state", count: "$count" } },
        total: { $sum: "$count" },
      },
    },
    { $lookup: { from: "concepts", localField: "_id", foreignField: "_id", as: "concept" } },
    { $unwind: "$concept" },
    { $lookup: { from: "chapters", localField: "concept.chapter_id", foreignField: "_id", as: "chapter" } },
    { $unwind: "$chapter" },
    { $lookup: { from: "subjects", localField: "chapter.subject_id", foreignField: "_id", as: "subject" } },
    { $unwind: "$subject" },
  );

  const rows = await UserConceptMastery.aggregate(pipeline);

  return rows
    .map((row) => {
      const breakdown = { weak: 0, learning: 0, strong: 0 };
      for (const c of row.counts) breakdown[c.state] = c.count;
      return {
        conceptId: row._id,
        conceptTitle: row.concept.title,
        chapterTitle: row.chapter.title,
        subject: row.subject.name,
        grade: row.subject.grade,
        totalStudents: row.total,
        ...breakdown,
        status: classifyConceptStatus({ ...breakdown, total: row.total }),
      };
    })
    .sort((a, b) => b.weak - a.weak)
    .slice(0, limit);
}

// Most recent completed sessions across every type (quiz, case,
// game), for a "Recent Activity" feed. Game sessions have no
// `questions` array so accuracy is left null for those rather than 0%.
async function computeRecentActivity(studentIds, limit = 10) {
  const rows = await QuizSession.aggregate([
    { $match: completedSessionMatch(studentIds) },
    { $sort: { completed_at: -1 } },
    { $limit: limit },
    { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $lookup: { from: "cases", localField: "case_id", foreignField: "_id", as: "case" } },
    { $unwind: { path: "$case", preserveNullAndEmptyArrays: true } },
  ]);

  return rows.map((s) => {
    const totalQuestions = s.questions?.length || 0;
    const correctCount = (s.questions || []).filter((q) => q.is_correct).length;
    return {
      sessionId: s._id,
      studentName: s.user.name,
      grade: s.user.grade,
      sessionType: s.session_type,
      label:
        s.case?.title ||
        GAME_TYPE_TO_LABEL[s.game_type] ||
        SESSION_TYPE_LABELS[s.session_type] ||
        s.session_type,
      completedAt: s.completed_at,
      accuracy: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : null,
      xpAwarded: s.xp_awarded,
    };
  });
}

// Content-integrity rollup (Part 15/16 of the redesign spec): flags
// chapters that exist but have zero concepts (so no quiz/case content
// can ever be generated for them) and subjects that exist but have
// zero chapters — the two shapes of "leads to nothing" the spec
// singles out. Global only (not teacher-scoped); this describes the
// catalog, not any one class's usage of it.
async function computeContentStatus() {
  const [subjects, chapters, concepts, gameContentCount] = await Promise.all([
    Subject.find().select("_id grade"),
    Chapter.find().select("_id subject_id"),
    Concept.find().select("_id chapter_id"),
    GameContent.countDocuments(),
  ]);

  const chapterCountBySubject = {};
  for (const ch of chapters) {
    const key = ch.subject_id.toString();
    chapterCountBySubject[key] = (chapterCountBySubject[key] || 0) + 1;
  }
  const conceptCountByChapter = {};
  for (const c of concepts) {
    const key = c.chapter_id.toString();
    conceptCountByChapter[key] = (conceptCountByChapter[key] || 0) + 1;
  }

  const emptySubjects = subjects.filter((s) => !chapterCountBySubject[s._id.toString()]).length;
  const emptyChapters = chapters.filter((ch) => !conceptCountByChapter[ch._id.toString()]).length;

  const gradesCovered = [...new Set(subjects.map((s) => s.grade))].sort((a, b) => a - b);

  return {
    totalSubjects: subjects.length,
    totalChapters: chapters.length,
    totalConcepts: concepts.length,
    totalGameContent: gameContentCount,
    subjectsWithNoChapters: emptySubjects,
    chaptersWithNoConcepts: emptyChapters,
    gradesCovered,
  };
}

module.exports = {
  computeAvgPerformance,
  computeGradePerformance,
  computeSubjectPerformance,
  computeGameSubjectPerformance,
  computeTopWeakAreas,
  computeRecentActivity,
  computeContentStatus,
};

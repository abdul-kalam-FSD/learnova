const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const User = require("../models/User");
const QuizSession = require("../models/QuizzSession");
const UserConceptMastery = require("../models/UserConceptMastery");
const Subject = require("../models/Subject");
const Chapter = require("../models/Chapter");
const Concept = require("../models/Concept");
const { computeUserQuizStats } = require("../utils/quizStats");
const { getGradeConceptIds } = require("../utils/gradeAccess");
const { GAME_TYPE_TO_SUBJECT, GAME_TYPE_TO_LABEL } = require("../utils/gameTypeRegistry");
const {
  computeAvgPerformance,
  computeSubjectPerformance,
  computeGameSubjectPerformance,
  computeTopWeakAreas,
  computeRecentActivity,
} = require("../utils/dashboardStats");

const Section = require("../models/Section");

// Scoping boundary: a teacher may only see students in a Section
// they're assigned as teacher_id on. Admins (also allowed through
// requireTeacher) stay unscoped — they already have full access via
// /api/admin, so returning null here means "no restriction" and
// every call site below skips the filter for them.
//
// Returns null for admins (no restriction), or an array of student
// ObjectIds (possibly empty, if the teacher has no sections/students
// yet) for teachers.
async function resolveScopedStudentIds(req) {
  if (req.userRole === "admin") return null;

  const sections = await Section.find({ teacher_id: req.userId }).select("student_ids");
  const ids = new Set();
  for (const section of sections) {
    for (const sid of section.student_ids) ids.add(sid.toString());
  }
  return [...ids];
}

const DEFAULT_PAGE_SIZE = 20;

// Same small helpers adminControllers.js defines locally (not
// exported from there, so duplicated here rather than reaching into
// another controller's private internals).
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE));
  return { page, limit, skip: (page - 1) * limit };
}

// Overall mastery summary for one student, scoped to concepts in
// their own grade (same grade-scoping rule as everywhere else in the
// app — a student's mastery on an out-of-grade concept, e.g. from an
// old grade change, should never count). Mirrors the per-chapter
// breakdown chapterControllers.getProgress uses, just rolled up to a
// single total instead of split by chapter.
async function computeOverallMastery(userId, gradeConceptIds) {
  if (!gradeConceptIds.length) {
    return { weak: 0, learning: 0, strong: 0, totalConcepts: 0, masteredPercent: 0 };
  }

  const masteries = await UserConceptMastery.find({
    user_id: userId,
    concept_id: { $in: gradeConceptIds },
  }).select("concept_id state");

  const masteryMap = {};
  for (const m of masteries) {
    masteryMap[m.concept_id.toString()] = m.state;
  }

  const breakdown = { weak: 0, learning: 0, strong: 0 };
  for (const conceptId of gradeConceptIds) {
    const state = masteryMap[conceptId] || "weak";
    breakdown[state]++;
  }

  const totalConcepts = gradeConceptIds.length;
  const masteredPercent = totalConcepts > 0 ? Math.round((breakdown.strong / totalConcepts) * 100) : 0;

  return { ...breakdown, totalConcepts, masteredPercent };
}

// Subjects -> chapters -> concepts, each concept annotated with this
// student's mastery state (defaulting to "weak" when no
// UserConceptMastery doc exists yet, same default getProgress and
// getChapterDetail already use). Shared by getStudentDetail and
// getStudentMastery so the two views can't drift apart.
async function buildSubjectMasteryTree(studentId, grade) {
  const subjects = await Subject.find({ grade }).sort({ name: 1 });
  const subjectIds = subjects.map((s) => s._id);

  const chapters = await Chapter.find({ subject_id: { $in: subjectIds } }).sort({ order_index: 1 });
  const chapterIds = chapters.map((ch) => ch._id);

  const concepts = await Concept.find({ chapter_id: { $in: chapterIds } });
  const conceptIds = concepts.map((c) => c._id);

  const masteries = await UserConceptMastery.find({
    user_id: studentId,
    concept_id: { $in: conceptIds },
  }).select("concept_id state");

  const masteryMap = {};
  for (const m of masteries) {
    masteryMap[m.concept_id.toString()] = m.state;
  }

  const conceptsByChapter = {};
  for (const c of concepts) {
    const key = c.chapter_id.toString();
    if (!conceptsByChapter[key]) conceptsByChapter[key] = [];
    conceptsByChapter[key].push({
      concept_id: c._id,
      title: c.title,
      mastery_state: masteryMap[c._id.toString()] || "weak",
    });
  }

  const chaptersBySubject = {};
  for (const ch of chapters) {
    const key = ch.subject_id.toString();
    if (!chaptersBySubject[key]) chaptersBySubject[key] = [];
    chaptersBySubject[key].push({
      chapter_id: ch._id,
      title: ch.title,
      unit_name: ch.unit_name,
      concepts: conceptsByChapter[ch._id.toString()] || [],
    });
  }

  return subjects.map((s) => ({
    subject_id: s._id,
    name: s.name,
    chapters: chaptersBySubject[s._id.toString()] || [],
  }));
}

// GET /api/teacher/sections
// This teacher's own sections (admins see every section — same
// unscoped rule as everywhere else here), for the "assign to a whole
// class" picker in the New Assignment flow. Kept intentionally tiny
// (no student rosters) since AssignmentModal only needs id/name/grade
// to populate a <select>; the actual roster is resolved server-side
// at assignment-creation time from the authoritative Section doc.
const getSections = async (req, res) => {
  try {
    const filter = req.userRole === "admin" ? {} : { teacher_id: req.userId };
    const sections = await Section.find(filter).select("name grade student_ids").sort({ grade: 1, name: 1 });

    res.status(200).json({
      sections: sections.map((s) => ({
        id: s._id,
        name: s.name,
        grade: s.grade,
        studentCount: s.student_ids.length,
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/teacher/content-tree?grade=9
// Subjects -> chapters -> concepts for one grade, with no mastery
// data attached (unlike buildSubjectMasteryTree, which is always for
// one specific student) — this powers the concept picker in the New
// Assignment flow, where a teacher is choosing WHAT to assign before
// any student is involved. Deliberately not reusing the admin
// content-management endpoints (contentControllers.js), which are
// gated to admin-only and shaped for CRUD, not a read-only cascading
// picker.
const getContentTree = async (req, res) => {
  try {
    const grade = Number(req.query.grade);
    if (!grade || ![4, 5, 6, 7, 8, 9, 10, 11, 12].includes(grade)) {
      return res.status(400).json({ message: "A valid grade is required" });
    }

    const subjects = await Subject.find({ grade }).sort({ name: 1 });
    const subjectIds = subjects.map((s) => s._id);
    const chapters = await Chapter.find({ subject_id: { $in: subjectIds } }).sort({ order_index: 1 });
    const chapterIds = chapters.map((c) => c._id);
    const concepts = await Concept.find({ chapter_id: { $in: chapterIds } }).select("title chapter_id");

    const conceptsByChapter = {};
    for (const c of concepts) {
      const key = c.chapter_id.toString();
      if (!conceptsByChapter[key]) conceptsByChapter[key] = [];
      conceptsByChapter[key].push({ id: c._id, title: c.title });
    }

    const chaptersBySubject = {};
    for (const ch of chapters) {
      const key = ch.subject_id.toString();
      if (!chaptersBySubject[key]) chaptersBySubject[key] = [];
      chaptersBySubject[key].push({
        id: ch._id,
        title: ch.title,
        concepts: conceptsByChapter[ch._id.toString()] || [],
      });
    }

    res.status(200).json({
      subjects: subjects.map((s) => ({
        id: s._id,
        name: s.name,
        chapters: chaptersBySubject[s._id.toString()] || [],
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
};


// Student overview — grade, games completed, overall mastery, recent
// activity. Same search/grade filter shape as admin's listStudents
// (`role: "student"`, name/email regex, optional grade filter), plus
// per-student games-completed + mastery summary the admin endpoint
// doesn't compute.
const listStudents = async (req, res) => {
  try {
    const { search, grade } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    // Excludes guests (anonymous "Guest" accounts from the public
    // play-without-login flow) — this roster is for monitoring real
    // enrolled students, same rationale as adminControllers.listStudents.
    const filter = { role: "student", is_guest: { $ne: true } };
    if (grade) filter.grade = Number(grade);
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const scopedStudentIds = await resolveScopedStudentIds(req);
    if (scopedStudentIds !== null) {
      // Teacher with zero sections/students: return an empty page
      // rather than $in: [] silently matching nothing in a confusing
      // way — both behave the same in Mongo, but being explicit here
      // means the empty-section case can't accidentally regress into
      // "sees everyone" if the filter shape ever changes above.
      filter._id = { $in: scopedStudentIds };
    }

    const [students, total] = await Promise.all([
      User.find(filter)
        .select("name email grade xp_total streak_count last_active_date createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    // Games-completed count per student on this page, in one grouped
    // aggregation rather than one query per student.
    const studentIds = students.map((s) => s._id);
    const gamesCompletedRows = await QuizSession.aggregate([
      { $match: { user_id: { $in: studentIds }, session_type: "game-session", completed_at: { $ne: null } } },
      { $group: { _id: "$user_id", count: { $sum: 1 } } },
    ]);
    const gamesCompletedMap = {};
    for (const row of gamesCompletedRows) {
      gamesCompletedMap[row._id.toString()] = row.count;
    }

    // gradeConceptIds only needs computing once per distinct grade on
    // the page, not once per student.
    const distinctGrades = [...new Set(students.map((s) => s.grade))];
    const conceptIdsByGrade = {};
    for (const g of distinctGrades) {
      conceptIdsByGrade[g] = await getGradeConceptIds(g);
    }

    const studentSummaries = await Promise.all(
      students.map(async (s) => {
        const [overallMastery, quizStats] = await Promise.all([
          computeOverallMastery(s._id, conceptIdsByGrade[s.grade] || []),
          computeUserQuizStats(s._id, { recentLimit: 1 }),
        ]);

        return {
          id: s._id,
          name: s.name,
          email: s.email,
          grade: s.grade,
          gamesCompleted: gamesCompletedMap[s._id.toString()] || 0,
          overallMastery,
          lastActiveDate: s.last_active_date,
          recentActivityDate: quizStats.recentQuizzes[0]?.date || null,
        };
      }),
    );

    res.status(200).json({
      students: studentSummaries,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/teacher/students/:studentId
// Full detail: subjects -> chapters -> concepts -> mastery, games
// played, and recent performance.
const getStudentDetail = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student id" });
    }

    const student = await User.findOne({ _id: studentId, role: "student" }).select(
      "name email grade xp_total streak_count last_active_date createdAt",
    );
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const scopedStudentIds = await resolveScopedStudentIds(req);
    if (scopedStudentIds !== null && !scopedStudentIds.includes(studentId)) {
      // Same response as "not found" rather than 403 — a teacher
      // shouldn't be able to tell the difference between "this
      // student doesn't exist" and "this student exists but isn't in
      // your section" by probing IDs.
      return res.status(404).json({ message: "Student not found" });
    }

    const [subjects, quizStats, gameSessions] = await Promise.all([
      buildSubjectMasteryTree(student._id, student.grade),
      computeUserQuizStats(student._id, { recentLimit: 10 }),
      QuizSession.find({
        user_id: student._id,
        session_type: "game-session",
        completed_at: { $ne: null },
      })
        .sort({ completed_at: -1 })
        .limit(20)
        .select("game_type completed_at xp_awarded"),
    ]);

    const gamesPlayed = gameSessions.map((s) => ({
      sessionId: s._id,
      gameType: s.game_type,
      label: GAME_TYPE_TO_LABEL[s.game_type] || s.game_type,
      subject: GAME_TYPE_TO_SUBJECT[s.game_type] || null,
      completedAt: s.completed_at,
      xpAwarded: s.xp_awarded,
    }));

    res.status(200).json({
      id: student._id,
      name: student.name,
      email: student.email,
      grade: student.grade,
      xpTotal: student.xp_total,
      streakCount: student.streak_count,
      lastActiveDate: student.last_active_date,
      joinedAt: student.createdAt,
      subjects,
      gamesPlayed,
      quizzesPlayed: quizStats.quizzesPlayed,
      accuracy: quizStats.accuracy,
      recentPerformance: quizStats.recentQuizzes,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/teacher/students/:studentId/mastery
// Dedicated mastery-only view — same subject/chapter/concept tree as
// getStudentDetail (via the shared buildSubjectMasteryTree helper),
// plus the overall weak/learning/strong summary from listStudents,
// without the games/quiz-history payload getStudentDetail carries.
const getStudentMastery = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student id" });
    }

    const student = await User.findOne({ _id: studentId, role: "student" }).select("grade");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const scopedStudentIds = await resolveScopedStudentIds(req);
    if (scopedStudentIds !== null && !scopedStudentIds.includes(studentId)) {
      return res.status(404).json({ message: "Student not found" });
    }

    const gradeConceptIds = await getGradeConceptIds(student.grade);
    const [subjects, overallMastery] = await Promise.all([
      buildSubjectMasteryTree(student._id, student.grade),
      computeOverallMastery(student._id, gradeConceptIds),
    ]);

    res.status(200).json({
      studentId: student._id,
      overallMastery,
      subjects,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// A concept's status classification for the weak-areas view, from
// the proportion of students in each mastery state.
function classifyConceptStatus({ weak, learning, strong, total }) {
  if (total === 0) return "developing";
  const strongPercent = (strong / total) * 100;
  const weakPercent = (weak / total) * 100;
  if (strongPercent >= 70) return "mastered";
  if (weakPercent >= 50) return "needs-attention";
  return "developing";
}

// GET /api/teacher/weak-areas?grade=&subject=
// Mastery aggregated by concept across every student who has an
// actual UserConceptMastery record for it (concepts no student has
// ever attempted are left out rather than guessed at — no fake data).
// Optional grade/subject filters narrow the result; sorted
// weakest-first so the concepts most needing attention surface first.
const getWeakAreas = async (req, res) => {
  try {
    const { grade, subject } = req.query;
    const scopedStudentIds = await resolveScopedStudentIds(req);

    const pipeline = [];
    if (scopedStudentIds !== null) {
      pipeline.push({
        $match: { user_id: { $in: scopedStudentIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      });
    }
    pipeline.push(
      {
        $group: {
          _id: { concept_id: "$concept_id", state: "$state" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.concept_id",
          counts: { $push: { state: "$_id.state", count: "$count" } },
          total: { $sum: "$count" },
        },
      },
      {
        $lookup: { from: "concepts", localField: "_id", foreignField: "_id", as: "concept" },
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
    );

    const matchAfterLookup = {};
    if (grade) matchAfterLookup["subject.grade"] = Number(grade);
    if (subject) matchAfterLookup["subject.name"] = subject;
    if (Object.keys(matchAfterLookup).length) {
      pipeline.push({ $match: matchAfterLookup });
    }

    const rows = await UserConceptMastery.aggregate(pipeline);

    const weakAreas = rows
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
      .sort((a, b) => b.weak - a.weak);

    res.status(200).json({ weakAreas });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/teacher/overview
// Everything the Teacher Dashboard home page needs: how many students/
// sections this teacher has, how they're doing, which concepts need
// attention, and what's happened recently — all scoped to the
// teacher's own sections via resolveScopedStudentIds (admins hitting
// this see the platform-wide numbers, same unscoped rule every other
// teacher-route handler here already follows).
const getOverview = async (req, res) => {
  try {
    const scopedStudentIds = await resolveScopedStudentIds(req);

    const studentFilter = { role: "student", is_guest: { $ne: true } };
    if (scopedStudentIds !== null) studentFilter._id = { $in: scopedStudentIds };

    const [
      totalStudents,
      totalSections,
      avgPerformance,
      subjectPerformance,
      gameSubjectPerformance,
      weakAreas,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments(studentFilter),
      req.userRole === "admin" ? Section.countDocuments({}) : Section.countDocuments({ teacher_id: req.userId }),
      computeAvgPerformance(scopedStudentIds),
      computeSubjectPerformance(scopedStudentIds),
      computeGameSubjectPerformance(scopedStudentIds),
      computeTopWeakAreas(scopedStudentIds, 5),
      computeRecentActivity(scopedStudentIds, 8),
    ]);

    res.status(200).json({
      totals: {
        totalStudents,
        totalSections,
        avgPerformance: avgPerformance.accuracy,
        avgPerformanceSampleSize: avgPerformance.sessionsCounted,
      },
      subjectPerformance,
      gameSubjectPerformance,
      weakAreas,
      recentActivity,
      isScoped: scopedStudentIds !== null,
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  listStudents,
  getStudentDetail,
  getStudentMastery,
  getWeakAreas,
  getOverview,
  getSections,
  getContentTree,
};

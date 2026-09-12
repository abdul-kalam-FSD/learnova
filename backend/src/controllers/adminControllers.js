const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const fs = require("fs");
const User = require("../models/User");
const QuizSession = require("../models/QuizzSession");
const { syncSessionToExcel, WORKBOOK_PATH } = require("../utils/performanceSync");
const { computeUserQuizStats, SESSION_TYPE_LABELS } = require("../utils/quizStats");
const {
  computeAvgPerformance,
  computeGradePerformance,
  computeSubjectPerformance,
  computeGameSubjectPerformance,
  computeTopWeakAreas,
  computeRecentActivity,
  computeContentStatus,
} = require("../utils/dashboardStats");

const DEFAULT_PAGE_SIZE = 20;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE));
  return { page, limit, skip: (page - 1) * limit };
}

// ---------- Users (all roles — for Manage Staff) ----------
// Separate from listStudents on purpose: listStudents is scoped to
// role:"student" for the Students tab, while this powers a screen
// where an admin finds *any* user to promote/demote.

const listUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    // Guests (anonymous "Guest" accounts from the public play-without-
    // login flow) are ephemeral by design and were never meant to show
    // up in a staff/user-management screen — excluded here the same
    // way listStudents excludes them from the Students tab.
    const filter = { is_guest: { $ne: true } };
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email role status grade createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        grade: u.grade,
        joinedAt: u.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- Students ----------

const listStudents = async (req, res) => {
  try {
    const { search, grade } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    // Excludes guests — the same anonymous "Guest" accounts minted by
    // the public play-without-login flow (authControllers.guestLogin).
    // This roster is for managing real enrolled students, not the
    // potentially large number of throwaway guest sessions a busy
    // public hub can generate; without this, every guest who ever
    // clicked "Play" would permanently clutter this list.
    const filter = { role: "student", is_guest: { $ne: true } };
    if (grade) filter.grade = Number(grade);
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const [students, total] = await Promise.all([
      User.find(filter)
        .select("name email grade xp_total streak_count createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      students: students.map((s) => ({
        id: s._id,
        name: s.name,
        email: s.email,
        grade: s.grade,
        xpTotal: s.xp_total,
        streakCount: s.streak_count,
        joinedAt: s.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    sendError(res, err);
  }
};

const getStudentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid student id" });
    }

    const user = await User.findOne({ _id: id, role: "student" }).select(
      "name email grade xp_total streak_count createdAt",
    );
    if (!user) {
      return res.status(404).json({ message: "Student not found" });
    }

    const { quizzesPlayed, accuracy, recentQuizzes } = await computeUserQuizStats(id, {
      recentLimit: 25,
    });

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      grade: user.grade,
      xpTotal: user.xp_total,
      streakCount: user.streak_count,
      joinedAt: user.createdAt,
      quizzesPlayed,
      accuracy,
      recentQuizzes,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- Results ----------
// Filterable by grade, session type, and completion date range.
// Not filterable by chapter/subject: QuizSession only records
// concept_id per answered question, not a session-level chapter, so
// that rollup isn't reliable with the current schema.

async function buildResultsPipeline(query) {
  const { grade, sessionType, gameType, subject, chapterId, from, to, search } = query;

  const matchSession = { completed_at: { $ne: null } };
  if (sessionType) matchSession.session_type = sessionType;
  if (gameType) matchSession.game_type = gameType;
  if (from || to) {
    matchSession.completed_at = { ...matchSession.completed_at };
    if (from) matchSession.completed_at.$gte = new Date(from);
    if (to) matchSession.completed_at.$lte = new Date(to);
  }

  const matchUser = {};
  if (grade) matchUser["user.grade"] = Number(grade);
  if (search) {
    matchUser.$or = [
      { "user.name": { $regex: escapeRegex(search), $options: "i" } },
      { "user.email": { $regex: escapeRegex(search), $options: "i" } },
    ];
  }

  // Game-session rows carry a content_id (-> GameContent) instead of a
  // single case_id/questions concept, so Subject/Chapter/Game name have
  // to be resolved via GameContent.concept_id -> Concept.chapter_id ->
  // Chapter.subject_id -> Subject. Quiz/case sessions answer several
  // concepts per session, so they still can't be attributed to one
  // subject/chapter (documented limitation below) — those fields are
  // simply left blank for that session_type rather than guessed.
  const matchAcademic = {};
  if (subject) matchAcademic["gameSubject.name"] = subject;
  if (chapterId && mongoose.Types.ObjectId.isValid(chapterId)) {
    matchAcademic["gameChapter._id"] = new mongoose.Types.ObjectId(chapterId);
  }

  return [
    { $match: matchSession },
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    ...(Object.keys(matchUser).length ? [{ $match: matchUser }] : []),
    {
      $lookup: {
        from: "cases",
        localField: "case_id",
        foreignField: "_id",
        as: "case",
      },
    },
    { $unwind: { path: "$case", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "gamecontents",
        localField: "content_id",
        foreignField: "_id",
        as: "gameContent",
      },
    },
    { $unwind: { path: "$gameContent", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "concepts",
        localField: "gameContent.concept_id",
        foreignField: "_id",
        as: "gameConcept",
      },
    },
    { $unwind: { path: "$gameConcept", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "chapters",
        localField: "gameConcept.chapter_id",
        foreignField: "_id",
        as: "gameChapter",
      },
    },
    { $unwind: { path: "$gameChapter", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "subjects",
        localField: "gameChapter.subject_id",
        foreignField: "_id",
        as: "gameSubject",
      },
    },
    { $unwind: { path: "$gameSubject", preserveNullAndEmptyArrays: true } },
    ...(Object.keys(matchAcademic).length ? [{ $match: matchAcademic }] : []),
    { $sort: { completed_at: -1 } },
  ];
}

// Pure function — no DB access — so it's covered by a plain unit test
// (tests/unit/resultRow.test.js) instead of only the mongodb-memory-
// server-backed integration suite.
function projectResultRow(session) {
  const isGameSession = session.session_type === "game-session";

  let correctCount;
  let totalQuestions;

  if (isGameSession) {
    // Game sessions store their outcome in game_payload, not the
    // `questions` array (that array is always empty for game-session
    // docs — see QuizzSession.js) — reading `questions.length` here,
    // as the code previously did unconditionally, silently reported
    // 0/0 (0% accuracy) for every completed game.
    const payload = session.game_payload || {};
    const isCorrect = payload.is_correct;
    correctCount = payload.correct_count ?? (isCorrect ? 1 : 0);
    totalQuestions = payload.total_count ?? 1;
  } else {
    totalQuestions = session.questions.length;
    correctCount = session.questions.filter((q) => q.is_correct).length;
  }

  const accuracy =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    sessionId: session._id,
    studentName: session.user.name,
    studentEmail: session.user.email,
    grade: session.user.grade,
    sessionType: session.session_type,
    sessionTypeLabel:
      session.case?.title || SESSION_TYPE_LABELS[session.session_type] || session.session_type,
    // Populated only for game-session rows — quiz/case sessions span
    // several concepts each, so a single subject/chapter can't be
    // attributed to them without guessing.
    subject: isGameSession ? session.gameSubject?.name || null : null,
    chapter: isGameSession ? session.gameChapter?.title || null : null,
    gameTitle: isGameSession ? session.gameContent?.title || null : null,
    gameType: isGameSession ? session.game_type || null : null,
    completedAt: session.completed_at,
    correctCount,
    totalQuestions,
    accuracy,
    xpAwarded: session.xp_awarded,
    syncStatus: session.sync_status || "pending",
    syncedAt: session.synced_at || null,
  };
}

const getResults = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const pipeline = await buildResultsPipeline(req.query);

    const [rows, totalCountResult] = await Promise.all([
      QuizSession.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      QuizSession.aggregate([...pipeline, { $count: "total" }]),
    ]);

    const total = totalCountResult[0]?.total || 0;

    res.status(200).json({
      results: rows.map(projectResultRow),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    sendError(res, err);
  }
};

const exportResultsExcel = async (req, res) => {
  try {
    const pipeline = await buildResultsPipeline(req.query);
    // No pagination for export — the admin gets everything matching
    // the current filters in one file.
    const rows = await QuizSession.aggregate(pipeline);
    const data = rows.map(projectResultRow);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");

    sheet.columns = [
      { header: "Student Name", key: "studentName", width: 24 },
      { header: "Email", key: "studentEmail", width: 28 },
      { header: "Grade", key: "grade", width: 8 },
      { header: "Subject", key: "subject", width: 18 },
      { header: "Chapter", key: "chapter", width: 24 },
      { header: "Game", key: "gameTitle", width: 24 },
      { header: "Game Type", key: "gameType", width: 26 },
      { header: "Session Type", key: "sessionTypeLabel", width: 24 },
      { header: "Completed At", key: "completedAt", width: 22 },
      { header: "Correct", key: "correctCount", width: 10 },
      { header: "Total Questions", key: "totalQuestions", width: 14 },
      { header: "Accuracy %", key: "accuracy", width: 12 },
      { header: "XP Awarded", key: "xpAwarded", width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };

    data.forEach((row) => {
      sheet.addRow({
        ...row,
        completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : "",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=leveled-results.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- Role management ----------

const VALID_ROLES = ["student", "teacher", "admin"];

const setUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    // Prevent an admin from locking themselves out by accidentally
    // demoting their own account.
    if (id === req.userId && role !== "admin") {
      return res.status(400).json({ message: "You cannot change your own admin role" });
    }

    // Any explicit role assignment by an admin — including re-selecting
    // "teacher" for a user who's already a teacher — doubles as
    // approval: it flips a self-registered pending teacher
    // (authControllers.register) to "active" so requireTeacher lets
    // them through. This is a no-op for a user who was already
    // "active" (students, admins, already-approved teachers).
    const user = await User.findByIdAndUpdate(
      id,
      { role, status: "active" },
      { new: true },
    ).select("name email role status");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- Automatic Excel/Sheet synchronization (Section 31-36) ----------
// This is the auto-maintained workbook every completed game is synced
// into (see utils/performanceSync.js) — distinct from exportResultsExcel
// above, which generates a filtered snapshot on demand. This endpoint
// just streams whatever the automatic sync process has already built.
const downloadSyncedWorkbook = async (req, res) => {
  try {
    if (!fs.existsSync(WORKBOOK_PATH)) {
      return res.status(404).json({
        message: "No synchronized performance data yet — it's created after the first completed game.",
      });
    }
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=student-performance-synced.xlsx");
    fs.createReadStream(WORKBOOK_PATH).pipe(res);
  } catch (err) {
    sendError(res, err);
  }
};

// Retries synchronization for one session — for the admin to use when
// `syncStatus` shows "failed" on a result row. Does not touch score/
// XP/completion; those are already final and untouched by sync
// failures (Section 36).
const retrySync = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session id" });
    }
    const session = await QuizSession.findById(sessionId);
    if (!session || !session.completed_at) {
      return res.status(404).json({ message: "Completed session not found" });
    }
    const result = await syncSessionToExcel(sessionId);
    res.status(200).json(result);
  } catch (err) {
    sendError(res, err);
  }
};


// GET /api/admin/stats
// Everything the Admin Dashboard home page needs in one call: platform
// totals, activity, performance rollups, weak areas, and a content
// completeness summary. All real aggregations against the live data —
// nothing here is sample/demo data, and every count is 0 rather than
// a placeholder if the collection is empty.
const ACTIVE_WINDOW_DAYS = 7;

const getDashboardStats = async (req, res) => {
  try {
    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const studentFilter = { role: "student", is_guest: { $ne: true } };

    const [
      totalStudents,
      totalTeachers,
      activeStudents,
      totalSessionsStarted,
      totalSessionsCompleted,
      gamesPlayed,
      avgPerformance,
      gradePerformance,
      subjectPerformance,
      gameSubjectPerformance,
      weakAreas,
      recentActivity,
      contentStatus,
    ] = await Promise.all([
      User.countDocuments(studentFilter),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ ...studentFilter, last_active_date: { $gte: activeSince } }),
      QuizSession.countDocuments({}),
      QuizSession.countDocuments({ completed_at: { $ne: null } }),
      QuizSession.countDocuments({ session_type: "game-session", completed_at: { $ne: null } }),
      computeAvgPerformance(null),
      computeGradePerformance(null),
      computeSubjectPerformance(null),
      computeGameSubjectPerformance(null),
      computeTopWeakAreas(null, 5),
      computeRecentActivity(null, 10),
      computeContentStatus(),
    ]);

    const completionRate =
      totalSessionsStarted > 0
        ? Math.round((totalSessionsCompleted / totalSessionsStarted) * 100)
        : 0;

    res.status(200).json({
      totals: {
        totalStudents,
        totalTeachers,
        activeStudents,
        activeWindowDays: ACTIVE_WINDOW_DAYS,
        gamesPlayed,
        totalSessionsCompleted,
        completionRate,
        avgPerformance: avgPerformance.accuracy,
        avgPerformanceSampleSize: avgPerformance.sessionsCounted,
      },
      gradePerformance,
      subjectPerformance,
      gameSubjectPerformance,
      weakAreas,
      recentActivity,
      contentStatus,
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  listUsers,
  listStudents,
  getStudentDetail,
  getResults,
  exportResultsExcel,
  downloadSyncedWorkbook,
  retrySync,
  setUserRole,
  getDashboardStats,
  // Exported for tests/unit/resultRow.test.js — pure function, no DB
  // access, so it doesn't need the mongodb-memory-server integration
  // harness to verify the game-session accuracy fix.
  projectResultRow,
};

const mongoose = require("mongoose");
const { sendError } = require("../utils/sendError");
const Contest = require("../models/Contest");
const Subject = require("../models/Subject");
const Chapter = require("../models/Chapter");
const GameContent = require("../models/GameContent");
const QuizSession = require("../models/QuizzSession");
const User = require("../models/User");
const { GAME_TYPE_TO_LABEL } = require("../utils/gameTypeRegistry");
const { computeContestPhase } = require("../utils/contestLifecycle");
const { isVisibleToStudent } = require("../utils/contestParticipation");

// Student-facing contest discovery. Runs behind protect + requireStudent,
// which attach the freshly-loaded user as req.studentUser — the grade used
// for filtering always comes from there (the database), never from the
// request.
//
// Deliberately NOT built from the teacher/admin response builder: that one
// carries review notes, submission data and reviewer identity, none of
// which a student should see. These responses also never include any
// GameContent payload (answer keys) — only title / type / difficulty.

const idOf = (v) => (v == null ? null : v.toString());

const PHASE_RANK = { ACTIVE: 0, UPCOMING: 1, ENDED: 2 };

// Active first (ending soonest), then upcoming (starting soonest), then
// ended (most recently ended first).
const byRelevance = (a, b) => {
  if (PHASE_RANK[a.phase] !== PHASE_RANK[b.phase]) return PHASE_RANK[a.phase] - PHASE_RANK[b.phase];
  if (a.phase === "ACTIVE") return new Date(a.endAt) - new Date(b.endAt);
  if (a.phase === "UPCOMING") return new Date(a.startAt) - new Date(b.startAt);
  return new Date(b.endAt) - new Date(a.endAt);
};

// Batched lookups shared by list + detail (a fixed number of queries no
// matter how many contests).
async function lookupNames(contests) {
  const subjectIds = [...new Set(contests.map((c) => idOf(c.subject_id)))];
  const chapterIds = [...new Set(contests.map((c) => idOf(c.chapter_id)).filter(Boolean))];
  const teacherIds = [...new Set(contests.map((c) => idOf(c.teacher_id)))];

  const [subjects, chapters, teachers] = await Promise.all([
    Subject.find({ _id: { $in: subjectIds } }).select("name"),
    chapterIds.length ? Chapter.find({ _id: { $in: chapterIds } }).select("title") : [],
    User.find({ _id: { $in: teacherIds } }).select("name"),
  ]);
  const subject = {};
  for (const s of subjects) subject[idOf(s._id)] = s.name;
  const chapter = {};
  for (const c of chapters) chapter[idOf(c._id)] = c.title;
  const teacher = {};
  for (const t of teachers) teacher[idOf(t._id)] = t.name;
  return { subject, chapter, teacher };
}

const baseShape = (c, names, now) => ({
  id: c._id,
  title: c.title,
  description: c.description,
  grade: c.grade,
  subject: names.subject[idOf(c.subject_id)] || null,
  chapterTitle: c.chapter_id ? names.chapter[idOf(c.chapter_id)] || null : null,
  teacherName: names.teacher[idOf(c.teacher_id)] || null,
  startAt: c.start_at,
  endAt: c.end_at,
  // Same derived-phase function the teacher/admin views use, evaluated
  // on the SERVER clock.
  phase: computeContestPhase(c, now),
  challengeCount: c.challenges.length,
});

// GET /api/student/contests
// PUBLISHED contests for the requesting student's own grade, each with the
// student's progress. Nothing else is ever returned: no drafts, pending or
// rejected contests, and nothing for another grade.
const listStudentContests = async (req, res) => {
  try {
    const user = req.studentUser;
    const now = new Date();

    // A student record without a grade can't match any contest.
    if (user.grade == null) {
      return res.status(200).json({ contests: [], serverNow: now });
    }

    const contests = await Contest.find({ status: "PUBLISHED", grade: user.grade })
      .sort({ start_at: -1 })
      .limit(100);
    if (contests.length === 0) {
      return res.status(200).json({ contests: [], serverNow: now });
    }

    const [names, sessions] = await Promise.all([
      lookupNames(contests),
      QuizSession.find({
        user_id: user._id,
        contest_id: { $in: contests.map((c) => c._id) },
      }).select("contest_id completed_at"),
    ]);

    const completedBy = {};
    for (const s of sessions) {
      if (s.completed_at) completedBy[idOf(s.contest_id)] = (completedBy[idOf(s.contest_id)] || 0) + 1;
    }

    const rows = contests
      .map((c) => ({ ...baseShape(c, names, now), completedCount: completedBy[idOf(c._id)] || 0 }))
      .sort(byRelevance);

    res.status(200).json({ contests: rows, serverNow: now });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/student/contests/:id
// One contest with its challenge list and the student's own status on each.
// A contest the student may not see (unknown id, not PUBLISHED, other
// grade) is a plain 404 so its existence isn't revealed.
const getStudentContest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid contest id" });
    }

    const user = req.studentUser;
    const contest = await Contest.findById(id);
    if (!isVisibleToStudent(contest, user)) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const now = new Date();
    const contentIds = contest.challenges.map((ch) => ch.game_content_id);

    const [names, games, sessions] = await Promise.all([
      lookupNames([contest]),
      GameContent.find({ _id: { $in: contentIds } }).select("title game_type difficulty"),
      QuizSession.find({ user_id: user._id, contest_id: contest._id }).select(
        "content_id completed_at xp_awarded game_payload.is_correct",
      ),
    ]);

    const gameById = {};
    for (const g of games) gameById[idOf(g._id)] = g;
    const sessionByContent = {};
    for (const s of sessions) sessionByContent[idOf(s.content_id)] = s;

    const base = baseShape(contest, names, now);

    const challenges = contest.challenges.map((ch) => {
      const g = gameById[idOf(ch.game_content_id)];
      const s = sessionByContent[idOf(ch.game_content_id)];
      const status = !s ? "NOT_STARTED" : s.completed_at ? "COMPLETED" : "IN_PROGRESS";
      return {
        id: ch.game_content_id,
        title: g ? g.title : "Removed content",
        gameType: g ? g.game_type : null,
        label: g ? GAME_TYPE_TO_LABEL[g.game_type] || g.game_type : null,
        difficulty: g ? g.difficulty : null,
        status,
        isCorrect: status === "COMPLETED" ? Boolean(s.game_payload?.is_correct) : null,
        xpAwarded: status === "COMPLETED" ? s.xp_awarded || 0 : null,
        completedAt: status === "COMPLETED" ? s.completed_at : null,
        // Informational only — the server re-checks everything when the
        // student actually starts the game.
        canPlay: Boolean(g) && base.phase === "ACTIVE" && status !== "COMPLETED",
      };
    });

    res.status(200).json({
      ...base,
      challenges,
      progress: {
        completed: challenges.filter((c) => c.status === "COMPLETED").length,
        total: challenges.length,
      },
      serverNow: now,
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { listStudentContests, getStudentContest };

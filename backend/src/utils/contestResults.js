const QuizSession = require("../models/QuizzSession");
const User = require("../models/User");
const Subject = require("../models/Subject");
const Chapter = require("../models/Chapter");
const GameContent = require("../models/GameContent");
const { GAME_TYPE_TO_LABEL } = require("./gameTypeRegistry");
const { computeContestPhase } = require("./contestLifecycle");

// Contest results + leaderboard.
//
// SOURCE OF TRUTH: QuizSession documents that carry a contest_id — nothing
// is copied into a second results collection. Everything here is derived,
// on the server, from what the existing game flow already persisted:
//   game_payload.is_correct / correct_count / total_count  (written by
//   submitGameAttempt AFTER the client body is spread, so trustworthy),
//   xp_awarded (written by completeGame), started_at, completed_at,
//   attempt_count.
// No XP, mastery, streak or daily-cap logic is touched or re-implemented.
//
// Nothing the client sends is ever read as a score, rank, count, XP or
// time: every result endpoint is a GET that takes only ids and paging.
//
// Consumers today: the student / teacher / admin result endpoints. The
// future Excel export should call getContestResults() and use `rows` as-is
// (they are complete, ranked and plain JSON) instead of re-deriving results.

// ---------------------------------------------------------------------
// The ranking rule (there is no contest-specific convention elsewhere in
// the codebase — the only leaderboard is the global XP one, which is not
// suitable here because the daily XP cap can legitimately award 0 XP for a
// contest game a student already practised that day).
//
// Rank by, in order:
//   1. games SOLVED, more is better  (a game is solved when the existing
//      game flow marked the completed session is_correct = every answer
//      right)
//   2. total CORRECT ANSWERS, more is better  (separates students who
//      solved the same number of games but got different partial credit
//      on multi-question games)
//   3. FINISH TIME, sooner is better  (time from the contest's start to
//      the completion of the student's last solved game)
// Students that are equal on all three share the same rank (1, 2, 2, 4).
// A student with no solved game is listed but NOT ranked.
// XP is reported but never used for ranking.
// ---------------------------------------------------------------------
const RANKING_RULE = {
  key: "SOLVED_THEN_ANSWERS_THEN_TIME",
  summary:
    "Ranked by games solved, then total correct answers, then finish time (sooner is better). " +
    "Equal results share a rank. XP is shown but not used. Students with no solved game are not ranked.",
  order: [
    { field: "challengesSolved", direction: "desc" },
    { field: "correctAnswers", direction: "desc" },
    { field: "elapsedSeconds", direction: "asc" },
  ],
};

const idOf = (v) => (v == null ? null : v.toString());
const round1 = (n) => Math.round(n * 10) / 10;

// ---------- pure functions (unit-testable without a database) ----------

// Turns one per-student aggregate (see aggregateParticipants) into the
// public row shape.
function buildRow(group, { challengeCount, contestStart }) {
  const started = group.started || 0;
  const completed = group.completed || 0;
  const solved = group.solved || 0;
  const correctAnswers = group.correctAnswers || 0;
  const totalAnswers = group.totalAnswers || 0;

  const lastSolvedAt = group.lastSolvedAt || null;
  const elapsedSeconds = lastSolvedAt
    ? Math.max(0, Math.round((new Date(lastSolvedAt).getTime() - new Date(contestStart).getTime()) / 1000))
    : null;

  let status = "IN_PROGRESS"; // started something, finished nothing yet
  if (completed > 0) status = challengeCount > 0 && completed >= challengeCount ? "COMPLETED" : "PARTIAL";

  return {
    rank: null, // filled in by rankParticipants
    studentId: idOf(group._id),
    name: null, // filled in by the caller (one batched user lookup)
    email: null,
    status,
    challengeCount,
    challengesStarted: started,
    challengesCompleted: completed,
    challengesSolved: solved,
    correctAnswers,
    totalAnswers,
    accuracy: totalAnswers > 0 ? round1((correctAnswers / totalAnswers) * 100) : null,
    completionPercent: challengeCount > 0 ? Math.round((completed / challengeCount) * 100) : 0,
    xpEarned: group.xp || 0,
    attempts: group.attempts || 0,
    firstStartedAt: group.firstStartedAt || null,
    lastCompletedAt: group.lastCompletedAt || null,
    lastSolvedAt,
    elapsedSeconds,
  };
}

const byNameThenId = (a, b) => {
  const an = (a.name || "").toLowerCase();
  const bn = (b.name || "").toLowerCase();
  if (an !== bn) return an < bn ? -1 : 1;
  return a.studentId < b.studentId ? -1 : a.studentId > b.studentId ? 1 : 0;
};

// Ranked comparison: solved desc, correct answers desc, elapsed asc.
const compareRanked = (a, b) => {
  if (a.challengesSolved !== b.challengesSolved) return b.challengesSolved - a.challengesSolved;
  if (a.correctAnswers !== b.correctAnswers) return b.correctAnswers - a.correctAnswers;
  if (a.elapsedSeconds !== b.elapsedSeconds) return a.elapsedSeconds - b.elapsedSeconds;
  return 0;
};

// Sorts rows and assigns ranks (standard competition ranking). Returns a
// NEW array; input rows are not mutated. The order is fully deterministic:
// rank keys first, then name and id purely for stable display order among
// students who share a rank.
function rankParticipants(rows) {
  const ranked = rows.filter((r) => r.challengesSolved > 0).map((r) => ({ ...r }));
  const unranked = rows.filter((r) => r.challengesSolved <= 0).map((r) => ({ ...r }));

  ranked.sort((a, b) => compareRanked(a, b) || byNameThenId(a, b));
  ranked.forEach((row, i) => {
    row.rank = i > 0 && compareRanked(ranked[i - 1], row) === 0 ? ranked[i - 1].rank : i + 1;
  });

  // Not on the leaderboard, but still listed: most correct answers first.
  unranked.sort((a, b) => b.correctAnswers - a.correctAnswers || b.challengesCompleted - a.challengesCompleted || byNameThenId(a, b));
  unranked.forEach((row) => {
    row.rank = null;
  });

  return [...ranked, ...unranked];
}

function summarize(rows, challengeCount) {
  return {
    challengeCount,
    participantCount: rows.length,
    completedCount: rows.filter((r) => r.status === "COMPLETED").length,
    partialCount: rows.filter((r) => r.status === "PARTIAL").length,
    inProgressCount: rows.filter((r) => r.status === "IN_PROGRESS").length,
    rankedCount: rows.filter((r) => r.rank != null).length,
  };
}

// ---------- database access ----------

// One aggregation, one row per participating student — never one query per
// student and never every session loaded into memory. Uses the existing
// unique index {contest_id, user_id, content_id} (leads with contest_id).
//
// Only fields the server itself wrote are read. A session counts as
// "completed" only when completed_at is a real date, mirroring
// completeGame, which is the only code that sets it.
function participantPipeline(contest) {
  const isCompleted = { $eq: [{ $type: "$completed_at" }, "date"] };
  const isSolved = { $and: [isCompleted, { $eq: ["$game_payload.is_correct", true] }] };
  return [
    {
      $match: {
        contest_id: contest._id,
        // A challenge whose GameContent was later deleted is still in the
        // contest's list, so its sessions still count.
        content_id: { $in: contest.challenges.map((c) => c.game_content_id) },
      },
    },
    {
      $group: {
        _id: "$user_id",
        started: { $sum: 1 },
        completed: { $sum: { $cond: [isCompleted, 1, 0] } },
        solved: { $sum: { $cond: [isSolved, 1, 0] } },
        // Same fallbacks completeGame uses when a payload predates the
        // count fields: correct = is_correct ? 1 : 0, total = 1.
        correctAnswers: {
          $sum: {
            $cond: [
              isCompleted,
              { $ifNull: ["$game_payload.correct_count", { $cond: [{ $eq: ["$game_payload.is_correct", true] }, 1, 0] }] },
              0,
            ],
          },
        },
        totalAnswers: { $sum: { $cond: [isCompleted, { $ifNull: ["$game_payload.total_count", 1] }, 0] } },
        // Exactly what the existing completion flow awarded (0 when the
        // daily cap applied) — no new XP maths.
        xp: { $sum: { $cond: [isCompleted, { $ifNull: ["$xp_awarded", 0] }, 0] } },
        attempts: { $sum: { $ifNull: ["$attempt_count", 0] } },
        firstStartedAt: { $min: "$started_at" },
        lastCompletedAt: { $max: { $cond: [isCompleted, "$completed_at", null] } },
        lastSolvedAt: { $max: { $cond: [isSolved, "$completed_at", null] } },
      },
    },
  ];
}

async function aggregateParticipants(contest) {
  return QuizSession.aggregate(participantPipeline(contest));
}

// Full, ranked results for a contest: every participant, ranked, with names
// filled in via ONE batched user lookup. Callers paginate / filter fields.
async function getContestResults(contest) {
  const challengeCount = contest.challenges.length;
  const groups = await aggregateParticipants(contest);

  const users = groups.length
    ? await User.find({ _id: { $in: groups.map((g) => g._id) } }).select("name email")
    : [];
  const userById = {};
  for (const u of users) userById[idOf(u._id)] = u;

  const rows = groups.map((g) => {
    const row = buildRow(g, { challengeCount, contestStart: contest.start_at });
    const u = userById[row.studentId];
    row.name = u ? u.name : "Deleted user";
    row.email = u ? u.email || null : null; // callers decide whether a viewer may see it
    return row;
  });

  const ranked = rankParticipants(rows);
  const phase = computeContestPhase(contest);
  return {
    rankingRule: RANKING_RULE,
    // A leaderboard is only "final" once the contest has ended.
    final: phase === "ENDED",
    phase,
    summary: summarize(ranked, challengeCount),
    rows: ranked,
  };
}

// Contest header info shared by every results view (3 batched lookups).
async function describeContest(contest) {
  const contentIds = contest.challenges.map((c) => c.game_content_id);
  const [subject, chapter, games] = await Promise.all([
    Subject.findById(contest.subject_id).select("name"),
    contest.chapter_id ? Chapter.findById(contest.chapter_id).select("title") : null,
    GameContent.find({ _id: { $in: contentIds } }).select("title game_type"),
  ]);
  const gameById = {};
  for (const g of games) gameById[idOf(g._id)] = g;

  return {
    id: contest._id,
    title: contest.title,
    grade: contest.grade,
    subject: subject ? subject.name : null,
    chapterTitle: chapter ? chapter.title : null,
    startAt: contest.start_at,
    endAt: contest.end_at,
    status: contest.status,
    phase: computeContestPhase(contest),
    challengeCount: contest.challenges.length,
    challenges: contest.challenges.map((c) => {
      const g = gameById[idOf(c.game_content_id)];
      return {
        id: c.game_content_id,
        title: g ? g.title : "Removed content",
        label: g ? GAME_TYPE_TO_LABEL[g.game_type] || g.game_type : null,
      };
    }),
  };
}

// The fields every per-challenge view reads from a session — one place, so
// the breakdown endpoints and the Excel export can never disagree.
const SESSION_FIELDS =
  "user_id content_id started_at completed_at xp_awarded attempt_count game_payload.is_correct game_payload.correct_count game_payload.total_count";

// One contest challenge for one student, from their session (or null when
// they never started it). `challenge` is { id, title, label }.
function challengeRow(challenge, session) {
  const completed = Boolean(session && session.completed_at);
  const payload = (session && session.game_payload) || {};
  return {
    id: challenge.id,
    title: challenge.title,
    label: challenge.label,
    status: !session ? "NOT_STARTED" : completed ? "COMPLETED" : "IN_PROGRESS",
    isCorrect: completed ? payload.is_correct === true : null,
    correctAnswers: completed ? payload.correct_count ?? (payload.is_correct === true ? 1 : 0) : null,
    totalAnswers: completed ? payload.total_count ?? 1 : null,
    xpAwarded: completed ? session.xp_awarded || 0 : null,
    attempts: session ? session.attempt_count || 0 : 0,
    startedAt: session ? session.started_at || null : null,
    completedAt: completed ? session.completed_at : null,
  };
}

// Per-challenge breakdown for ONE student in ONE contest, in the contest's
// own challenge order (a contest has at most ~20 challenges, so this is a
// single small query plus one batched title lookup).
async function getParticipantBreakdown(contest, studentId) {
  const [sessions, games] = await Promise.all([
    QuizSession.find({ contest_id: contest._id, user_id: studentId }).select(SESSION_FIELDS),
    GameContent.find({ _id: { $in: contest.challenges.map((c) => c.game_content_id) } }).select("title game_type"),
  ]);
  const sessionByContent = {};
  for (const s of sessions) sessionByContent[idOf(s.content_id)] = s;
  const gameById = {};
  for (const g of games) gameById[idOf(g._id)] = g;

  return {
    participated: sessions.length > 0,
    challenges: contest.challenges.map((c) => {
      const key = idOf(c.game_content_id);
      const g = gameById[key];
      return challengeRow(
        {
          id: c.game_content_id,
          title: g ? g.title : "Removed content",
          label: g ? GAME_TYPE_TO_LABEL[g.game_type] || g.game_type : null,
        },
        sessionByContent[key],
      );
    }),
  };
}

// EVERY participant's sessions for the contest in ONE query (the grid the
// Excel "Challenge Details" sheet needs is inherently one row per session,
// so this is the minimum to read — not one query per student). Only the
// whitelisted fields above are selected, never the raw game_payload.
async function getContestSessions(contest) {
  return QuizSession.find({
    contest_id: contest._id,
    content_id: { $in: contest.challenges.map((c) => c.game_content_id) },
  }).select(SESSION_FIELDS);
}

// Pure: one row per participant x contest challenge, in the order of the
// supplied ranked `rows` and then the contest's own challenge order.
// Challenges a student never touched appear as NOT_STARTED.
function buildChallengeGrid(rows, challenges, sessions) {
  const byStudent = new Map();
  for (const s of sessions) {
    const sid = idOf(s.user_id);
    if (!byStudent.has(sid)) byStudent.set(sid, new Map());
    byStudent.get(sid).set(idOf(s.content_id), s);
  }
  const grid = [];
  for (const row of rows) {
    const mine = byStudent.get(row.studentId) || new Map();
    for (const challenge of challenges) {
      grid.push({
        studentId: row.studentId,
        studentName: row.name,
        rank: row.rank,
        ...challengeRow(challenge, mine.get(idOf(challenge.id))),
      });
    }
  }
  return grid;
}

module.exports = {
  RANKING_RULE,
  buildRow,
  rankParticipants,
  summarize,
  participantPipeline,
  aggregateParticipants,
  getContestResults,
  describeContest,
  getParticipantBreakdown,
  getContestSessions,
  buildChallengeGrid,
  challengeRow,
};

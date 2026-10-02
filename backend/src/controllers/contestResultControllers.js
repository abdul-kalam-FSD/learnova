const mongoose = require("mongoose");
const { sendError } = require("../utils/sendError");
const Contest = require("../models/Contest");
const Section = require("../models/Section");
const User = require("../models/User");
const { isVisibleToStudent } = require("../utils/contestParticipation");
const {
  getContestResults,
  describeContest,
  getParticipantBreakdown,
  getContestSessions,
  buildChallengeGrid,
} = require("../utils/contestResults");
// Referenced as a module object (not destructured) so the workbook builder can
// be replaced in tests to simulate a generation failure.
const contestExcel = require("../utils/contestExcel");

// HTTP layer for contest results. All calculation lives in
// utils/contestResults.js; this file only decides WHO may see WHAT.
//
//   Teacher  GET /api/contests/:id/results[/:studentId]        (owner only)
//   Admin    GET /api/admin/contests/:id/results[/:studentId]  (any published contest)
//   Student  GET /api/student/contests/:id/result              (own result)
//            GET /api/student/contests/:id/leaderboard         (public standings)
//
// Every endpoint is a read-only GET. The only inputs are ids and paging, so
// there is nowhere for a client to supply a score, rank, XP, count or time;
// any such query parameter is simply never read.

const idOf = (v) => (v == null ? null : v.toString());
const isValidId = (v) => typeof v === "string" && mongoose.Types.ObjectId.isValid(v);

// An .xlsx is built in memory, so a contest with an enormous number of
// participants is refused with a clear message rather than risking the
// server. (2,000 participants x <= 20 games is ~40,000 detail rows.) It is
// never silently truncated: an export is either complete or it is refused.
const MAX_EXPORT_PARTICIPANTS = 2000;

const DEFAULT_PAGE_SIZE = 25;
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE));
  return { page, limit, skip: (page - 1) * limit };
}

// Results only exist for contests students could actually play. A draft /
// pending / rejected contest has none, and its details must not be
// probed through this route either.
const notPublished = (res) =>
  res.status(409).json({
    message: "Results are only available once a contest has been published",
    code: "CONTEST_NOT_PUBLISHED",
  });

// ---------------------------------------------------------------------
// Teacher / admin (management) views
// ---------------------------------------------------------------------

// Loads the contest for a management viewer. `canSee` decides who may:
//   teacher -> only the contest's creator
//   admin   -> any contest that has left DRAFT (drafts are private)
// Anyone else gets a plain 404, so another teacher's contest is
// indistinguishable from a non-existent one.
async function loadManageableContest(id, canSee) {
  if (!isValidId(id)) return { status: 400, message: "Invalid contest id" };
  const contest = await Contest.findById(id);
  if (!contest || !canSee(contest)) return { status: 404, message: "Contest not found" };
  return { contest };
}

// Which students' emails may this viewer see? Same boundary the teacher
// dashboard already uses: a teacher only identifies students in sections
// they teach; admins see everyone (as on the admin dashboard). Names are
// always shown; an email outside the boundary is simply null.
async function emailVisibility(req) {
  if (req.userRole === "admin") return () => true;
  const sections = await Section.find({ teacher_id: req.userId }).select("student_ids");
  const allowed = new Set();
  for (const section of sections) for (const sid of section.student_ids || []) allowed.add(idOf(sid));
  return (studentId) => allowed.has(studentId);
}

const withEmailPolicy = (row, mayIdentify) => ({ ...row, email: mayIdentify(row.studentId) ? row.email : null });

function makeManagementHandlers({ canSee, emailPolicy }) {
  const results = async (req, res) => {
    try {
      const loaded = await loadManageableContest(req.params.id, canSee(req));
      if (!loaded.contest) return res.status(loaded.status).json({ message: loaded.message });
      const { contest } = loaded;
      if (contest.status !== "PUBLISHED") return notPublished(res);

      const { page, limit, skip } = parsePagination(req.query);
      const [info, full, mayIdentify] = await Promise.all([
        describeContest(contest),
        getContestResults(contest),
        emailPolicy(req),
      ]);

      res.status(200).json({
        contest: info,
        rankingRule: full.rankingRule,
        final: full.final,
        phase: full.phase,
        summary: full.summary,
        rows: full.rows.slice(skip, skip + limit).map((r) => withEmailPolicy(r, mayIdentify)),
        page,
        limit,
        total: full.rows.length,
        totalPages: Math.ceil(full.rows.length / limit),
      });
    } catch (err) {
      sendError(res, err);
    }
  };

  const participant = async (req, res) => {
    try {
      const { studentId } = req.params;
      if (!isValidId(studentId)) return res.status(400).json({ message: "Invalid student id" });
      const loaded = await loadManageableContest(req.params.id, canSee(req));
      if (!loaded.contest) return res.status(loaded.status).json({ message: loaded.message });
      const { contest } = loaded;
      if (contest.status !== "PUBLISHED") return notPublished(res);

      const [full, mayIdentify] = await Promise.all([getContestResults(contest), emailPolicy(req)]);
      const row = full.rows.find((r) => r.studentId === studentId);
      if (!row) return res.status(404).json({ message: "This student has not taken part in this contest" });

      const breakdown = await getParticipantBreakdown(contest, studentId);
      res.status(200).json({
        contestId: contest._id,
        final: full.final,
        rankingRule: full.rankingRule,
        row: withEmailPolicy(row, mayIdentify),
        challenges: breakdown.challenges,
      });
    } catch (err) {
      sendError(res, err);
    }
  };

  // GET .../results/export — the complete result set as an .xlsx.
  //
  // Same authorization, same PUBLISHED rule and same email policy as the
  // JSON results above; the numbers come from getContestResults() — the one
  // result calculation — and are laid out by utils/contestExcel.js. Nothing
  // in the request (query, body) is read: the file is generated purely from
  // server-side data, and it is the FULL set, never the current page.
  const exportResults = async (req, res) => {
    try {
      const loaded = await loadManageableContest(req.params.id, canSee(req));
      if (!loaded.contest) return res.status(loaded.status).json({ message: loaded.message });
      const { contest } = loaded;
      if (contest.status !== "PUBLISHED") return notPublished(res);

      const full = await getContestResults(contest);
      if (full.rows.length > MAX_EXPORT_PARTICIPANTS) {
        return res.status(413).json({
          message: `This contest has ${full.rows.length} participants, which is more than can be exported in one file (limit ${MAX_EXPORT_PARTICIPANTS}).`,
          code: "EXPORT_TOO_LARGE",
        });
      }

      // A fixed number of queries however many students took part: contest
      // header info, the viewer's section list, the teacher's name and ONE
      // query for every session (for the per-game sheet).
      const [info, mayIdentify, teacher, sessions] = await Promise.all([
        describeContest(contest),
        emailPolicy(req),
        User.findById(contest.teacher_id).select("name"),
        getContestSessions(contest),
      ]);

      const rows = full.rows.map((r) => withEmailPolicy(r, mayIdentify));
      const grid = buildChallengeGrid(rows, info.challenges, sessions);

      // Build the whole file BEFORE touching the response, so a failure
      // anywhere yields a normal JSON error instead of a half-written download.
      const workbook = contestExcel.buildContestResultsWorkbook({
        contest: info,
        teacherName: teacher ? teacher.name : null,
        results: { ...full, rows },
        grid,
        exportedAt: new Date(),
      });
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

      res.status(200);
      res.setHeader("Content-Type", contestExcel.XLSX_MIME);
      res.setHeader("Content-Disposition", contestExcel.contentDisposition(contest.title));
      // Lets a browser app running on another origin read the filename.
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      // Contains student names/emails: never cache or store.
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Length", buffer.length);
      res.end(buffer);
    } catch (err) {
      sendError(res, err);
    }
  };

  return { results, participant, exportResults };
}

const teacher = makeManagementHandlers({
  canSee: (req) => (contest) => idOf(contest.teacher_id) === req.userId,
  emailPolicy: emailVisibility,
});

const admin = makeManagementHandlers({
  canSee: () => (contest) => contest.status !== "DRAFT",
  emailPolicy: async () => () => true,
});

// ---------------------------------------------------------------------
// Student views (behind protect + requireStudent, which attach req.studentUser)
// ---------------------------------------------------------------------

// Same visibility rule as discovery: PUBLISHED and the student's own grade
// (from the database). Anything else is a plain 404.
async function loadVisibleContest(req) {
  const { id } = req.params;
  if (!isValidId(id)) return { status: 400, message: "Invalid contest id" };
  const contest = await Contest.findById(id);
  if (!isVisibleToStudent(contest, req.studentUser)) return { status: 404, message: "Contest not found" };
  return { contest };
}

// What other students may see of a row: standing and outcome, but no id,
// email, XP or attempt data.
const publicRow = (row, isMe) => ({
  rank: row.rank,
  name: row.name,
  challengesSolved: row.challengesSolved,
  challengesCompleted: row.challengesCompleted,
  correctAnswers: row.correctAnswers,
  totalAnswers: row.totalAnswers,
  accuracy: row.accuracy,
  elapsedSeconds: row.elapsedSeconds,
  isCurrentUser: isMe,
});

// GET /api/student/contests/:id/result
const studentContestResult = async (req, res) => {
  try {
    const loaded = await loadVisibleContest(req);
    if (!loaded.contest) return res.status(loaded.status).json({ message: loaded.message });
    const { contest } = loaded;
    const me = idOf(req.studentUser._id);

    const [info, full] = await Promise.all([describeContest(contest), getContestResults(contest)]);
    const row = full.rows.find((r) => r.studentId === me) || null;

    let result = null;
    if (row) {
      const breakdown = await getParticipantBreakdown(contest, me);
      const { email, ...own } = row; // never echo an email back, even the student's own
      result = { ...own, challenges: breakdown.challenges };
    }

    res.status(200).json({
      contest: info,
      phase: full.phase,
      final: full.final,
      rankingRule: full.rankingRule,
      participated: Boolean(row),
      result,
      rankedCount: full.summary.rankedCount,
      participantCount: full.summary.participantCount,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/student/contests/:id/leaderboard?limit=
const studentContestLeaderboard = async (req, res) => {
  try {
    const loaded = await loadVisibleContest(req);
    if (!loaded.contest) return res.status(loaded.status).json({ message: loaded.message });
    const { contest } = loaded;
    const me = idOf(req.studentUser._id);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const full = await getContestResults(contest);
    const ranked = full.rows.filter((r) => r.rank != null);
    const top = ranked.slice(0, limit);
    const mine = full.rows.find((r) => r.studentId === me) || null;

    res.status(200).json({
      contest: { id: contest._id, title: contest.title, phase: full.phase },
      final: full.final,
      rankingRule: full.rankingRule,
      rankedCount: full.summary.rankedCount,
      leaderboard: top.map((r) => publicRow(r, r.studentId === me)),
      // Like the global leaderboard: if you're not in the visible top list,
      // you still get to see your own standing (rank is null if you have no
      // solved game yet).
      currentUser: mine && !top.some((r) => r.studentId === me) ? publicRow(mine, true) : null,
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  MAX_EXPORT_PARTICIPANTS,
  teacherContestResults: teacher.results,
  teacherContestParticipant: teacher.participant,
  teacherContestExport: teacher.exportResults,
  adminContestResults: admin.results,
  adminContestParticipant: admin.participant,
  adminContestExport: admin.exportResults,
  studentContestResult,
  studentContestLeaderboard,
};

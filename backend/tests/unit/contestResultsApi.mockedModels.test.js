// Contest results / leaderboard API tests with MOCKED persistence.
//
// Drives the REAL teacher router, admin router and student router, the REAL
// result controllers and the REAL result service over HTTP (supertest).
// Mongoose models are replaced by in-memory fakes. QuizSession.aggregate is
// backed by a small evaluator for exactly the operators the results pipeline
// uses ($match/$group with $sum $min $max $cond $eq $and $type $ifNull), so
// the REAL pipeline is executed against seeded sessions. That checks the
// pipeline's logic and field names; it is an approximation of MongoDB's
// semantics and NOT a substitute for tests/integration/contestResults.test.js
// (real mongod).

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");

jest.mock("../../src/models/User");
jest.mock("../../src/models/Contest");
jest.mock("../../src/models/Subject");
jest.mock("../../src/models/Chapter");
jest.mock("../../src/models/GameContent");
jest.mock("../../src/models/QuizzSession");
jest.mock("../../src/models/Section");

const User = require("../../src/models/User");
const Contest = require("../../src/models/Contest");
const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const GameContent = require("../../src/models/GameContent");
const QuizSession = require("../../src/models/QuizzSession");
const Section = require("../../src/models/Section");

process.env.JWT_SECRET = "test-secret";
const adminRoutes = require("../../src/routes/adminroutes");
const contestRoutes = require("../../src/routes/contestroutes");
const studentContestRoutes = require("../../src/routes/studentcontestroutes");
const { notFound, globalErrorHandler } = require("../../src/middleware/errorHandler");
const contestExcel = require("../../src/utils/contestExcel");
const { MAX_EXPORT_PARTICIPANTS } = require("../../src/controllers/contestResultControllers");

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/student/contests", studentContestRoutes);
app.use(notFound);
app.use(globalErrorHandler);

const oid = (n) => n.toString(16).padStart(24, "0");
const auth = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` });
const get = (url, who) => request(app).get(url).set(who ? auth(who) : {});

// ---- in-memory fake helpers -----------------------------------------
const valueMatches = (docVal, cond) => {
  if (cond && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond) && "$in" in cond) {
    return cond.$in.map(String).includes(String(docVal));
  }
  return String(docVal) === String(cond);
};
const matches = (doc, filter = {}) => Object.entries(filter).every(([k, v]) => valueMatches(doc[k], v));
const q = (result) => {
  const p = Promise.resolve(result);
  const c = { select: () => c, sort: () => c, limit: () => c, then: (a, b) => p.then(a, b) };
  return c;
};

// ---- mini aggregation evaluator (only what the pipeline uses) ---------
const getPath = (doc, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), doc);
function ev(expr, doc) {
  if (typeof expr === "string" && expr.startsWith("$")) return getPath(doc, expr.slice(1));
  if (expr === null || typeof expr !== "object" || expr instanceof Date) return expr;
  const op = Object.keys(expr)[0];
  const args = expr[op];
  switch (op) {
    case "$cond": return ev(args[0], doc) ? ev(args[1], doc) : ev(args[2], doc);
    case "$eq": { const [a, b] = args.map((x) => ev(x, doc)); return a === b; }
    case "$and": return args.every((a) => ev(a, doc));
    case "$type": { const v = ev(args, doc); return v === undefined ? "missing" : v === null ? "null" : v instanceof Date ? "date" : typeof v; }
    case "$ifNull": { const v = ev(args[0], doc); return v === undefined || v === null ? ev(args[1], doc) : v; }
    default: throw new Error(`mini-evaluator: unsupported operator ${op}`);
  }
}
const num = (v) => (typeof v === "number" ? v : 0);
const ts = (v) => (v instanceof Date ? v.getTime() : v);
function aggregate(pipeline, docs) {
  let rows = docs;
  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((d) => matches(d, stage.$match));
    else if (stage.$group) {
      const { _id: idExpr, ...accs } = stage.$group;
      const groups = new Map();
      for (const d of rows) {
        const key = String(ev(idExpr, d));
        if (!groups.has(key)) groups.set(key, { keyVal: ev(idExpr, d), docs: [] });
        groups.get(key).docs.push(d);
      }
      rows = [...groups.values()].map(({ keyVal, docs: ds }) => {
        const out = { _id: keyVal };
        for (const [field, spec] of Object.entries(accs)) {
          const [op] = Object.keys(spec);
          const vals = ds.map((d) => ev(spec[op], d));
          if (op === "$sum") out[field] = vals.reduce((s, v) => s + num(v), 0);
          else if (op === "$min" || op === "$max") {
            const present = vals.filter((v) => v !== null && v !== undefined);
            out[field] = present.length ? present.reduce((a, b) => ((op === "$min" ? ts(b) < ts(a) : ts(b) > ts(a)) ? b : a)) : null;
          } else throw new Error(`mini-evaluator: unsupported accumulator ${op}`);
        }
        return out;
      });
    } else throw new Error("mini-evaluator: unsupported stage");
  }
  return rows;
}

// ---- fixtures -------------------------------------------------------
const min = (m) => new Date(START.getTime() + m * 60 * 1000);
let START;
const OWNER = oid(900), OTHER = oid(901), ADMIN = oid(902), GUEST = oid(903), S7 = oid(904);
const SA = oid(1), SB = oid(2), SC = oid(3), SD = oid(4), SE = oid(5), SF = oid(6), SG = oid(7), SH = oid(8), SX = oid(9);
const SUBJ = oid(20), CH = oid(21);
const G1 = oid(31), G2 = oid(32), G3 = oid(33);
const C1 = oid(400), C_OTHER = oid(401);
let users, contests, sessions, games, sections;

// One contest session, as the existing game flow would have persisted it.
const sess = (user, game, o = {}) => {
  const { solved = false, correct, total, xp = 0, startM = 1, endM = null, attempts = 1, contest = C1, payload } = o;
  const completed = endM !== null;
  return {
    _id: oid(1000 + sessions.length), user_id: user, content_id: game, contest_id: contest, session_type: "game-session",
    started_at: min(startM), ...(completed ? { completed_at: min(endM) } : {}),
    xp_awarded: xp, attempt_count: attempts,
    game_payload: payload || (completed || correct !== undefined ? { is_correct: solved, correct_count: correct ?? (solved ? 1 : 0), total_count: total ?? 1 } : undefined),
  };
};

const seedScenario = () => {
  sessions = [];
  const add = (...s) => sessions.push(...s);
  // A: solved all 3, last solve at +30
  add(sess(SA, G1, { solved: true, xp: 30, endM: 10 }), sess(SA, G2, { solved: true, xp: 30, endM: 20 }), sess(SA, G3, { solved: true, xp: 30, endM: 30 }));
  // B: solved all 3, but faster (+20)  -> outranks A
  add(sess(SB, G1, { solved: true, xp: 30, endM: 5 }), sess(SB, G2, { solved: true, xp: 30, endM: 12 }), sess(SB, G3, { solved: true, xp: 30, endM: 20 }));
  // C and D: identical 2 solved, same finish time -> tie
  add(sess(SC, G1, { solved: true, xp: 30, endM: 8 }), sess(SC, G2, { solved: true, xp: 30, endM: 15 }));
  add(sess(SD, G1, { solved: true, xp: 30, endM: 9 }), sess(SD, G2, { solved: true, xp: 30, endM: 15 }));
  // E: 1 solved, XP 0 because of the existing daily cap
  add(sess(SE, G1, { solved: true, xp: 0, endM: 7 }));
  // F: completed one game WRONG -> not ranked, PARTIAL
  add(sess(SF, G1, { solved: false, xp: 0, endM: 6 }));
  // G: started, never finished -> IN_PROGRESS
  add(sess(SG, G1, { startM: 4, payload: { is_correct: true, correct_count: 1, total_count: 1 } })); // stale attempt data on an UNFINISHED session must not count
  // H: finished all 3 but every one wrong -> not ranked, COMPLETED
  add(sess(SH, G1, { endM: 3 }), sess(SH, G2, { endM: 4 }), sess(SH, G3, { endM: 5 }));
  // X: solved G1+G2 and got 3/5 on the multi-question G3 -> 2 solved but 5 correct answers, beats C/D on answers
  add(sess(SX, G1, { solved: true, xp: 30, endM: 6 }), sess(SX, G2, { solved: true, xp: 30, endM: 40 }), sess(SX, G3, { solved: false, correct: 3, total: 5, xp: 10, endM: 45 }));
  // noise that must NEVER count: same students practising the same games (no contest_id), and another contest
  add(
    { ...sess(SE, G2, { solved: true, xp: 30, endM: 2 }), contest_id: undefined },
    { ...sess(SE, G3, { solved: true, xp: 30, endM: 2 }), contest_id: undefined },
    sess(SE, G2, { solved: true, xp: 30, endM: 2, contest: C_OTHER }),
  );
};

const mkContest = (id, over = {}) => ({
  _id: id, title: "Weekly Fractions Blitz", description: "d", teacher_id: OWNER, grade: 6, subject_id: SUBJ, chapter_id: CH,
  challenges: [{ game_content_id: G1 }, { game_content_id: G2 }, { game_content_id: G3 }],
  start_at: START, end_at: new Date(START.getTime() + 24 * 3600 * 1000), status: "PUBLISHED", ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  START = new Date(Date.now() - 2 * 3600 * 1000); // contest started 2h ago and is ACTIVE
  const stu = (id, name, grade = 6, extra = {}) => ({ _id: id, name, email: `${name.toLowerCase()}@x.com`, role: "student", grade, is_guest: false, ...extra });
  users = [
    stu(SA, "Ann"), stu(SB, "Ben"), stu(SC, "Cat"), stu(SD, "Dan"), stu(SE, "Eve"), stu(SF, "Fay"), stu(SG, "Gus"), stu(SH, "Hal"), stu(SX, "Xia"),
    stu(S7, "Sev", 7),
    { _id: OWNER, name: "Tina Teacher", role: "teacher", status: "active" },
    { _id: OTHER, name: "Omar Other", role: "teacher", status: "active" },
    { _id: ADMIN, name: "Ada Admin", role: "admin" },
    { _id: GUEST, name: "Guest", role: "student", grade: 6, is_guest: true },
  ];
  contests = [mkContest(C1)];
  games = [
    { _id: G1, title: "Build 1/2", game_type: "MATH_FRACTION_BUILDER" },
    { _id: G2, title: "Match it", game_type: "MATH_FRACTION_MATCH" },
    { _id: G3, title: "Speed round", game_type: "MATH_FRACTION_SPEED_CHALLENGE" },
  ];
  // OWNER teaches Ann, Ben, Xia — NOT Cat, Dan, ...
  sections = [{ teacher_id: OWNER, student_ids: [SA, SB, SX] }];
  seedScenario();

  User.findById.mockImplementation((id) => q(users.find((u) => String(u._id) === String(id)) || null));
  User.find.mockImplementation((f) => q(users.filter((u) => matches(u, f))));
  Contest.findById.mockImplementation((id) => q(contests.find((c) => String(c._id) === String(id)) || null));
  Subject.findById.mockImplementation(() => q({ _id: SUBJ, name: "Mathematics" }));
  Chapter.findById.mockImplementation(() => q({ _id: CH, title: "Fractions" }));
  GameContent.find.mockImplementation((f) => q(games.filter((g) => matches(g, f))));
  Section.find.mockImplementation((f) => q(sections.filter((s) => matches(s, f))));
  QuizSession.aggregate.mockImplementation(async (pipeline) => aggregate(pipeline, sessions));
  QuizSession.find.mockImplementation((f) => q(sessions.filter((s) => matches(s, f))));
});
afterEach(() => console.error.mockRestore?.());

const T = `/api/contests/${C1}/results`;
const A = `/api/admin/contests/${C1}/results`;
const rowOf = (body, id) => body.rows.find((r) => r.studentId === id);

// =====================================================================
describe("result calculation (real pipeline, real ranking)", () => {
  test("ranks exactly as documented: solved, then correct answers, then finish time; ties share a rank", async () => {
    const res = await get(T, OWNER);
    expect(res.status).toBe(200);
    const order = res.body.rows.map((r) => [r.name, r.rank]);
    expect(order).toEqual([
      ["Ben", 1],   // 3 solved, finished +20
      ["Ann", 2],   // 3 solved, finished +30
      ["Xia", 3],   // 2 solved, 5 correct answers (partial credit on the multi-question game)
      ["Cat", 4],   // 2 solved, 2 correct, +15   -- tied with Dan
      ["Dan", 4],   // same numbers, same finish
      ["Eve", 6],   // 1 solved (0 XP because of the daily cap — still ranked)
      ["Hal", null], // finished all 3 but all wrong -> not ranked
      ["Fay", null], // finished 1, wrong
      ["Gus", null], // started only
    ]);
  });

  test("computes per-student metrics from the persisted sessions", async () => {
    const { body } = await get(T, OWNER);
    expect(rowOf(body, SA)).toMatchObject({
      status: "COMPLETED", challengesCompleted: 3, challengesSolved: 3, correctAnswers: 3, totalAnswers: 3,
      accuracy: 100, completionPercent: 100, xpEarned: 90, elapsedSeconds: 30 * 60, attempts: 3,
    });
    expect(rowOf(body, SX)).toMatchObject({ challengesSolved: 2, correctAnswers: 5, totalAnswers: 7, accuracy: 71.4, xpEarned: 70, status: "COMPLETED",
      elapsedSeconds: 40 * 60, // last SOLVED game (+40), not her later wrong game (+45)
    });
    expect(rowOf(body, SH)).toMatchObject({ status: "COMPLETED", challengesSolved: 0, rank: null, accuracy: 0 });
    expect(rowOf(body, SF)).toMatchObject({ status: "PARTIAL", challengesCompleted: 1, completionPercent: 33 });
  });

  test("a student who only STARTED is IN_PROGRESS and their unfinished attempt data is not scored", async () => {
    const g = rowOf((await get(T, OWNER)).body, SG);
    expect(g).toMatchObject({ status: "IN_PROGRESS", challengesStarted: 1, challengesCompleted: 0, challengesSolved: 0, correctAnswers: 0, xpEarned: 0, rank: null, elapsedSeconds: null });
  });

  test("XP is exactly what the existing flow stored — zero (daily cap) stays zero and still ranks", async () => {
    const e = rowOf((await get(T, OWNER)).body, SE);
    expect(e.xpEarned).toBe(0);
    expect(e.rank).toBe(6);
  });

  test("normal practice sessions (no contest_id) and other contests' sessions never count", async () => {
    const e = rowOf((await get(T, OWNER)).body, SE);
    expect(e.challengesStarted).toBe(1); // only the ONE contest session, not the two practice runs or the other-contest run
    expect(e.challengesSolved).toBe(1);
  });

  test("summary counts", async () => {
    const { body } = await get(T, OWNER);
    expect(body.summary).toEqual({ challengeCount: 3, participantCount: 9, completedCount: 4, partialCount: 4, inProgressCount: 1, rankedCount: 6 });
  });

  test("client-controlled junk inside game_payload is never read as a score", async () => {
    const mine = sessions.find((s) => s.user_id === SE && String(s.contest_id) === C1);
    mine.game_payload = { is_correct: true, correct_count: 1, total_count: 1, score: 99999, rank: 1, xp: 99999, finalScore: 99999 };
    const e = rowOf((await get(T, OWNER)).body, SE);
    expect(e).toMatchObject({ correctAnswers: 1, totalAnswers: 1, xpEarned: 0, rank: 6 });
  });

  test("the outcome is identical whatever order the sessions come back in", async () => {
    const a = await get(T, OWNER);
    sessions.reverse();
    const b = await get(T, OWNER);
    expect(b.body.rows).toEqual(a.body.rows);
  });

  test("deleted GameContent: sessions still count and titles degrade gracefully", async () => {
    games = games.filter((g) => g._id !== G3);
    const res = await get(T, OWNER);
    expect(res.status).toBe(200);
    expect(rowOf(res.body, SA).challengesSolved).toBe(3);
    expect(res.body.contest.challenges.map((c) => c.title)).toEqual(["Build 1/2", "Match it", "Removed content"]);
    const detail = await get(`${T}/${SA}`, OWNER);
    expect(detail.body.challenges[2]).toMatchObject({ title: "Removed content", status: "COMPLETED", isCorrect: true });
  });

  test("a stray session for content that isn't in the contest is ignored", async () => {
    sessions.push(sess(SE, oid(999), { solved: true, xp: 30, endM: 1 }));
    const e = rowOf((await get(T, OWNER)).body, SE);
    expect(e.challengesSolved).toBe(1);
  });
});

describe("edge cases", () => {
  test("zero participants -> a clean empty result, not an error", async () => {
    sessions = [];
    const res = await get(T, OWNER);
    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.totalPages).toBe(0);
    expect(res.body.summary).toEqual({ challengeCount: 3, participantCount: 0, completedCount: 0, partialCount: 0, inProgressCount: 0, rankedCount: 0 });
  });

  test("participants but nobody completed anything -> nobody is ranked", async () => {
    sessions = [sess(SA, G1, { startM: 3 }), sess(SB, G2, { startM: 4 })];
    const res = await get(T, OWNER);
    expect(res.body.rows.every((r) => r.rank === null)).toBe(true);
    expect(res.body.summary).toMatchObject({ participantCount: 2, inProgressCount: 2, rankedCount: 0 });
    const lb = await get(`/api/student/contests/${C1}/leaderboard`, SA);
    expect(lb.body.leaderboard).toEqual([]);
    expect(lb.body.rankedCount).toBe(0);
  });

  test("an UPCOMING contest has no results yet but is not an error", async () => {
    contests = [mkContest(C1, { start_at: new Date(Date.now() + 3600e3), end_at: new Date(Date.now() + 7200e3) })];
    sessions = [];
    const res = await get(T, OWNER);
    expect(res.status).toBe(200);
    expect(res.body.phase).toBe("UPCOMING");
    expect(res.body.rows).toEqual([]);
    expect(res.body.final).toBe(false);
  });

  test("an ENDED contest is marked final; an active one is not", async () => {
    expect((await get(T, OWNER)).body.final).toBe(false);
    contests = [mkContest(C1, { start_at: new Date(Date.now() - 5 * 3600e3), end_at: new Date(Date.now() - 3600e3) })];
    const res = await get(T, OWNER);
    expect(res.body).toMatchObject({ phase: "ENDED", final: true });
  });

  test("a deleted student still appears (as 'Deleted user') instead of crashing", async () => {
    users = users.filter((u) => u._id !== SE);
    const res = await get(T, OWNER);
    expect(rowOf(res.body, SE).name).toBe("Deleted user");
    expect(rowOf(res.body, SE).email).toBeNull();
  });

  test("pagination slices the ranked list", async () => {
    const p1 = await get(`${T}?limit=4&page=1`, OWNER);
    const p3 = await get(`${T}?limit=4&page=3`, OWNER);
    expect(p1.body).toMatchObject({ page: 1, limit: 4, total: 9, totalPages: 3 });
    expect(p1.body.rows.map((r) => r.name)).toEqual(["Ben", "Ann", "Xia", "Cat"]);
    expect(p3.body.rows.map((r) => r.name)).toEqual(["Gus"]);
    expect((await get(`${T}?limit=99999`, OWNER)).body.limit).toBe(100);
  });
});

// =====================================================================
describe("authorization — teacher", () => {
  test("unauthenticated -> 401", async () => {
    expect((await get(T)).status).toBe(401);
    expect((await get(`${T}/${SA}`)).status).toBe(401);
  });

  test("students (and guests) are refused", async () => {
    expect((await get(T, SA)).status).toBe(403);
    expect((await get(`${T}/${SA}`, SA)).status).toBe(403);
    expect((await get(T, GUEST)).status).toBe(403);
  });

  test("the owning teacher can read their contest's results", async () => {
    expect((await get(T, OWNER)).status).toBe(200);
  });

  test("ANOTHER teacher cannot read them — indistinguishable from a missing contest (404)", async () => {
    expect((await get(T, OTHER)).status).toBe(404);
    expect((await get(`${T}/${SA}`, OTHER)).status).toBe(404);
    expect((await get(T, OTHER)).body).toEqual({ message: "Contest not found" });
  });

  test("a teacher cannot use the admin endpoints", async () => {
    expect((await get(A, OWNER)).status).toBe(403);
    expect((await get(`${A}/${SA}`, OWNER)).status).toBe(403);
  });

  test.each([["DRAFT"], ["PENDING_APPROVAL"], ["REJECTED"]])("a %s contest exposes no results, even to its owner (409)", async (status) => {
    contests = [mkContest(C1, { status })];
    const res = await get(T, OWNER);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONTEST_NOT_PUBLISHED");
    expect(res.body.rows).toBeUndefined();
    expect((await get(`${T}/${SA}`, OWNER)).status).toBe(409);
  });

  test("invalid / unknown ids are handled safely", async () => {
    expect((await get("/api/contests/nope/results", OWNER)).status).toBe(400);
    expect((await get(`/api/contests/${oid(4242)}/results`, OWNER)).status).toBe(404);
    expect((await get(`${T}/not-an-id`, OWNER)).status).toBe(400);
    expect((await get(`${T}/${oid(4242)}`, OWNER)).status).toBe(404); // valid id, never took part
    expect((await get(`/api/contests/%7B%24ne%3Anull%7D/results`, OWNER)).status).toBe(400);
  });

  test("email is shown only for students in the teacher's own sections (existing dashboard boundary)", async () => {
    const { body } = await get(T, OWNER);
    expect(rowOf(body, SA).email).toBe("ann@x.com"); // in OWNER's section
    expect(rowOf(body, SX).email).toBe("xia@x.com");
    expect(rowOf(body, SC).email).toBeNull(); // not in OWNER's section — name still shown
    expect(rowOf(body, SC).name).toBe("Cat");
  });

  test("participant detail: per-challenge breakdown in contest order", async () => {
    const res = await get(`${T}/${SX}`, OWNER);
    expect(res.status).toBe(200);
    expect(res.body.row).toMatchObject({ studentId: SX, rank: 3, challengesSolved: 2 });
    expect(res.body.challenges).toEqual([
      expect.objectContaining({ id: G1, title: "Build 1/2", status: "COMPLETED", isCorrect: true, xpAwarded: 30 }),
      expect.objectContaining({ id: G2, status: "COMPLETED", isCorrect: true }),
      expect.objectContaining({ id: G3, label: "Fraction Speed Challenge", status: "COMPLETED", isCorrect: false, correctAnswers: 3, totalAnswers: 5, xpAwarded: 10 }),
    ]);
  });

  test("participant detail for a student who only started shows NOT_STARTED / IN_PROGRESS rows", async () => {
    const res = await get(`${T}/${SG}`, OWNER);
    expect(res.body.challenges.map((c) => c.status)).toEqual(["IN_PROGRESS", "NOT_STARTED", "NOT_STARTED"]);
    expect(res.body.challenges[0]).toMatchObject({ isCorrect: null, xpAwarded: null });
  });
});

describe("authorization — admin", () => {
  test("unauthenticated -> 401; students refused", async () => {
    expect((await get(A)).status).toBe(401);
    expect((await get(A, SA)).status).toBe(403);
    expect((await get(A, GUEST)).status).toBe(403);
  });

  test("an admin can open ANY published contest's results, with everyone's email, and inspect a row", async () => {
    contests = [mkContest(C1, { teacher_id: OTHER })];
    const res = await get(A, ADMIN);
    expect(res.status).toBe(200);
    expect(rowOf(res.body, SC).email).toBe("cat@x.com");
    expect(res.body.summary.participantCount).toBe(9);
    const detail = await get(`${A}/${SC}`, ADMIN);
    expect(detail.status).toBe(200);
    expect(detail.body.challenges).toHaveLength(3);
  });

  test("admin sees the same ranking as the teacher", async () => {
    const t = await get(T, OWNER);
    const a = await get(A, ADMIN);
    expect(a.body.rows.map((r) => [r.studentId, r.rank])).toEqual(t.body.rows.map((r) => [r.studentId, r.rank]));
  });

  test("DRAFT is private (404); PENDING/REJECTED have no results (409); bad ids handled", async () => {
    contests = [mkContest(C1, { status: "DRAFT" })];
    expect((await get(A, ADMIN)).status).toBe(404);
    contests = [mkContest(C1, { status: "PENDING_APPROVAL" })];
    expect((await get(A, ADMIN)).status).toBe(409);
    contests = [mkContest(C1, { status: "REJECTED" })];
    expect((await get(A, ADMIN)).status).toBe(409);
    contests = [mkContest(C1)];
    expect((await get("/api/admin/contests/zzz/results", ADMIN)).status).toBe(400);
    expect((await get(`/api/admin/contests/${oid(4242)}/results`, ADMIN)).status).toBe(404);
    expect((await get(`${A}/${oid(4242)}`, ADMIN)).status).toBe(404); // published, but this student never took part
    expect((await get(`${A}/nope`, ADMIN)).status).toBe(400);
  });
});

// =====================================================================
describe("student result + leaderboard", () => {
  const R = `/api/student/contests/${C1}/result`;
  const L = `/api/student/contests/${C1}/leaderboard`;

  test("unauthenticated -> 401; teachers/admins/guests refused", async () => {
    expect((await get(R)).status).toBe(401);
    expect((await get(L)).status).toBe(401);
    for (const who of [OWNER, ADMIN, GUEST]) {
      expect((await get(R, who)).status).toBe(403);
      expect((await get(L, who)).status).toBe(403);
    }
  });

  test("a student sees their OWN full result with rank, XP, times and per-game breakdown", async () => {
    const res = await get(R, SA);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      participated: true, phase: "ACTIVE", final: false, rankedCount: 6, participantCount: 9,
      contest: { title: "Weekly Fractions Blitz", grade: 6, subject: "Mathematics", chapterTitle: "Fractions" },
    });
    expect(res.body.result).toMatchObject({
      studentId: SA, rank: 2, status: "COMPLETED", challengesSolved: 3, correctAnswers: 3, totalAnswers: 3,
      accuracy: 100, completionPercent: 100, xpEarned: 90, elapsedSeconds: 1800,
    });
    expect(res.body.result.challenges).toHaveLength(3);
    expect(res.body.rankingRule.key).toBe("SOLVED_THEN_ANSWERS_THEN_TIME");
  });

  test("the student's own result never echoes an email", async () => {
    expect(JSON.stringify((await get(R, SA)).body)).not.toContain("@x.com");
  });

  test("a student who hasn't taken part gets participated:false and no result, not an error", async () => {
    users.push({ _id: oid(50), name: "Newbie", email: "n@x.com", role: "student", grade: 6, is_guest: false });
    const res = await get(R, oid(50));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ participated: false, result: null, rankedCount: 6, participantCount: 9 });
  });

  test("an unranked participant sees their result with rank null", async () => {
    const res = await get(R, SG);
    expect(res.body.result).toMatchObject({ status: "IN_PROGRESS", rank: null });
  });

  test("other-grade / unpublished contests are a plain 404 for students", async () => {
    expect((await get(R, S7)).status).toBe(404);
    expect((await get(L, S7)).status).toBe(404);
    for (const status of ["DRAFT", "PENDING_APPROVAL", "REJECTED"]) {
      contests = [mkContest(C1, { status })];
      expect((await get(R, SA)).status).toBe(404);
      expect((await get(L, SA)).status).toBe(404);
    }
    expect((await get("/api/student/contests/nope/result", SA)).status).toBe(400);
    expect((await get(`/api/student/contests/${oid(4242)}/leaderboard`, SA)).status).toBe(404);
  });

  test("the leaderboard lists only ranked students, in order, with PUBLIC fields only", async () => {
    const res = await get(L, SA);
    expect(res.status).toBe(200);
    expect(res.body.leaderboard.map((r) => [r.rank, r.name])).toEqual([[1, "Ben"], [2, "Ann"], [3, "Xia"], [4, "Cat"], [4, "Dan"], [6, "Eve"]]);
    expect(res.body.leaderboard.find((r) => r.name === "Ann").isCurrentUser).toBe(true);
    expect(res.body.leaderboard.find((r) => r.name === "Ben").isCurrentUser).toBe(false);
    expect(Object.keys(res.body.leaderboard[0]).sort()).toEqual(
      ["accuracy", "challengesCompleted", "challengesSolved", "correctAnswers", "elapsedSeconds", "isCurrentUser", "name", "rank", "totalAnswers"],
    );
    const text = JSON.stringify(res.body);
    for (const leak of ["@x.com", "email", "studentId", "xpEarned", "attempts", "correct_piece_ids"]) expect(text).not.toContain(leak);
    expect(res.body.currentUser).toBeNull(); // already in the list
  });

  test("a student outside the visible top list still sees their own standing", async () => {
    const res = await get(`${L}?limit=2`, SE);
    expect(res.body.leaderboard).toHaveLength(2);
    expect(res.body.currentUser).toMatchObject({ rank: 6, name: "Eve", isCurrentUser: true });
    const unranked = await get(`${L}?limit=2`, SG);
    expect(unranked.body.currentUser).toMatchObject({ rank: null, name: "Gus", isCurrentUser: true });
  });

  test("an upcoming contest has an empty leaderboard; an ended one is final", async () => {
    contests = [mkContest(C1, { start_at: new Date(Date.now() + 3600e3), end_at: new Date(Date.now() + 7200e3) })];
    sessions = [];
    const up = await get(L, SA);
    expect(up.body).toMatchObject({ leaderboard: [], rankedCount: 0, final: false });
    contests = [mkContest(C1, { start_at: new Date(Date.now() - 5 * 3600e3), end_at: new Date(Date.now() - 3600e3) })];
    seedScenario();
    expect((await get(L, SA)).body.final).toBe(true);
  });

  test("students cannot reach the teacher/admin result endpoints", async () => {
    expect((await get(T, SA)).status).toBe(403);
    expect((await get(A, SA)).status).toBe(403);
    expect((await get(`${T}/${SB}`, SA)).status).toBe(403);
  });
});

describe("nothing a client sends can influence a result", () => {
  test("score / rank / xp / sort query parameters are ignored", async () => {
    const plain = await get(T, OWNER);
    const forged = await get(`${T}?rank=1&score=99999&xp=99999&sort=xp&order=asc&status=PUBLISHED&studentId=${SH}&correct=999`, OWNER);
    expect(forged.body.rows).toEqual(plain.body.rows);
    const lb = await get(`/api/student/contests/${C1}/leaderboard?rank=1&score=999&userId=${SE}`, SA);
    expect(lb.body.leaderboard.map((r) => r.name)).toEqual(["Ben", "Ann", "Xia", "Cat", "Dan", "Eve"]);
  });

  test("result endpoints are read-only: writes are not routed", async () => {
    for (const [method, url] of [
      ["post", T], ["put", T], ["patch", T], ["delete", T],
      ["post", `${A}`], ["put", `${A}/${SA}`],
      ["post", `/api/student/contests/${C1}/result`], ["put", `/api/student/contests/${C1}/leaderboard`],
    ]) {
      const who = url.startsWith("/api/admin") ? ADMIN : url.startsWith("/api/student") ? SA : OWNER;
      const res = await request(app)[method](url).set(auth(who)).send({ rank: 1, score: 999, xp: 999, challengesSolved: 99 });
      expect(res.status).toBe(404);
    }
    expect(rowOf((await get(T, OWNER)).body, SH).challengesSolved).toBe(0);
  });

  test("nothing is written by any result request", async () => {
    await get(T, OWNER); await get(A, ADMIN); await get(`/api/student/contests/${C1}/result`, SA); await get(`/api/student/contests/${C1}/leaderboard`, SA);
    expect(QuizSession.create).not.toHaveBeenCalled();
    expect(Contest.findOneAndUpdate).not.toHaveBeenCalled();
  });
});


// =====================================================================
// Excel export of contest results
// =====================================================================
const binary = (res, cb) => {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};
const getXlsx = async (url, who) => {
  const res = await request(app).get(url).set(who ? auth(who) : {}).buffer(true).parse(binary);
  let workbook = null;
  if (res.status === 200) {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
  }
  return { res, workbook };
};
const errorBody = (res) => JSON.parse(res.body.toString());
const sheetRows = (wb, name) => {
  const out = [];
  wb.getWorksheet(name).eachRow((r, i) => { if (i > 1) out.push(r.values.slice(1)); });
  return out;
};
const summaryOf = (wb) => {
  const m = {};
  wb.getWorksheet("Contest Summary").eachRow((r, i) => { if (i > 1) m[r.getCell(1).value] = r.getCell(2).value; });
  return m;
};
const allStrings = (wb) => {
  const out = [];
  wb.eachSheet((sheet) => sheet.eachRow((r) => r.eachCell((c) => out.push(String(c.value)))));
  return out.join("\n");
};
const X = `/api/contests/${C1}/results/export`;
const XA = `/api/admin/contests/${C1}/results/export`;
// Results-sheet column positions (1-based, as in row.values.slice(1) => 0-based here)
const COL = { rank: 0, name: 1, id: 2, email: 3, status: 4, solved: 8, correct: 9, total: 10, xp: 13, elapsed: 18 };

describe("export — response", () => {
  test("returns a real .xlsx with the right content type, a safe filename and no-store", async () => {
    const { res, workbook } = await getXlsx(X, OWNER);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.headers["content-disposition"]).toBe(
      `attachment; filename="Learnova_Contest_Weekly_Fractions_Blitz_Results.xlsx"; filename*=UTF-8''Learnova_Contest_Weekly_Fractions_Blitz_Results.xlsx`,
    );
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["access-control-expose-headers"]).toBe("Content-Disposition");
    expect(Number(res.headers["content-length"])).toBe(res.body.length);
    expect(res.body.subarray(0, 2).toString()).toBe("PK");
    expect(workbook.worksheets.map((w) => w.name)).toEqual(["Contest Summary", "Results", "Challenge Details"]);
  });

  test("the filename never contains a database id", async () => {
    const { res } = await getXlsx(X, OWNER);
    expect(res.headers["content-disposition"]).not.toContain(C1);
  });

  test("special characters in the contest name produce a safe download name", async () => {
    contests = [mkContest(C1, { title: 'Maths: "Fractions" <1/2> | a\\b? *final* %20 #1' })];
    const { res } = await getXlsx(X, OWNER);
    expect(res.status).toBe(200);
    const filename = res.headers["content-disposition"].match(/filename="([^"]+)"/)[1];
    expect(filename).not.toMatch(/[\\/:*?"<>|%#]/);
    expect(filename).toMatch(/^Learnova_Contest_.+_Results\.xlsx$/);
  });

  test("a CR/LF in the title cannot inject a header", async () => {
    contests = [mkContest(C1, { title: "Evil\r\nSet-Cookie: pwned=1" })];
    const { res } = await getXlsx(X, OWNER);
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(res.headers["content-disposition"]).not.toMatch(/[\r\n]/);
  });

  test("a non-ASCII (Tamil) title downloads with a readable UTF-8 filename", async () => {
    contests = [mkContest(C1, { title: "பின்னங்கள் போட்டி" })];
    const { res } = await getXlsx(X, OWNER);
    expect(res.status).toBe(200);
    const header = res.headers["content-disposition"];
    expect(decodeURIComponent(header.split("filename*=UTF-8''")[1])).toBe("Learnova_Contest_பின்னங்கள்_போட்டி_Results.xlsx");
    expect(header).toMatch(/^attachment; filename="[\x20-\x7e]+"/);
  });
});

describe("export — the SAME results as the Results API", () => {
  test("every participant, every ranking value and every count equals the JSON results (complete set, rank order)", async () => {
    const api = (await get(`${T}?limit=100`, OWNER)).body;
    const { workbook } = await getXlsx(X, OWNER);
    const rows = sheetRows(workbook, "Results");
    expect(rows).toHaveLength(api.total);
    expect(rows).toHaveLength(9);
    api.rows.forEach((r, i) => {
      expect(rows[i][COL.id]).toBe(r.studentId);
      expect(rows[i][COL.name]).toBe(r.name);
      expect(rows[i][COL.rank] ?? null).toBe(r.rank);
      expect(rows[i][COL.solved]).toBe(r.challengesSolved);
      expect(rows[i][COL.correct]).toBe(r.correctAnswers);
      expect(rows[i][COL.total]).toBe(r.totalAnswers);
      expect(rows[i][COL.xp]).toBe(r.xpEarned);
    });
    // the documented ordering, including the shared rank
    expect(rows.map((r) => [r[COL.name], r[COL.rank] ?? null])).toEqual([
      ["Ben", 1], ["Ann", 2], ["Xia", 3], ["Cat", 4], ["Dan", 4], ["Eve", 6], ["Hal", null], ["Fay", null], ["Gus", null],
    ]);
    const m = summaryOf(workbook);
    expect(m).toMatchObject({
      "Contest Name": "Weekly Fractions Blitz", Grade: 6, Subject: "Mathematics", Chapter: "Fractions", Teacher: "Tina Teacher",
      "Total Participants": api.summary.participantCount, "Completed All Games": api.summary.completedCount,
      "Partially Completed": api.summary.partialCount, "Started (none finished)": api.summary.inProgressCount, "Ranked Participants": api.summary.rankedCount,
      "Ranking Rule": api.rankingRule.summary, "Contest Phase": "Live (in progress)", "Results Status": "Live - standings can still change",
    });
  });

  test("it is the FULL set even when paging parameters are supplied", async () => {
    const { workbook } = await getXlsx(`${X}?page=2&limit=1`, OWNER);
    expect(sheetRows(workbook, "Results")).toHaveLength(9);
    expect(sheetRows(workbook, "Challenge Details")).toHaveLength(27);
  });

  test("metrics match the persisted sessions (solved, answers, XP incl. the daily-cap zero, finish time)", async () => {
    const { workbook } = await getXlsx(X, OWNER);
    const byName = (n) => sheetRows(workbook, "Results").find((r) => r[COL.name] === n);
    expect(byName("Ann").slice(COL.status, COL.status + 1)).toEqual(["Completed all"]);
    expect(byName("Ann")[COL.xp]).toBe(90);
    expect(byName("Xia")[COL.solved]).toBe(2);
    expect(byName("Xia")[COL.correct]).toBe(5);
    expect(byName("Xia")[COL.total]).toBe(7);
    expect(byName("Eve")[COL.xp]).toBe(0);
    expect(byName("Eve")[COL.rank]).toBe(6);
    const secs = (v) => (v instanceof Date ? Math.round((v.getTime() - Date.UTC(1899, 11, 30)) / 1000) : Math.round(v * 86400));
    expect(secs(byName("Xia")[COL.elapsed])).toBe(40 * 60); // last SOLVED game, not her later wrong one
  });

  test("incomplete participants: started-only has no rank/time; wrong-only is listed unranked", async () => {
    const { workbook } = await getXlsx(X, OWNER);
    const byName = (n) => sheetRows(workbook, "Results").find((r) => r[COL.name] === n);
    expect(byName("Gus")[COL.status]).toBe("Started");
    expect(byName("Gus")[COL.rank] == null && byName("Gus")[COL.elapsed] == null).toBe(true);
    expect(byName("Fay")[COL.status]).toBe("Partly done");
    expect(byName("Hal")[COL.status]).toBe("Completed all");
    expect(byName("Hal")[COL.rank] == null).toBe(true);
  });

  test("practice sessions and other contests' sessions are not in the file", async () => {
    const { workbook } = await getXlsx(X, OWNER);
    const eve = sheetRows(workbook, "Results").find((r) => r[COL.name] === "Eve");
    expect(eve[6]).toBe(1); // "Started" = only the one contest session
    const eveDetail = sheetRows(workbook, "Challenge Details").filter((r) => r[0] === "Eve");
    expect(eveDetail.map((r) => r[5])).toEqual(["Completed", "Not started", "Not started"]);
  });

  test("Challenge Details: one row per participant per game, with per-game correct/total/XP/attempts", async () => {
    const { workbook } = await getXlsx(X, OWNER);
    const rows = sheetRows(workbook, "Challenge Details");
    expect(rows).toHaveLength(9 * 3);
    const xiaSpeed = rows.find((r) => r[0] === "Xia" && r[3] === "Speed round");
    expect(xiaSpeed[5]).toBe("Completed");
    expect(xiaSpeed[6]).toBe("No");
    expect(xiaSpeed.slice(7, 11)).toEqual([3, 5, 60, 10]);
    expect(xiaSpeed[4]).toBe("Fraction Speed Challenge");
    const gusFirst = rows.find((r) => r[0] === "Gus" && r[3] === "Build 1/2");
    expect(gusFirst[5]).toBe("In progress");
  });

  test("a deleted game and a deleted student degrade gracefully", async () => {
    games = games.filter((g) => g._id !== G3);
    users = users.filter((u) => u._id !== SE);
    const { res, workbook } = await getXlsx(X, OWNER);
    expect(res.status).toBe(200);
    const detail = sheetRows(workbook, "Challenge Details");
    expect(detail.some((r) => r[3] === "Removed content")).toBe(true);
    expect(sheetRows(workbook, "Results").find((r) => r[COL.id] === SE)[COL.name]).toBe("Deleted user");
    expect(sheetRows(workbook, "Results").find((r) => r[COL.id] === SA)[COL.solved]).toBe(3); // sessions still count
  });
});

describe("export — empty and phase cases", () => {
  test("a contest with no participants still exports a valid workbook", async () => {
    sessions = [];
    const { res, workbook } = await getXlsx(X, OWNER);
    expect(res.status).toBe(200);
    expect(workbook.worksheets.map((w) => w.name)).toEqual(["Contest Summary", "Results", "Challenge Details"]);
    expect(sheetRows(workbook, "Results")).toEqual([]);
    expect(sheetRows(workbook, "Challenge Details")).toEqual([]);
    expect(summaryOf(workbook)).toMatchObject({ "Total Participants": 0, "Ranked Participants": 0, "Games in Contest": 3 });
  });

  test("nobody ranked: every rank cell is blank", async () => {
    sessions = [sess(SA, G1, { startM: 3 }), sess(SB, G2, { startM: 4 })];
    const { workbook } = await getXlsx(X, OWNER);
    expect(sheetRows(workbook, "Results").every((r) => r[COL.rank] == null)).toBe(true);
    expect(summaryOf(workbook)["Ranked Participants"]).toBe(0);
  });

  test("live vs ended vs upcoming are labelled in the summary", async () => {
    expect(summaryOf((await getXlsx(X, OWNER)).workbook)).toMatchObject({ "Contest Phase": "Live (in progress)", "Results Status": "Live - standings can still change" });
    contests = [mkContest(C1, { start_at: new Date(Date.now() - 5 * 3600e3), end_at: new Date(Date.now() - 3600e3) })];
    expect(summaryOf((await getXlsx(X, OWNER)).workbook)).toMatchObject({ "Contest Phase": "Ended", "Results Status": "Final" });
    contests = [mkContest(C1, { start_at: new Date(Date.now() + 3600e3), end_at: new Date(Date.now() + 7200e3) })];
    sessions = [];
    expect(summaryOf((await getXlsx(X, OWNER)).workbook)).toMatchObject({ "Contest Phase": "Upcoming", "Results Status": "Not started yet" });
  });

  test("dates are written as UTC date cells matching the contest window", async () => {
    const { workbook } = await getXlsx(X, OWNER);
    const m = summaryOf(workbook);
    expect(m["Start (UTC)"]).toEqual(START);
    expect(m["End (UTC)"]).toEqual(contests[0].end_at);
    expect(m["Time Zone Note"]).toMatch(/UTC/);
  });
});

describe("export — authorization", () => {
  test("unauthenticated -> 401 on both export routes", async () => {
    expect((await getXlsx(X)).res.status).toBe(401);
    expect((await getXlsx(XA)).res.status).toBe(401);
  });

  test("students and guests are refused (403) and receive no file", async () => {
    for (const who of [SA, S7, GUEST]) {
      for (const url of [X, XA]) {
        const { res } = await getXlsx(url, who);
        expect(res.status).toBe(403);
        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.headers["content-disposition"]).toBeUndefined();
      }
    }
  });

  test("there is no student export route", async () => {
    expect((await getXlsx(`/api/student/contests/${C1}/results/export`, SA)).res.status).toBe(404);
    expect((await getXlsx(`/api/student/contests/${C1}/export`, SA)).res.status).toBe(404);
  });

  test("the owning teacher can export", async () => {
    expect((await getXlsx(X, OWNER)).res.status).toBe(200);
  });

  test("ANOTHER teacher cannot export — the same 404 as a missing contest, and no file", async () => {
    const { res } = await getXlsx(X, OTHER);
    expect(res.status).toBe(404);
    expect(errorBody(res)).toEqual({ message: "Contest not found" });
    expect(res.headers["content-disposition"]).toBeUndefined();
  });

  test("a teacher cannot use the admin export route", async () => {
    expect((await getXlsx(XA, OWNER)).res.status).toBe(403);
    expect((await getXlsx(XA, OTHER)).res.status).toBe(403);
  });

  test("an admin can export any published contest, regardless of who created it", async () => {
    contests = [mkContest(C1, { teacher_id: OTHER })];
    const { res, workbook } = await getXlsx(XA, ADMIN);
    expect(res.status).toBe(200);
    expect(summaryOf(workbook).Teacher).toBe("Omar Other");
    expect(sheetRows(workbook, "Results")).toHaveLength(9);
  });

  test.each([["DRAFT", 404], ["PENDING_APPROVAL", 409], ["REJECTED", 409]])("admin: a %s contest -> %i, no file", async (status, code) => {
    contests = [mkContest(C1, { status })];
    const { res } = await getXlsx(XA, ADMIN);
    expect(res.status).toBe(code);
    expect(res.headers["content-disposition"]).toBeUndefined();
  });

  test.each([["DRAFT"], ["PENDING_APPROVAL"], ["REJECTED"]])("teacher: even the owner gets no export for a %s contest (409)", async (status) => {
    contests = [mkContest(C1, { status })];
    const { res } = await getXlsx(X, OWNER);
    expect(res.status).toBe(409);
    expect(errorBody(res).code).toBe("CONTEST_NOT_PUBLISHED");
  });

  test("invalid / unknown contest ids are handled safely", async () => {
    expect((await getXlsx("/api/contests/nope/results/export", OWNER)).res.status).toBe(400);
    expect((await getXlsx(`/api/contests/${oid(4242)}/results/export`, OWNER)).res.status).toBe(404);
    expect((await getXlsx("/api/admin/contests/nope/results/export", ADMIN)).res.status).toBe(400);
    expect((await getXlsx(`/api/admin/contests/${oid(4242)}/results/export`, ADMIN)).res.status).toBe(404);
  });

  test('"export" is routed as the export, never mistaken for a student id', async () => {
    const { res } = await getXlsx(X, OWNER);
    expect(res.status).toBe(200); // not the 400 "Invalid student id"
    expect((await get(`${T}/${SA}`, OWNER)).status).toBe(200); // the real student-detail route still works
  });
});

describe("export — privacy", () => {
  test("a teacher's file carries emails only for students in their own sections", async () => {
    const { workbook } = await getXlsx(X, OWNER);
    const email = (n) => sheetRows(workbook, "Results").find((r) => r[COL.name] === n)[COL.email];
    expect(email("Ann")).toBe("ann@x.com");
    expect(email("Ben")).toBe("ben@x.com");
    expect(email("Xia")).toBe("xia@x.com");
    for (const n of ["Cat", "Dan", "Eve", "Fay", "Gus", "Hal"]) expect(email(n) == null).toBe(true);
    expect(allStrings(workbook)).not.toContain("cat@x.com");
  });

  test("an admin's file carries every student's email", async () => {
    const { workbook } = await getXlsx(XA, ADMIN);
    const emails = sheetRows(workbook, "Results").map((r) => r[COL.email]);
    expect(emails.every(Boolean)).toBe(true);
  });

  test("the per-game sheet never carries an email", async () => {
    const { workbook } = await getXlsx(XA, ADMIN);
    expect(JSON.stringify(sheetRows(workbook, "Challenge Details"))).not.toContain("@x.com");
  });

  test("columns are exactly the intended ones — nothing else is exported", async () => {
    const { workbook } = await getXlsx(XA, ADMIN);
    const header = (n) => workbook.getWorksheet(n).getRow(1).values.slice(1);
    expect(header("Results")).toEqual([
      "Rank", "Student Name", "Student ID", "Email", "Status", "Challenges", "Started", "Completed", "Solved", "Correct Answers",
      "Total Answers", "Accuracy %", "Completion %", "XP Earned", "Attempts", "First Started", "Last Completed", "Last Solved", "Elapsed Time",
    ]);
    expect(header("Challenge Details")).toEqual([
      "Student Name", "Student ID", "Rank", "Challenge / Game", "Game Type", "Status", "Solved", "Correct Answers", "Total Answers",
      "Accuracy %", "XP Earned", "Started At", "Completed At", "Attempts",
    ]);
  });

  test("passwords, tokens, client-controlled payload fields and raw documents never reach the file", async () => {
    users.find((u) => u._id === SA).password = "bcrypt-HASH-LEAK";
    users.find((u) => u._id === SA).refreshToken = "TOKEN-LEAK";
    users.find((u) => u._id === SA).phone = "PHONE-LEAK";
    const mine = sessions.find((s) => s.user_id === SA && String(s.contest_id) === C1);
    mine.game_payload = { is_correct: true, correct_count: 1, total_count: 1, score: 99999, rank: 1, finalScore: 99999, selectedPieceIds: ["ANSWER-LEAK"] };
    const { workbook } = await getXlsx(XA, ADMIN);
    const text = allStrings(workbook);
    for (const leak of ["bcrypt-HASH-LEAK", "TOKEN-LEAK", "PHONE-LEAK", "99999", "ANSWER-LEAK", "game_payload", "__v", "$2b$"]) expect(text).not.toContain(leak);
  });
});

describe("export — nothing a client sends can influence it", () => {
  const dump = (wb) => ({ results: sheetRows(wb, "Results"), details: sheetRows(wb, "Challenge Details") });

  test("score / rank / xp / correct / sort / status query parameters are ignored", async () => {
    const plain = dump((await getXlsx(X, OWNER)).workbook);
    const forged = dump((await getXlsx(`${X}?rank=7&score=99999&xp=99999&correct=999&sort=xp&order=asc&status=PUBLISHED&studentId=${SH}&solved=99`, OWNER)).workbook);
    expect(forged).toEqual(plain);
  });

  test("a request body is ignored and the export route accepts only GET", async () => {
    const res = await request(app).get(X).set(auth(OWNER)).send({ rank: 1, score: 99999, rows: [{ name: "Injected", rank: 1 }] }).buffer(true).parse(binary);
    expect(res.status).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    expect(allStrings(wb)).not.toContain("Injected");
    for (const method of ["post", "put", "patch", "delete"]) {
      const r = await request(app)[method](X).set(auth(OWNER)).send({ rank: 1 });
      expect(r.status).toBe(404);
    }
  });

  test("exporting writes nothing to the database", async () => {
    await getXlsx(X, OWNER);
    await getXlsx(XA, ADMIN);
    expect(QuizSession.create).not.toHaveBeenCalled();
    expect(Contest.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe("export — efficiency, limits and failures", () => {
  test("a fixed number of queries however many students took part (no per-student queries)", async () => {
    await getXlsx(X, OWNER);
    const baseline = { agg: QuizSession.aggregate.mock.calls.length, find: QuizSession.find.mock.calls.length, user: User.find.mock.calls.length, userById: User.findById.mock.calls.length };
    jest.clearAllMocks();
    // many more participants
    for (let i = 0; i < 60; i++) {
      const id = oid(5000 + i);
      users.push({ _id: id, name: `Extra ${i}`, email: `e${i}@x.com`, role: "student", grade: 6, is_guest: false });
      sessions.push(sess(id, G1, { solved: true, endM: 5 + i, xp: 30 }));
    }
    const { workbook } = await getXlsx(X, OWNER);
    expect(sheetRows(workbook, "Results")).toHaveLength(69);
    expect(QuizSession.aggregate.mock.calls.length).toBe(baseline.agg);
    expect(QuizSession.find.mock.calls.length).toBe(baseline.find);
    expect(User.find.mock.calls.length).toBe(baseline.user);
    expect(User.findById.mock.calls.length).toBe(baseline.userById);
  });

  test("a very large contest is refused with a clear 413, never silently truncated", async () => {
    const groups = Array.from({ length: MAX_EXPORT_PARTICIPANTS + 1 }, (_, i) => ({
      _id: oid(100000 + i), started: 1, completed: 0, solved: 0, correctAnswers: 0, totalAnswers: 0, xp: 0, attempts: 0, firstStartedAt: new Date(), lastCompletedAt: null, lastSolvedAt: null,
    }));
    QuizSession.aggregate.mockResolvedValueOnce(groups);
    const { res } = await getXlsx(X, OWNER);
    expect(res.status).toBe(413);
    expect(errorBody(res).code).toBe("EXPORT_TOO_LARGE");
    expect(res.headers["content-disposition"]).toBeUndefined();
  });

  test("a failure while building the workbook is a clean JSON 500 — no half-written download", async () => {
    const spy = jest.spyOn(contestExcel, "buildContestResultsWorkbook").mockImplementation(() => { throw new Error("boom while building"); });
    const { res } = await getXlsx(X, OWNER);
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.headers["content-disposition"]).toBeUndefined();
    expect(errorBody(res).message).toBeDefined();
  });

  test("a failure while serialising the file is also a clean JSON 500", async () => {
    const spy = jest.spyOn(contestExcel, "buildContestResultsWorkbook").mockImplementation(() => ({
      xlsx: { writeBuffer: async () => { throw new Error("zip failed"); } },
    }));
    const { res } = await getXlsx(X, OWNER);
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.headers["content-disposition"]).toBeUndefined();
  });

  test("a failure while loading the results is a clean JSON 500", async () => {
    QuizSession.aggregate.mockRejectedValueOnce(new Error("db down"));
    const { res } = await getXlsx(X, OWNER);
    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});

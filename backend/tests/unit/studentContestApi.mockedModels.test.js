// Student contest discovery + participation tests with MOCKED persistence.
//
// Drives the REAL student contest router (protect + requireStudent), the
// REAL games router and the REAL gameControllers (startGame,
// getGameContentList, submitGameAttempt, completeGame) over HTTP with
// supertest. Mongoose models are replaced by an in-memory fake that also
// emulates the unique contest-session index (throws a duplicate-key error),
// so the duplicate rule and the "no double XP" guarantee are exercised
// through the real controller code.
//
// It proves RBAC, validation, lifecycle and reward logic. It does NOT prove
// real MongoDB behaviour (casts, the actual index, transactions) — that is
// what tests/integration/studentContests.test.js is for.

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

jest.mock("../../src/models/User");
jest.mock("../../src/models/Contest");
jest.mock("../../src/models/Subject");
jest.mock("../../src/models/Chapter");
jest.mock("../../src/models/GameContent");
jest.mock("../../src/models/QuizzSession");
jest.mock("../../src/models/UserConceptMastery");
jest.mock("../../src/models/Assignment");
jest.mock("../../src/utils/gradeAccess");
jest.mock("../../src/utils/dailyCap");
jest.mock("../../src/utils/performanceSync");

const User = require("../../src/models/User");
const Contest = require("../../src/models/Contest");
const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const GameContent = require("../../src/models/GameContent");
const QuizSession = require("../../src/models/QuizzSession");
const UserConceptMastery = require("../../src/models/UserConceptMastery");
const Assignment = require("../../src/models/Assignment");
const gradeAccess = require("../../src/utils/gradeAccess");
const dailyCap = require("../../src/utils/dailyCap");
const performanceSync = require("../../src/utils/performanceSync");

process.env.JWT_SECRET = "test-secret";
const studentContestRoutes = require("../../src/routes/studentcontestroutes");
const gameRoutes = require("../../src/routes/gameroutes");
const { notFound, globalErrorHandler } = require("../../src/middleware/errorHandler");

const app = express();
app.use(express.json());
app.use("/api/student/contests", studentContestRoutes);
app.use("/api/games", gameRoutes);
app.use(notFound);
app.use(globalErrorHandler);

const oid = (n) => n.toString(16).padStart(24, "0");
const auth = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` });

// ---- tiny in-memory model fake --------------------------------------
const valueMatches = (docVal, cond) => {
  if (cond && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond)) {
    if ("$in" in cond && !cond.$in.map(String).includes(String(docVal))) return false;
    if ("$nin" in cond && cond.$nin.map(String).includes(String(docVal))) return false;
    if ("$ne" in cond && (docVal ?? null) === cond.$ne) return false;
    return true;
  }
  return String(docVal) === String(cond);
};
const matches = (doc, filter = {}) => Object.entries(filter).every(([k, v]) => valueMatches(doc[k], v));
const q = (result) => {
  const p = Promise.resolve(result);
  const chain = {
    select: () => chain, sort: () => chain, limit: () => chain, populate: () => chain, session: () => chain,
    then: (a, b) => p.then(a, b),
  };
  return chain;
};

// ---- fixtures ------------------------------------------------------
const S6 = oid(901), S7 = oid(902), GUEST = oid(903), TEACHER = oid(904), ADMIN = oid(905), OWNER = oid(906);
let users, contests, games, sessions;
const SUBJ = oid(1), CH = oid(2), K1 = oid(11), K2 = oid(12);
const G_A = oid(31), G_B = oid(32), G_OTHER = oid(33), G_SPEED = oid(34);
const C = (n) => oid(400 + n);
const hoursFromNow = (h) => new Date(Date.now() + h * 3600 * 1000);

const mkContest = (n, over = {}) => ({
  _id: C(n), title: `Contest ${n}`, description: "desc", teacher_id: OWNER, grade: 6, subject_id: SUBJ, chapter_id: CH,
  challenges: [{ game_content_id: G_A }, { game_content_id: G_B }],
  start_at: hoursFromNow(-1), end_at: hoursFromNow(24), status: "PUBLISHED",
  submitted_at: new Date(), reviewed_by: OWNER, reviewed_at: new Date(), review_note: "SECRET-REVIEW-NOTE",
  createdAt: new Date(), ...over,
});

const bodyFor = (correct) => ({ selectedPieceIds: correct ? ["p1", "p2"] : ["p1"] });

let sessionSeq;
let dbSession;
const startPayload = (over = {}) => ({ gameType: "MATH_FRACTION_BUILDER", contentId: G_A, ...over });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  sessionSeq = 0;

  users = [
    { _id: S6, role: "student", grade: 6, is_guest: false, streak_count: 0, xp_total: 0, last_active_date: null, save: jest.fn(async () => {}) },
    { _id: S7, role: "student", grade: 7, is_guest: false, streak_count: 0, xp_total: 0, last_active_date: null, save: jest.fn(async () => {}) },
    { _id: GUEST, role: "student", grade: 6, is_guest: true, streak_count: 0, xp_total: 0, save: jest.fn() },
    { _id: TEACHER, role: "teacher", status: "active", is_guest: false, save: jest.fn() },
    { _id: ADMIN, role: "admin", is_guest: false, save: jest.fn() },
    { _id: OWNER, role: "teacher", name: "Tina Teacher", status: "active", is_guest: false, save: jest.fn() },
  ];
  contests = [mkContest(1)];
  games = [
    { _id: G_A, game_type: "MATH_FRACTION_BUILDER", concept_id: K1, title: "Build 1/2", difficulty: "easy", order_index: 1,
      payload: { pieces: [{ id: "p1" }, { id: "p2" }, { id: "p3" }], correct_piece_ids: ["p1", "p2"], hint: "SECRET-HINT" } },
    { _id: G_B, game_type: "MATH_FRACTION_BUILDER", concept_id: K1, title: "Build 3/4", difficulty: "medium", order_index: 2,
      payload: { pieces: [{ id: "p1" }, { id: "p2" }], correct_piece_ids: ["p1", "p2"] } },
    { _id: G_OTHER, game_type: "MATH_FRACTION_BUILDER", concept_id: K1, title: "Not in contest", difficulty: "easy", order_index: 3,
      payload: { pieces: [{ id: "p1" }, { id: "p2" }], correct_piece_ids: ["p1", "p2"] } },
    { _id: G_SPEED, game_type: "MATH_FRACTION_MATCH", concept_id: K1, title: "Match", difficulty: "easy", order_index: 1,
      payload: { cards: [], correct_mapping: {} } },
  ];
  sessions = [];

  User.findById.mockImplementation((id) => q(users.find((u) => String(u._id) === String(id)) || null));
  User.find.mockImplementation((f) => q(users.filter((u) => matches(u, f))));
  Contest.find.mockImplementation((f) => q(contests.filter((c) => matches(c, f))));
  Contest.findById.mockImplementation((id) => q(contests.find((c) => String(c._id) === String(id)) || null));
  Subject.find.mockImplementation(() => q([{ _id: SUBJ, name: "Mathematics" }]));
  Chapter.find.mockImplementation(() => q([{ _id: CH, title: "Fractions" }]));
  GameContent.find.mockImplementation((f) => q(games.filter((g) => matches(g, f))));
  GameContent.findOne.mockImplementation((f) => q(games.find((g) => matches(g, f)) || null));
  GameContent.findById.mockImplementation((id) => q(games.find((g) => String(g._id) === String(id)) || null));

  // The unique partial index {contest_id, user_id, content_id}.
  QuizSession.create.mockImplementation(async (d) => {
    if (d.contest_id && sessions.some((s) => s.contest_id && String(s.contest_id) === String(d.contest_id) &&
        String(s.user_id) === String(d.user_id) && String(s.content_id) === String(d.content_id))) {
      const e = new Error("E11000 duplicate key"); e.code = 11000; throw e;
    }
    const doc = { _id: oid(800 + sessionSeq++), attempt_count: 0, xp_awarded: 0, ...d, save: jest.fn(async () => {}) };
    sessions.push(doc);
    return doc;
  });
  QuizSession.findOne.mockImplementation((f) => q(sessions.find((s) => matches(s, f)) || null));
  QuizSession.find.mockImplementation((f) => q(sessions.filter((s) => matches(s, f))));
  QuizSession.findById.mockImplementation((id) => q(sessions.find((s) => String(s._id) === String(id)) || null));
  QuizSession.distinct.mockImplementation(async (field, f) => sessions.filter((s) => matches(s, f)).map((s) => s[field]));
  QuizSession.updateOne.mockImplementation(async (f, u) => {
    const doc = sessions.find((s) => String(s._id) === String(f._id) && !s.completed_at);
    if (!doc) return { modifiedCount: 0 };
    Object.assign(doc, u.$set);
    return { modifiedCount: 1 };
  });

  gradeAccess.verifyGradeAccess.mockImplementation(async (userId) => {
    const u = users.find((x) => String(x._id) === String(userId));
    return { allowed: true, userGrade: u?.grade ?? null };
  });
  gradeAccess.getGradeConceptIds.mockImplementation(async () => [K1, K2]);
  dailyCap.DAILY_XP_CAP_PER_CONTENT = 3;
  dailyCap.countCompletionsToday.mockImplementation(async () => 0);
  performanceSync.syncSessionToExcel.mockImplementation(async () => ({ status: "synced" }));

  UserConceptMastery.findOne.mockImplementation(() => q(null));
  UserConceptMastery.mockImplementation(function (d) { Object.assign(this, d); this.save = jest.fn(async () => {}); });
  Assignment.updateMany.mockResolvedValue({});

  dbSession = { startTransaction: jest.fn(), commitTransaction: jest.fn(async () => {}), abortTransaction: jest.fn(async () => {}), endSession: jest.fn() };
  jest.spyOn(mongoose, "startSession").mockResolvedValue(dbSession);
});
afterEach(() => { console.error.mockRestore?.(); mongoose.startSession.mockRestore?.(); });

const get = (url, who) => request(app).get(url).set(who ? auth(who) : {});
const post = (url, who, body) => request(app).post(url).set(who ? auth(who) : {}).send(body);

// =====================================================================
describe("student contest discovery — RBAC", () => {
  test("unauthenticated -> 401", async () => {
    expect((await get("/api/student/contests")).status).toBe(401);
    expect((await get(`/api/student/contests/${C(1)}`)).status).toBe(401);
  });

  test("teachers and admins are refused (403) — they use their own portals", async () => {
    for (const who of [TEACHER, ADMIN, OWNER]) {
      expect((await get("/api/student/contests", who)).status).toBe(403);
      expect((await get(`/api/student/contests/${C(1)}`, who)).status).toBe(403);
    }
  });

  test("a guest account is refused with GUEST_NOT_ALLOWED", async () => {
    const res = await get("/api/student/contests", GUEST);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("GUEST_NOT_ALLOWED");
  });

  test("a token for a deleted user -> 401", async () => {
    expect((await get("/api/student/contests", oid(999))).status).toBe(401);
  });
});

describe("student contest discovery — what a student can see", () => {
  test("only PUBLISHED contests for the student's own grade", async () => {
    contests = [
      mkContest(1, { title: "Visible" }),
      mkContest(2, { title: "Draft", status: "DRAFT" }),
      mkContest(3, { title: "Pending", status: "PENDING_APPROVAL" }),
      mkContest(4, { title: "Rejected", status: "REJECTED" }),
      mkContest(5, { title: "Other grade", grade: 7 }),
    ];
    const res = await get("/api/student/contests", S6);
    expect(res.status).toBe(200);
    expect(res.body.contests.map((c) => c.title)).toEqual(["Visible"]);
  });

  test("grade comes from the database — a client-supplied grade is ignored", async () => {
    contests = [mkContest(1, { title: "G6", grade: 6 }), mkContest(2, { title: "G7", grade: 7 })];
    const res = await get("/api/student/contests?grade=7&studentGrade=7", S6);
    expect(res.body.contests.map((c) => c.title)).toEqual(["G6"]);
    expect(Contest.find).toHaveBeenLastCalledWith({ status: "PUBLISHED", grade: 6 });
    const res7 = await get("/api/student/contests", S7);
    expect(res7.body.contests.map((c) => c.title)).toEqual(["G7"]);
  });

  test("returns useful fields and never leaks review/admin data", async () => {
    const res = await get("/api/student/contests", S6);
    const c = res.body.contests[0];
    expect(c).toMatchObject({
      id: C(1), title: "Contest 1", grade: 6, subject: "Mathematics", chapterTitle: "Fractions",
      teacherName: "Tina Teacher", challengeCount: 2, completedCount: 0, phase: "ACTIVE",
    });
    expect(c.startAt).toBeDefined();
    expect(c.endAt).toBeDefined();
    expect(res.body.serverNow).toBeDefined();
    const text = JSON.stringify(res.body);
    expect(text).not.toContain("SECRET-REVIEW-NOTE");
    for (const key of ["reviewNote", "reviewedBy", "reviewed_by", "review_note", "submittedAt", "teacher_id", "status"]) {
      expect(c).not.toHaveProperty(key);
    }
  });

  test("phases come from the server clock and are ordered active, upcoming, ended", async () => {
    contests = [
      mkContest(1, { title: "Ended", start_at: hoursFromNow(-10), end_at: hoursFromNow(-5) }),
      mkContest(2, { title: "Upcoming", start_at: hoursFromNow(5), end_at: hoursFromNow(9) }),
      mkContest(3, { title: "Active", start_at: hoursFromNow(-1), end_at: hoursFromNow(1) }),
    ];
    const res = await get("/api/student/contests", S6);
    expect(res.body.contests.map((c) => [c.title, c.phase])).toEqual([
      ["Active", "ACTIVE"], ["Upcoming", "UPCOMING"], ["Ended", "ENDED"],
    ]);
  });

  test("shows the student's own completed count", async () => {
    sessions.push(
      { _id: oid(1), user_id: S6, contest_id: C(1), content_id: G_A, completed_at: new Date() },
      { _id: oid(2), user_id: S6, contest_id: C(1), content_id: G_B }, // in progress
      { _id: oid(3), user_id: S7, contest_id: C(1), content_id: G_A, completed_at: new Date() }, // someone else's
    );
    const res = await get("/api/student/contests", S6);
    expect(res.body.contests[0].completedCount).toBe(1);
  });

  test("no contests -> empty list", async () => {
    contests = [];
    expect((await get("/api/student/contests", S6)).body.contests).toEqual([]);
  });
});

describe("student contest detail", () => {
  test("returns challenges with the student's own status, without payloads or answer keys", async () => {
    sessions.push({ _id: oid(1), user_id: S6, contest_id: C(1), content_id: G_A, completed_at: new Date(), xp_awarded: 30, game_payload: { is_correct: true } });
    const res = await get(`/api/student/contests/${C(1)}`, S6);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: "Contest 1", phase: "ACTIVE", progress: { completed: 1, total: 2 } });
    expect(res.body.challenges[0]).toMatchObject({
      id: G_A, title: "Build 1/2", gameType: "MATH_FRACTION_BUILDER", label: "Fraction Builder",
      status: "COMPLETED", isCorrect: true, xpAwarded: 30, canPlay: false,
    });
    expect(res.body.challenges[1]).toMatchObject({ id: G_B, status: "NOT_STARTED", isCorrect: null, canPlay: true });
    const text = JSON.stringify(res.body);
    expect(text).not.toContain("SECRET-HINT");
    expect(text).not.toContain("correct_piece_ids");
    expect(text).not.toContain("SECRET-REVIEW-NOTE");
  });

  test("an unfinished session is IN_PROGRESS and still playable", async () => {
    sessions.push({ _id: oid(1), user_id: S6, contest_id: C(1), content_id: G_B });
    const res = await get(`/api/student/contests/${C(1)}`, S6);
    expect(res.body.challenges[1]).toMatchObject({ status: "IN_PROGRESS", canPlay: true });
  });

  test("upcoming and ended contests are viewable but nothing is playable", async () => {
    contests = [mkContest(1, { start_at: hoursFromNow(2), end_at: hoursFromNow(5) }), mkContest(2, { start_at: hoursFromNow(-9), end_at: hoursFromNow(-2) })];
    const up = await get(`/api/student/contests/${C(1)}`, S6);
    expect(up.status).toBe(200);
    expect(up.body.phase).toBe("UPCOMING");
    expect(up.body.challenges.every((c) => c.canPlay === false)).toBe(true);
    const ended = await get(`/api/student/contests/${C(2)}`, S6);
    expect(ended.body.phase).toBe("ENDED");
    expect(ended.body.challenges.every((c) => c.canPlay === false)).toBe(true);
  });

  test.each([
    ["draft", { status: "DRAFT" }],
    ["pending", { status: "PENDING_APPROVAL" }],
    ["rejected", { status: "REJECTED" }],
    ["other-grade", { grade: 7 }],
  ])("a %s contest is a plain 404 (its existence isn't leaked)", async (_l, over) => {
    contests = [mkContest(1, over)];
    expect((await get(`/api/student/contests/${C(1)}`, S6)).status).toBe(404);
  });

  test("invalid id -> 400, unknown id -> 404", async () => {
    expect((await get("/api/student/contests/nope", S6)).status).toBe(400);
    expect((await get(`/api/student/contests/${oid(4242)}`, S6)).status).toBe(404);
  });
});

// =====================================================================
describe("starting a game — normal practice is unchanged", () => {
  test("no contestId: 201, a plain session with no contest context", async () => {
    const res = await post("/api/games/start", S6, startPayload());
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty("contestId");
    expect(res.body.content.payload).not.toHaveProperty("correct_piece_ids");
    expect(QuizSession.create.mock.calls[0][0]).not.toHaveProperty("contest_id");
    expect(sessions[0].contest_id).toBeUndefined();
  });

  test("a snake_case or otherwise forged contest field in the body is ignored", async () => {
    const res = await post("/api/games/start", S6, startPayload({ contest_id: C(1), contest: C(1) }));
    expect(res.status).toBe(201);
    expect(sessions[0].contest_id).toBeUndefined();
  });

  test("teachers/students outside contests still get the existing validations", async () => {
    expect((await post("/api/games/start", S6, { gameType: "MATH_FRACTION_BUILDER" })).status).toBe(400);
    expect((await post("/api/games/start", S6, startPayload({ contentId: "zzz" }))).status).toBe(400);
    expect((await post("/api/games/start", S6, startPayload({ contentId: oid(9999) }))).status).toBe(404);
  });
});

describe("starting a contest game — server-side validation", () => {
  const start = (who, over) => post("/api/games/start", who, startPayload({ contestId: C(1), ...over }));

  test("valid: active, right grade, real challenge -> 201 and the session is tied to the contest and the caller", async () => {
    const res = await start(S6);
    expect(res.status).toBe(201);
    expect(res.body.contestId).toBe(C(1));
    const created = QuizSession.create.mock.calls[0][0];
    expect(created).toMatchObject({ user_id: S6, contest_id: C(1), content_id: G_A, session_type: "game-session" });
    expect(res.body.content.payload).not.toHaveProperty("correct_piece_ids");
  });

  test("upcoming -> 403 CONTEST_NOT_STARTED, nothing created", async () => {
    contests = [mkContest(1, { start_at: hoursFromNow(1), end_at: hoursFromNow(5) })];
    const res = await start(S6);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CONTEST_NOT_STARTED");
    expect(QuizSession.create).not.toHaveBeenCalled();
  });

  test("ended -> 403 CONTEST_ENDED, nothing created", async () => {
    contests = [mkContest(1, { start_at: hoursFromNow(-5), end_at: hoursFromNow(-1) })];
    const res = await start(S6);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CONTEST_ENDED");
    expect(QuizSession.create).not.toHaveBeenCalled();
  });

  test.each([
    ["draft", { status: "DRAFT" }],
    ["pending", { status: "PENDING_APPROVAL" }],
    ["rejected", { status: "REJECTED" }],
  ])("a %s contest cannot be used -> 404", async (_l, over) => {
    contests = [mkContest(1, over)];
    expect((await start(S6)).status).toBe(404);
    expect(QuizSession.create).not.toHaveBeenCalled();
  });

  test("a contest for another grade cannot be used -> 404", async () => {
    expect((await start(S7)).status).toBe(404);
    expect(QuizSession.create).not.toHaveBeenCalled();
  });

  test("unknown contest -> 404; malformed or non-string contestId -> 400", async () => {
    expect((await start(S6, { contestId: oid(4242) })).status).toBe(404);
    expect((await start(S6, { contestId: "nope" })).status).toBe(400);
    expect((await start(S6, { contestId: { $ne: null } })).status).toBe(400);
    expect((await start(S6, { contestId: 12345 })).status).toBe(400);
    expect(QuizSession.create).not.toHaveBeenCalled();
  });

  test("a game that is NOT one of the contest's challenges is rejected", async () => {
    const res = await start(S6, { contentId: G_OTHER });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CONTEST_CHALLENGE_MISMATCH");
    expect(QuizSession.create).not.toHaveBeenCalled();
  });

  test("a real challenge id paired with the wrong gameType is rejected by the existing content check", async () => {
    const res = await start(S6, { gameType: "MATH_FRACTION_MATCH" });
    expect(res.status).toBe(404);
    expect(QuizSession.create).not.toHaveBeenCalled();
  });

  test("teachers, admins and guests cannot start contest sessions", async () => {
    expect((await start(TEACHER)).body.code).toBe("STUDENT_ONLY");
    expect((await start(ADMIN)).body.code).toBe("STUDENT_ONLY");
    expect((await start(GUEST)).body.code).toBe("GUEST_NOT_ALLOWED");
    expect(QuizSession.create).not.toHaveBeenCalled();
  });

  test("unauthenticated -> 401", async () => {
    expect((await post("/api/games/start", undefined, startPayload({ contestId: C(1) }))).status).toBe(401);
  });

  test("the owner of the session is always the caller: another student cannot use or complete it", async () => {
    const started = await start(S6);
    const sid = started.body.sessionId;
    expect((await post(`/api/games/${sid}/attempt`, S7, bodyFor(true))).status).toBe(403);
    expect((await post(`/api/games/${sid}/complete`, S7)).status).toBe(403);
  });
});

describe("one scored session per contest challenge", () => {
  const start = (who = S6, over = {}) => post("/api/games/start", who, startPayload({ contestId: C(1), ...over }));

  test("starting an unfinished challenge again resumes the SAME session (no second session)", async () => {
    const a = await start();
    const b = await start();
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.sessionId).toBe(a.body.sessionId);
    expect(sessions).toHaveLength(1);
  });

  test("two simultaneous starts still produce exactly one session (unique index race)", async () => {
    const [a, b] = await Promise.all([start(), start()]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.sessionId).toBe(b.body.sessionId);
    expect(sessions.filter((s) => s.contest_id)).toHaveLength(1);
  });

  // The fake is so fast that two HTTP requests rarely interleave, so the
  // duplicate-key recovery path is forced explicitly here: the pre-check
  // sees "no session" (as a slower parallel request would), but by the time
  // create runs, the unique index rejects it because the other request won.
  test("race: losing the unique-index race resumes the winner's open session", async () => {
    const winner = await start();
    const realFindOne = QuizSession.findOne.getMockImplementation();
    QuizSession.findOne.mockImplementationOnce(() => q(null));
    QuizSession.findOne.mockImplementation(realFindOne);
    const loser = await start();
    expect(loser.status).toBe(200);
    expect(loser.body.sessionId).toBe(winner.body.sessionId);
    expect(QuizSession.create).toHaveBeenCalledTimes(2); // second attempt hit the duplicate-key error
    expect(sessions).toHaveLength(1);
  });

  test("race: if the winner already COMPLETED, the loser gets 409, not a 500", async () => {
    const winner = await start();
    await post(`/api/games/${winner.body.sessionId}/attempt`, S6, bodyFor(true));
    await post(`/api/games/${winner.body.sessionId}/complete`, S6);
    const realFindOne = QuizSession.findOne.getMockImplementation();
    QuizSession.findOne.mockImplementationOnce(() => q(null));
    QuizSession.findOne.mockImplementation(realFindOne);
    const loser = await start();
    expect(loser.status).toBe(409);
    expect(loser.body.code).toBe("CONTEST_CHALLENGE_COMPLETED");
    expect(sessions).toHaveLength(1);
  });

  test("a non-duplicate database error is not swallowed (still a server error)", async () => {
    QuizSession.create.mockRejectedValueOnce(new Error("disk on fire"));
    const res = await start();
    expect(res.status).toBe(500);
  });

  test("after completing it, the same contest challenge cannot be started again (409) — but practice still can", async () => {
    const started = await start();
    await post(`/api/games/${started.body.sessionId}/attempt`, S6, bodyFor(true));
    expect((await post(`/api/games/${started.body.sessionId}/complete`, S6)).status).toBe(200);

    const again = await start();
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("CONTEST_CHALLENGE_COMPLETED");

    const practice = await post("/api/games/start", S6, startPayload());
    expect(practice.status).toBe(201);
    expect(sessions).toHaveLength(2);
  });

  test("a different challenge in the same contest is independent", async () => {
    await start();
    const other = await start(S6, { contentId: G_B });
    expect(other.status).toBe(201);
    expect(sessions).toHaveLength(2);
  });

  test("two students each get their own session for the same challenge", async () => {
    contests = [mkContest(1, { grade: 6 })];
    users[1].grade = 6; // make S7 a grade-6 student for this test
    expect((await start(S6)).status).toBe(201);
    expect((await start(S7)).status).toBe(201);
    expect(sessions).toHaveLength(2);
  });

  test("a finished PRACTICE game cannot be attached to a contest retroactively", async () => {
    const practice = await post("/api/games/start", S6, startPayload());
    await post(`/api/games/${practice.body.sessionId}/attempt`, S6, { ...bodyFor(true), contest_id: C(1), contestId: C(1) });
    await post(`/api/games/${practice.body.sessionId}/complete`, S6);
    const practiceDoc = sessions[0];
    expect(practiceDoc.completed_at).toBeDefined();
    expect(practiceDoc.contest_id).toBeUndefined();

    const contestStart = await start();
    expect(contestStart.status).toBe(201);
    expect(contestStart.body.sessionId).not.toBe(practice.body.sessionId);
    expect(sessions[0].contest_id).toBeUndefined();
    expect(sessions[1].contest_id).toBe(C(1));
    // the completed practice run never counted toward the contest
    const detail = await get(`/api/student/contests/${C(1)}`, S6);
    expect(detail.body.progress.completed).toBe(0);
  });
});

describe("contest level list (GET /api/games/content?contestId=)", () => {
  test("without contestId the list is exactly as before (all grade content of that type)", async () => {
    const res = await get("/api/games/content?gameType=MATH_FRACTION_BUILDER", S6);
    expect(res.status).toBe(200);
    expect(res.body.content.map((c) => c.id)).toEqual([G_A, G_B, G_OTHER]);
    expect(JSON.stringify(res.body)).not.toContain("correct_piece_ids");
  });

  test("with contestId it is narrowed to the contest's challenges of that type, answer keys still stripped", async () => {
    const res = await get(`/api/games/content?gameType=MATH_FRACTION_BUILDER&contestId=${C(1)}`, S6);
    expect(res.status).toBe(200);
    expect(res.body.content.map((c) => c.id)).toEqual([G_A, G_B]);
    expect(JSON.stringify(res.body)).not.toContain("correct_piece_ids");
    expect(JSON.stringify(res.body)).not.toContain("SECRET-HINT");
  });

  test("challenges the student already finished are no longer offered", async () => {
    sessions.push({ _id: oid(1), user_id: S6, contest_id: C(1), content_id: G_A, completed_at: new Date() });
    const res = await get(`/api/games/content?gameType=MATH_FRACTION_BUILDER&contestId=${C(1)}`, S6);
    expect(res.body.content.map((c) => c.id)).toEqual([G_B]);
  });

  test("upcoming/ended -> 403, other grade or draft -> 404, malformed -> 400", async () => {
    contests = [
      mkContest(1, { start_at: hoursFromNow(2), end_at: hoursFromNow(4) }),
      mkContest(2, { start_at: hoursFromNow(-8), end_at: hoursFromNow(-4) }),
      mkContest(3, { grade: 7 }),
      mkContest(4, { status: "DRAFT" }),
    ];
    const url = (id) => `/api/games/content?gameType=MATH_FRACTION_BUILDER&contestId=${id}`;
    expect((await get(url(C(1)), S6)).status).toBe(403);
    expect((await get(url(C(2)), S6)).status).toBe(403);
    expect((await get(url(C(3)), S6)).status).toBe(404);
    expect((await get(url(C(4)), S6)).status).toBe(404);
    expect((await get(url("bad"), S6)).status).toBe(400);
  });
});

// =====================================================================
describe("rewards are the normal Learnova ones — nothing extra, nothing doubled", () => {
  const playToCompletion = async ({ contest }) => {
    const started = await post("/api/games/start", S6, startPayload(contest ? { contestId: C(1) } : {}));
    const sid = started.body.sessionId;
    const attempt = await post(`/api/games/${sid}/attempt`, S6, bodyFor(true));
    const complete = await post(`/api/games/${sid}/complete`, S6);
    return { sid, attempt, complete };
  };

  test("a contest game earns exactly the XP/mastery/streak a practice game does, and only once", async () => {
    const practice = await playToCompletion({ contest: false });
    const practiceXp = practice.complete.body.xpAwarded;
    const practiceStreak = practice.complete.body.newStreak;
    expect(practice.complete.status).toBe(200);
    expect(practiceXp).toBe(30); // 1 correct x10 + 20 perfect bonus, streak multiplier 1

    // reset the student to the same starting point and play the contest version
    users[0].xp_total = 0; users[0].streak_count = 0; users[0].last_active_date = null; sessions = [];
    UserConceptMastery.mockClear();
    Assignment.updateMany.mockClear();
    const contest = await playToCompletion({ contest: true });
    expect(contest.attempt.body.isCorrect).toBe(true);
    expect(contest.complete.body.xpAwarded).toBe(practiceXp);
    expect(contest.complete.body.newStreak).toBe(practiceStreak);
    expect(contest.complete.body.masteryUpdate).toMatchObject({ concept_id: K1, new_state: "weak" });
    expect(users[0].xp_total).toBe(30);

    // claiming again is idempotent: no second payout
    const dup = await post(`/api/games/${contest.sid}/complete`, S6);
    expect(dup.status).toBe(200);
    expect(dup.body.alreadyCompleted).toBe(true);
    expect(users[0].xp_total).toBe(30);
    expect(Assignment.updateMany).toHaveBeenCalledTimes(1); // the normal per-completion assignment hook, once
  });

  test("the existing daily XP cap still applies to contest completions", async () => {
    dailyCap.countCompletionsToday.mockResolvedValue(3);
    const { complete } = await playToCompletion({ contest: true });
    expect(complete.body).toMatchObject({ xpAwarded: 0, xpCapped: true });
    expect(users[0].xp_total).toBe(0);
  });

  test("attempts on a contest session are counted; practice sessions are left alone", async () => {
    const c = await post("/api/games/start", S6, startPayload({ contestId: C(1) }));
    await post(`/api/games/${c.body.sessionId}/attempt`, S6, bodyFor(false));
    const second = await post(`/api/games/${c.body.sessionId}/attempt`, S6, bodyFor(true));
    expect(second.body.isCorrect).toBe(true);
    expect(sessions[0].attempt_count).toBe(2);
    expect(sessions[0].game_payload.is_correct).toBe(true); // the final result is what counts

    const p = await post("/api/games/start", S6, startPayload({ contentId: G_OTHER }));
    await post(`/api/games/${p.body.sessionId}/attempt`, S6, bodyFor(true));
    expect(sessions[1].attempt_count).toBe(0);
  });
});

describe("the contest window is enforced while playing (server clock)", () => {
  test("if the contest ends mid-game, further attempts and completion are refused and nothing is awarded", async () => {
    const started = await post("/api/games/start", S6, startPayload({ contestId: C(1) }));
    const sid = started.body.sessionId;
    expect((await post(`/api/games/${sid}/attempt`, S6, bodyFor(true))).status).toBe(200);

    contests[0].end_at = hoursFromNow(-0.01); // the contest closes while the student is still playing

    const late = await post(`/api/games/${sid}/attempt`, S6, bodyFor(true));
    expect(late.status).toBe(409);
    expect(late.body.code).toBe("CONTEST_ENDED");
    const lateComplete = await post(`/api/games/${sid}/complete`, S6);
    expect(lateComplete.status).toBe(409);
    expect(lateComplete.body.code).toBe("CONTEST_ENDED");
    expect(sessions[0].completed_at).toBeUndefined();
    expect(users[0].xp_total).toBe(0);
    expect(dbSession.abortTransaction).toHaveBeenCalled();
    expect(dbSession.commitTransaction).not.toHaveBeenCalled();
  });

  test("a result that was completed before the deadline is still returned afterwards (idempotent)", async () => {
    const started = await post("/api/games/start", S6, startPayload({ contestId: C(1) }));
    const sid = started.body.sessionId;
    await post(`/api/games/${sid}/attempt`, S6, bodyFor(true));
    await post(`/api/games/${sid}/complete`, S6);
    contests[0].end_at = hoursFromNow(-1);
    const again = await post(`/api/games/${sid}/complete`, S6);
    expect(again.status).toBe(200);
    expect(again.body.alreadyCompleted).toBe(true);
  });

  test("if the contest stops being available, the open session can't be scored", async () => {
    const started = await post("/api/games/start", S6, startPayload({ contestId: C(1) }));
    contests[0].status = "REJECTED"; // cannot happen through the API today; guards the invariant anyway
    const res = await post(`/api/games/${started.body.sessionId}/attempt`, S6, bodyFor(true));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONTEST_UNAVAILABLE");
  });

  test("practice sessions are never subject to any contest window", async () => {
    contests = []; // no contests exist at all
    const started = await post("/api/games/start", S6, startPayload());
    expect((await post(`/api/games/${started.body.sessionId}/attempt`, S6, bodyFor(true))).status).toBe(200);
    expect((await post(`/api/games/${started.body.sessionId}/complete`, S6)).status).toBe(200);
    expect(Contest.findById).not.toHaveBeenCalled();
  });
});

describe("status cannot be changed by a student", () => {
  test("there is no student route that writes a contest", async () => {
    for (const [method, url] of [
      ["post", `/api/student/contests/${C(1)}`], ["put", `/api/student/contests/${C(1)}`],
      ["patch", `/api/student/contests/${C(1)}`], ["delete", `/api/student/contests/${C(1)}`],
      ["post", "/api/student/contests"], ["post", `/api/student/contests/${C(1)}/join`],
    ]) {
      const res = await request(app)[method](url).set(auth(S6)).send({ status: "PUBLISHED" });
      expect([404]).toContain(res.status);
    }
    expect(contests[0].status).toBe("PUBLISHED");
    expect(Contest.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Contest.create).not.toHaveBeenCalled();
  });
});

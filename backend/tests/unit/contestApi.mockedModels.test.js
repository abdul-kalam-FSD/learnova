// Contest API tests with MOCKED persistence.
//
// Drives the REAL contest router + protect/requireTeacher middleware +
// controller over HTTP (supertest), but every Mongoose model is replaced
// by a small in-memory fake. So this genuinely exercises the RBAC and
// reference-validation logic, but it does NOT prove anything about real
// MongoDB behaviour (indexes, casts, validators, transactions). The
// real-DB counterpart is tests/integration/contests.test.js
// (mongodb-memory-server), which needs a machine that can run mongod.

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../../src/models/User");
jest.mock("../../src/models/Contest");
jest.mock("../../src/models/Subject");
jest.mock("../../src/models/Chapter");
jest.mock("../../src/models/Concept");
jest.mock("../../src/models/GameContent");

const User = require("../../src/models/User");
const Contest = require("../../src/models/Contest");
const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const GameContent = require("../../src/models/GameContent");

process.env.JWT_SECRET = "test-secret";
const contestRoutes = require("../../src/routes/contestroutes");
const { notFound, globalErrorHandler } = require("../../src/middleware/errorHandler");

const app = express();
app.use(express.json());
app.use("/api/contests", contestRoutes);
app.use(notFound);
app.use(globalErrorHandler);

const oid = (n) => n.toString(16).padStart(24, "0");
const token = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);
const auth = (userId) => ({ Authorization: `Bearer ${token(userId)}` });

// --- tiny in-memory model fake -------------------------------------
const matches = (doc, filter = {}) =>
  Object.entries(filter).every(([k, v]) =>
    v && typeof v === "object" && "$in" in v
      ? v.$in.map(String).includes(String(doc[k]))
      : String(doc[k]) === String(v),
  );
const query = (result) => {
  const q = {
    select: () => q,
    sort: () => q,
    limit: () => q,
    then: (res, rej) => Promise.resolve(result).then(res, rej),
  };
  return q;
};
const wire = (Model, docs) => {
  Model.find.mockImplementation((f) => query(docs.filter((d) => matches(d, f))));
  Model.findById.mockImplementation((id) => query(docs.find((d) => String(d._id) === String(id)) || null));
};

// --- fixtures ------------------------------------------------------
const STUDENT = oid(901), TEACHER = oid(902), OTHER_TEACHER = oid(903), ADMIN = oid(904), PENDING = oid(905);
const users = [
  { _id: STUDENT, role: "student", status: "active" },
  { _id: TEACHER, role: "teacher", status: "active" },
  { _id: OTHER_TEACHER, role: "teacher", status: "active" },
  { _id: ADMIN, role: "admin", status: "active" },
  { _id: PENDING, role: "teacher", status: "pending" },
];
const MATH6 = oid(1), SCI6 = oid(2), MATH7 = oid(3);
const CH_A = oid(11), CH_B = oid(12), CH_SCI = oid(13);
const K_A = oid(21), K_B = oid(22), K_SCI = oid(23);
const G_A = oid(31), G_B = oid(32), G_SCI = oid(33), G_BAD = oid(34);
const subjects = [
  { _id: MATH6, name: "Mathematics", grade: 6 },
  { _id: SCI6, name: "Science", grade: 6 },
  { _id: MATH7, name: "Mathematics", grade: 7 },
];
const chapters = [
  { _id: CH_A, subject_id: MATH6, title: "Fractions", order_index: 1 },
  { _id: CH_B, subject_id: MATH6, title: "Decimals", order_index: 2 },
  { _id: CH_SCI, subject_id: SCI6, title: "Plants", order_index: 1 },
];
const concepts = [
  { _id: K_A, chapter_id: CH_A, title: "Equivalent fractions" },
  { _id: K_B, chapter_id: CH_B, title: "Decimal places" },
  { _id: K_SCI, chapter_id: CH_SCI, title: "Photosynthesis" },
];
const games = [
  { _id: G_A, concept_id: K_A, game_type: "MATH_FRACTION_BUILDER", title: "Build 1/2", difficulty: "easy", order_index: 1, payload: { secret: "ANSWER-KEY" } },
  { _id: G_B, concept_id: K_B, game_type: "MATH_FRACTION_MATCH", title: "Match decimals", difficulty: "medium", order_index: 1, payload: { secret: "ANSWER-KEY" } },
  { _id: G_SCI, concept_id: K_SCI, game_type: "BIO_VIRTUAL_LAB", title: "Leaf lab", difficulty: "easy", order_index: 1 },
  { _id: G_BAD, concept_id: K_A, game_type: "NOT_A_REAL_GAME", title: "Ghost", difficulty: "easy", order_index: 2 },
];

let contestStore;
const future = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
const validBody = (over = {}) => ({
  title: "Weekly Fractions Blitz",
  description: "Play both games",
  grade: 6,
  subjectId: MATH6,
  chapterId: CH_A,
  challengeIds: [G_A],
  startAt: future(1),
  endAt: future(25),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  contestStore = [];

  wire(User, users);
  wire(Subject, subjects);
  wire(Chapter, chapters);
  wire(Concept, concepts);
  wire(GameContent, games);

  Contest.create.mockImplementation(async (d) => {
    const doc = { _id: oid(500 + contestStore.length), createdAt: new Date(), ...d };
    contestStore.push(doc);
    return doc;
  });
  Contest.find.mockImplementation((f) => query(contestStore.filter((d) => matches(d, f))));
  Contest.findById.mockImplementation((id) => query(contestStore.find((d) => String(d._id) === String(id)) || null));
  Contest.findOneAndUpdate.mockImplementation(async (filter, update) => {
    const doc = contestStore.find(
      (d) => String(d._id) === String(filter._id) && String(d.teacher_id) === String(filter.teacher_id) && filter.status.$in.includes(d.status),
    );
    if (!doc) return null;
    Object.assign(doc, update.$set);
    return doc;
  });
});
afterEach(() => console.error.mockRestore?.());

describe("authentication + RBAC", () => {
  test("no token -> 401 on every contest route", async () => {
    expect((await request(app).get("/api/contests/my")).status).toBe(401);
    expect((await request(app).post("/api/contests").send(validBody())).status).toBe(401);
    expect((await request(app).get("/api/contests/game-options")).status).toBe(401);
    expect((await request(app).post(`/api/contests/${oid(1)}/submit`)).status).toBe(401);
  });

  test("a STUDENT cannot create a contest (403) and nothing is persisted", async () => {
    const res = await request(app).post("/api/contests").set(auth(STUDENT)).send(validBody());
    expect(res.status).toBe(403);
    expect(Contest.create).not.toHaveBeenCalled();
  });

  test("a STUDENT cannot use any other contest-management route", async () => {
    expect((await request(app).get("/api/contests/my").set(auth(STUDENT))).status).toBe(403);
    expect((await request(app).get("/api/contests/game-options").set(auth(STUDENT))).status).toBe(403);
    expect((await request(app).post(`/api/contests/${oid(1)}/submit`).set(auth(STUDENT))).status).toBe(403);
  });

  test("a PENDING (unapproved) teacher is blocked with TEACHER_PENDING", async () => {
    const res = await request(app).post("/api/contests").set(auth(PENDING)).send(validBody());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("TEACHER_PENDING");
    expect(Contest.create).not.toHaveBeenCalled();
  });

  test("a token for a deleted user -> 401", async () => {
    const res = await request(app).get("/api/contests/my").set(auth(oid(999)));
    expect(res.status).toBe(401);
  });

  test("an ADMIN can create (existing admin access is preserved)", async () => {
    const res = await request(app).post("/api/contests").set(auth(ADMIN)).send(validBody());
    expect(res.status).toBe(201);
  });
});

describe("POST /api/contests — valid creation", () => {
  test("a TEACHER can create a valid contest; owner comes from the token, status is DRAFT", async () => {
    const res = await request(app).post("/api/contests").set(auth(TEACHER)).send(validBody());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Weekly Fractions Blitz",
      grade: 6,
      subject: "Mathematics",
      chapterTitle: "Fractions",
      status: "DRAFT",
      phase: null,
    });
    expect(res.body.challenges).toEqual([
      expect.objectContaining({ title: "Build 1/2", gameType: "MATH_FRACTION_BUILDER", label: "Fraction Builder" }),
    ]);
    expect(Contest.create.mock.calls[0][0].teacher_id).toBe(TEACHER);
  });

  test("a client cannot choose the owner, or force PUBLISHED status", async () => {
    const res = await request(app)
      .post("/api/contests")
      .set(auth(TEACHER))
      .send(validBody({ teacher_id: OTHER_TEACHER, teacherId: OTHER_TEACHER, status: "PUBLISHED" }));
    expect(res.status).toBe(201);
    const saved = Contest.create.mock.calls[0][0];
    expect(saved.teacher_id).toBe(TEACHER);
    expect(saved.status).toBe("DRAFT");
  });

  test("submitForApproval:true creates it as PENDING_APPROVAL", async () => {
    const res = await request(app).post("/api/contests").set(auth(TEACHER)).send(validBody({ submitForApproval: true }));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDING_APPROVAL");
  });

  test("chapter is optional; games from any chapter of the subject are accepted", async () => {
    const res = await request(app)
      .post("/api/contests")
      .set(auth(TEACHER))
      .send(validBody({ chapterId: undefined, challengeIds: [G_A, G_B] }));
    expect(res.status).toBe(201);
    expect(res.body.chapterId).toBeNull();
    expect(res.body.challenges).toHaveLength(2);
  });
});

describe("POST /api/contests — invalid data / references are rejected", () => {
  const rejected = async (body, status, messagePart) => {
    const res = await request(app).post("/api/contests").set(auth(TEACHER)).send(body);
    expect(res.status).toBe(status);
    if (messagePart) expect(res.body.message).toMatch(messagePart);
    expect(Contest.create).not.toHaveBeenCalled();
  };

  test("missing title", () => rejected(validBody({ title: "" }), 400, /title/i));
  test("invalid grade", () => rejected(validBody({ grade: 3 }), 400, /grade/i));
  test("end before start", () => rejected(validBody({ endAt: future(0.5) }), 400, /after start/i));
  test("no challenges", () => rejected(validBody({ challengeIds: [] }), 400, /at least one/i));
  test("malformed subject id", () => rejected(validBody({ subjectId: "xyz" }), 400, /subjectId/));
  test("subject that does not exist", () => rejected(validBody({ subjectId: oid(777) }), 404, /Subject not found/));
  test("subject from a different grade", () => rejected(validBody({ subjectId: MATH7 }), 400, /grade/i));
  test("chapter that does not exist", () => rejected(validBody({ chapterId: oid(778) }), 404, /Chapter not found/));
  test("chapter from another subject", () => rejected(validBody({ chapterId: CH_SCI }), 400, /chapter does not belong/i));
  test("game that does not exist", () => rejected(validBody({ challengeIds: [oid(779)] }), 404, /games were not found/i));
  test("game from a different subject", () => rejected(validBody({ chapterId: undefined, challengeIds: [G_SCI] }), 400, /do not belong/i));
  test("game from a different chapter than the chosen one", () => rejected(validBody({ challengeIds: [G_B] }), 400, /do not belong/i));
  test("game whose type is not a playable Learnova game", () => rejected(validBody({ challengeIds: [G_BAD] }), 400, /not playable/i));
  test("mixing a valid game with an out-of-scope one", () =>
    rejected(validBody({ chapterId: undefined, challengeIds: [G_A, G_SCI] }), 400, /do not belong/i));
});

describe("GET /api/contests/my", () => {
  test("a teacher sees only their own contests", async () => {
    await request(app).post("/api/contests").set(auth(TEACHER)).send(validBody({ title: "Mine" }));
    await request(app).post("/api/contests").set(auth(OTHER_TEACHER)).send(validBody({ title: "Theirs" }));

    const res = await request(app).get("/api/contests/my").set(auth(TEACHER));
    expect(res.status).toBe(200);
    expect(res.body.contests.map((c) => c.title)).toEqual(["Mine"]);
    expect(Contest.find).toHaveBeenLastCalledWith({ teacher_id: TEACHER });
  });

  test("returns an empty list when there are none", async () => {
    const res = await request(app).get("/api/contests/my").set(auth(TEACHER));
    expect(res.status).toBe(200);
    expect(res.body.contests).toEqual([]);
  });

  test("a published contest reports a derived phase", async () => {
    contestStore.push({
      _id: oid(600), title: "Live", description: "", teacher_id: TEACHER, grade: 6, subject_id: MATH6, chapter_id: null,
      challenges: [{ game_content_id: G_A }], status: "PUBLISHED",
      start_at: new Date(Date.now() - 3600e3), end_at: new Date(Date.now() + 3600e3), createdAt: new Date(),
    });
    const res = await request(app).get("/api/contests/my").set(auth(TEACHER));
    expect(res.body.contests[0]).toMatchObject({ status: "PUBLISHED", phase: "ACTIVE" });
  });

  test("survives a game that was deleted after the contest was created", async () => {
    contestStore.push({
      _id: oid(601), title: "Orphan", description: "", teacher_id: TEACHER, grade: 6, subject_id: MATH6, chapter_id: null,
      challenges: [{ game_content_id: oid(4040) }], status: "DRAFT",
      start_at: new Date(Date.now() + 3600e3), end_at: new Date(Date.now() + 7200e3), createdAt: new Date(),
    });
    const res = await request(app).get("/api/contests/my").set(auth(TEACHER));
    expect(res.status).toBe(200);
    expect(res.body.contests[0].challenges[0].title).toBe("Removed content");
  });
});

describe("POST /api/contests/:id/submit", () => {
  const createDraft = async (userId = TEACHER) => (await request(app).post("/api/contests").set(auth(userId)).send(validBody())).body;

  test("owner can submit a draft for approval", async () => {
    const draft = await createDraft();
    const res = await request(app).post(`/api/contests/${draft.id}/submit`).set(auth(TEACHER));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PENDING_APPROVAL");
  });

  test("another teacher gets 404 (existence is not leaked) and nothing changes", async () => {
    const draft = await createDraft();
    const res = await request(app).post(`/api/contests/${draft.id}/submit`).set(auth(OTHER_TEACHER));
    expect(res.status).toBe(404);
    expect(contestStore[0].status).toBe("DRAFT");
  });

  test("cannot re-submit or submit a published contest", async () => {
    const draft = await createDraft();
    await request(app).post(`/api/contests/${draft.id}/submit`).set(auth(TEACHER));
    expect((await request(app).post(`/api/contests/${draft.id}/submit`).set(auth(TEACHER))).status).toBe(400);
    contestStore[0].status = "PUBLISHED";
    expect((await request(app).post(`/api/contests/${draft.id}/submit`).set(auth(TEACHER))).status).toBe(400);
  });

  test("a REJECTED contest can be resubmitted", async () => {
    const draft = await createDraft();
    contestStore[0].status = "REJECTED";
    const res = await request(app).post(`/api/contests/${draft.id}/submit`).set(auth(TEACHER));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PENDING_APPROVAL");
  });

  test("cannot submit a contest whose end time has passed", async () => {
    const draft = await createDraft();
    contestStore[0].end_at = new Date(Date.now() - 1000);
    expect((await request(app).post(`/api/contests/${draft.id}/submit`).set(auth(TEACHER))).status).toBe(400);
  });

  test("invalid id -> 400, unknown id -> 404", async () => {
    expect((await request(app).post("/api/contests/not-an-id/submit").set(auth(TEACHER))).status).toBe(400);
    expect((await request(app).post(`/api/contests/${oid(4242)}/submit`).set(auth(TEACHER))).status).toBe(404);
  });
});

describe("GET /api/contests/game-options", () => {
  test("lists playable games for a subject, in chapter order, WITHOUT payload/answer keys", async () => {
    const res = await request(app).get(`/api/contests/game-options?subjectId=${MATH6}`).set(auth(TEACHER));
    expect(res.status).toBe(200);
    expect(res.body.games.map((g) => g.id)).toEqual([G_A, G_B]); // G_BAD (unknown type) excluded, sci excluded
    expect(res.body.games[0]).toMatchObject({ label: "Fraction Builder", chapterTitle: "Fractions", conceptTitle: "Equivalent fractions" });
    expect(JSON.stringify(res.body)).not.toContain("ANSWER-KEY");
    expect(res.body.games[0]).not.toHaveProperty("payload");
  });

  test("can be narrowed to one chapter", async () => {
    const res = await request(app).get(`/api/contests/game-options?subjectId=${MATH6}&chapterId=${CH_B}`).set(auth(TEACHER));
    expect(res.body.games.map((g) => g.id)).toEqual([G_B]);
  });

  test("rejects bad / mismatched / unknown ids", async () => {
    expect((await request(app).get("/api/contests/game-options").set(auth(TEACHER))).status).toBe(400);
    expect((await request(app).get(`/api/contests/game-options?subjectId=${MATH6}&chapterId=zzz`).set(auth(TEACHER))).status).toBe(400);
    expect((await request(app).get(`/api/contests/game-options?subjectId=${MATH6}&chapterId=${CH_SCI}`).set(auth(TEACHER))).status).toBe(400);
    expect((await request(app).get(`/api/contests/game-options?subjectId=${oid(888)}`).set(auth(TEACHER))).status).toBe(404);
  });
});

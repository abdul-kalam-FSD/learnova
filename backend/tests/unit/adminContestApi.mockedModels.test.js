// Admin contest review API tests with MOCKED persistence.
//
// Drives the REAL admin router (protect + requireAdmin), the REAL teacher
// contest router (protect + requireTeacher) and the REAL controllers over
// HTTP with supertest, sharing one in-memory contest store so the whole
// teacher -> admin -> teacher flow is exercised. Mongoose models are
// replaced by small fakes, so this proves RBAC, lifecycle and controller
// logic — NOT real MongoDB behaviour (casts, validators, indexes). The
// real-DB counterpart is tests/integration/adminContests.test.js.

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
const adminRoutes = require("../../src/routes/adminroutes");
const contestRoutes = require("../../src/routes/contestroutes");
const { notFound, globalErrorHandler } = require("../../src/middleware/errorHandler");

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);
app.use("/api/contests", contestRoutes);
app.use(notFound);
app.use(globalErrorHandler);

const oid = (n) => n.toString(16).padStart(24, "0");
const auth = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` });

// ---- in-memory fake model helpers ---------------------------------
const matches = (doc, filter = {}) =>
  Object.entries(filter).every(([k, v]) =>
    v && typeof v === "object" && "$in" in v ? v.$in.map(String).includes(String(doc[k])) : String(doc[k]) === String(v),
  );
// Chainable, awaitable query with a real sort/skip/limit.
const query = (rows) => {
  // find() resolves to an array; findById() to a single doc or null.
  let out = Array.isArray(rows) ? [...rows] : rows;
  const q = {
    select: () => q,
    sort: (spec) => {
      if (!Array.isArray(out)) return q;
      const keys = Object.entries(spec || {});
      out.sort((a, b) => {
        for (const [k, dir] of keys) {
          const av = a[k] == null ? Infinity : new Date(a[k]).getTime() || a[k];
          const bv = b[k] == null ? Infinity : new Date(b[k]).getTime() || b[k];
          if (av < bv) return -dir;
          if (av > bv) return dir;
        }
        return 0;
      });
      return q;
    },
    skip: (n) => ((out = Array.isArray(out) ? out.slice(n) : out), q),
    limit: (n) => ((out = Array.isArray(out) ? out.slice(0, n) : out), q),
    then: (res, rej) => Promise.resolve(out).then(res, rej),
  };
  return q;
};
const wire = (Model, docs) => {
  Model.find.mockImplementation((f) => query(docs.filter((d) => matches(d, f))));
  Model.findById.mockImplementation((id) => query(docs.find((d) => String(d._id) === String(id)) || null));
};

// ---- fixtures ------------------------------------------------------
const STUDENT = oid(901), TEACHER = oid(902), OTHER_TEACHER = oid(903), ADMIN = oid(904), ADMIN2 = oid(905), PENDING_T = oid(906);
const users = [
  { _id: STUDENT, name: "Stu", email: "s@x.com", role: "student", status: "active" },
  { _id: TEACHER, name: "Tina Teacher", email: "t@x.com", role: "teacher", status: "active" },
  { _id: OTHER_TEACHER, name: "Omar Other", email: "o@x.com", role: "teacher", status: "active" },
  { _id: ADMIN, name: "Ada Admin", email: "a@x.com", role: "admin", status: "active" },
  { _id: ADMIN2, name: "Abe Admin", email: "a2@x.com", role: "admin", status: "active" },
  { _id: PENDING_T, name: "Pat Pending", email: "p@x.com", role: "teacher", status: "pending" },
];
const MATH6 = oid(1);
const CH_A = oid(11);
const K_A = oid(21);
const G_A = oid(31), G_B = oid(32);
const subjects = [{ _id: MATH6, name: "Mathematics", grade: 6 }];
const chapters = [{ _id: CH_A, subject_id: MATH6, title: "Fractions", order_index: 1 }];
const concepts = [{ _id: K_A, chapter_id: CH_A, title: "Equivalent fractions" }];
let games;

const ALL_ADMIN_ROUTES = (id = oid(4242)) => [
  ["get", "/api/admin/contests"],
  ["get", `/api/admin/contests/${id}`],
  ["post", `/api/admin/contests/${id}/approve`],
  ["post", `/api/admin/contests/${id}/reject`],
];

let store;
let seq;
const future = (h) => new Date(Date.now() + h * 3600 * 1000);
const seed = (over = {}) => {
  const doc = {
    _id: oid(700 + seq++),
    title: "Contest " + seq,
    description: "desc",
    teacher_id: TEACHER,
    grade: 6,
    subject_id: MATH6,
    chapter_id: CH_A,
    challenges: [{ game_content_id: G_A }, { game_content_id: G_B }],
    start_at: future(1),
    end_at: future(25),
    status: "PENDING_APPROVAL",
    submitted_at: new Date(Date.now() - 1000 * seq),
    reviewed_by: null,
    reviewed_at: null,
    review_note: "",
    createdAt: new Date(Date.now() - 5000 * seq),
    updatedAt: new Date(),
    ...over,
  };
  store.push(doc);
  return doc;
};
const validCreateBody = (over = {}) => ({
  title: "Weekly Fractions Blitz",
  description: "Play both",
  grade: 6,
  subjectId: MATH6,
  chapterId: CH_A,
  challengeIds: [G_A],
  startAt: future(1).toISOString(),
  endAt: future(25).toISOString(),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  if (!process.env.DEBUG_TEST) jest.spyOn(console, "error").mockImplementation(() => {});
  store = [];
  seq = 1;
  games = [
    { _id: G_A, concept_id: K_A, game_type: "MATH_FRACTION_BUILDER", title: "Build 1/2", difficulty: "easy", order_index: 1, payload: { secret: "ANSWER-KEY" } },
    { _id: G_B, concept_id: K_A, game_type: "MATH_FRACTION_MATCH", title: "Match it", difficulty: "medium", order_index: 2, payload: { secret: "ANSWER-KEY" } },
  ];
  wire(User, users);
  wire(Subject, subjects);
  wire(Chapter, chapters);
  wire(Concept, concepts);
  wire(GameContent, games);

  Contest.create.mockImplementation(async (d) => {
    const doc = { _id: oid(500 + store.length), createdAt: new Date(), updatedAt: new Date(), reviewed_by: null, reviewed_at: null, review_note: "", ...d };
    store.push(doc);
    return doc;
  });
  Contest.find.mockImplementation((f) => query(store.filter((d) => matches(d, f))));
  Contest.findById.mockImplementation((id) => query(store.find((d) => String(d._id) === String(id)) || null));
  Contest.countDocuments.mockImplementation(async (f) => store.filter((d) => matches(d, f)).length);
  // Conditional update: applies only when EVERY filter key matches, like Mongo.
  Contest.findOneAndUpdate.mockImplementation(async (filter, update) => {
    const doc = store.find((d) => matches(d, filter));
    if (!doc) return null;
    Object.assign(doc, update.$set, { updatedAt: new Date() });
    return doc;
  });
});
afterEach(() => console.error.mockRestore?.());

// =====================================================================
describe("RBAC: only an ADMIN reaches contest review", () => {
  test("no token -> 401 on every admin contest route", async () => {
    for (const [method, url] of ALL_ADMIN_ROUTES()) {
      expect((await request(app)[method](url)).status).toBe(401);
    }
  });

  test.each([
    ["student", STUDENT],
    ["teacher", TEACHER],
    ["another teacher", OTHER_TEACHER],
    ["pending teacher", PENDING_T],
  ])("a %s gets 403 on every admin contest route and nothing changes", async (_label, userId) => {
    const c = seed();
    for (const [method, url] of ALL_ADMIN_ROUTES(c._id)) {
      const res = await request(app)[method](url).set(auth(userId)).send({ note: "Not good enough at all" });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Admin access required");
    }
    expect(store[0].status).toBe("PENDING_APPROVAL");
    expect(store[0].reviewed_by).toBeNull();
    expect(Contest.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("a teacher cannot approve THEIR OWN contest (403), and the teacher router has no approve route (404)", async () => {
    const c = seed({ teacher_id: TEACHER });
    expect((await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(TEACHER))).status).toBe(403);
    expect((await request(app).post(`/api/contests/${c._id}/approve`).set(auth(TEACHER))).status).toBe(404);
    expect((await request(app).patch(`/api/contests/${c._id}`).set(auth(TEACHER)).send({ status: "PUBLISHED" })).status).toBe(404);
    expect(store[0].status).toBe("PENDING_APPROVAL");
  });

  test("a token for a deleted user is refused", async () => {
    expect((await request(app).get("/api/admin/contests").set(auth(oid(999)))).status).toBe(401);
  });
});

// =====================================================================
describe("GET /api/admin/contests (review queue)", () => {
  test("lists submitted contests only — DRAFTs are hidden — with useful review fields", async () => {
    seed({ status: "PENDING_APPROVAL", title: "Pending one" });
    seed({ status: "PUBLISHED", title: "Published one", reviewed_by: ADMIN });
    seed({ status: "REJECTED", title: "Rejected one", reviewed_by: ADMIN, review_note: "Too easy" });
    seed({ status: "DRAFT", title: "Private draft", submitted_at: null });

    const res = await request(app).get("/api/admin/contests").set(auth(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body.contests.map((c) => c.title).sort()).toEqual(["Pending one", "Published one", "Rejected one"]);
    expect(res.body.counts).toEqual({ PENDING_APPROVAL: 1, PUBLISHED: 1, REJECTED: 1 });
    expect(res.body.total).toBe(3);

    const row = res.body.contests.find((c) => c.title === "Pending one");
    expect(row).toMatchObject({
      grade: 6,
      subject: "Mathematics",
      chapterTitle: "Fractions",
      challengeCount: 2,
      status: "PENDING_APPROVAL",
      teacher: { name: "Tina Teacher", email: "t@x.com" },
    });
    expect(row.startAt).toBeDefined();
    expect(row.endAt).toBeDefined();
    expect(row.submittedAt).toBeDefined();
    expect(row).not.toHaveProperty("challenges"); // detail-only
  });

  test("status filter works; invalid status -> 400", async () => {
    seed({ status: "PENDING_APPROVAL" });
    seed({ status: "PUBLISHED" });
    const pend = await request(app).get("/api/admin/contests?status=PENDING_APPROVAL").set(auth(ADMIN));
    expect(pend.body.contests).toHaveLength(1);
    expect(pend.body.contests[0].status).toBe("PENDING_APPROVAL");
    expect((await request(app).get("/api/admin/contests?status=DRAFT").set(auth(ADMIN))).status).toBe(400);
    expect((await request(app).get("/api/admin/contests?status=bogus").set(auth(ADMIN))).status).toBe(400);
  });

  test("pending queue is oldest-submission-first", async () => {
    seed({ title: "newer", submitted_at: new Date("2030-01-02") });
    seed({ title: "oldest", submitted_at: new Date("2030-01-01") });
    seed({ title: "newest", submitted_at: new Date("2030-01-03") });
    const res = await request(app).get("/api/admin/contests?status=PENDING_APPROVAL").set(auth(ADMIN));
    expect(res.body.contests.map((c) => c.title)).toEqual(["oldest", "newer", "newest"]);
  });

  test("paginates", async () => {
    for (let i = 0; i < 5; i++) seed();
    const res = await request(app).get("/api/admin/contests?limit=2&page=2").set(auth(ADMIN));
    expect(res.body).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(res.body.contests).toHaveLength(2);
  });

  test("shows the reviewer name on reviewed contests", async () => {
    seed({ status: "REJECTED", reviewed_by: ADMIN, review_note: "Needs work" });
    const res = await request(app).get("/api/admin/contests?status=REJECTED").set(auth(ADMIN));
    expect(res.body.contests[0].reviewedBy).toMatchObject({ name: "Ada Admin" });
  });
});

// =====================================================================
describe("GET /api/admin/contests/:id (inspect details)", () => {
  test("returns full detail incl. games, but NEVER answer keys / payloads", async () => {
    const c = seed({ description: "Read carefully" });
    const res = await request(app).get(`/api/admin/contests/${c._id}`).set(auth(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: c.title,
      description: "Read carefully",
      teacher: { name: "Tina Teacher" },
      subject: "Mathematics",
      chapterTitle: "Fractions",
    });
    expect(res.body.challenges.map((g) => g.title)).toEqual(["Build 1/2", "Match it"]);
    expect(res.body.challenges[0]).toMatchObject({ label: "Fraction Builder", difficulty: "easy" });
    expect(JSON.stringify(res.body)).not.toContain("ANSWER-KEY");
    expect(res.body.challenges[0]).not.toHaveProperty("payload");
  });

  test("400 invalid id, 404 unknown id, 404 for a private DRAFT", async () => {
    const draft = seed({ status: "DRAFT" });
    expect((await request(app).get("/api/admin/contests/not-an-id").set(auth(ADMIN))).status).toBe(400);
    expect((await request(app).get(`/api/admin/contests/${oid(31337)}`).set(auth(ADMIN))).status).toBe(404);
    expect((await request(app).get(`/api/admin/contests/${draft._id}`).set(auth(ADMIN))).status).toBe(404);
  });
});

// =====================================================================
describe("POST /api/admin/contests/:id/approve", () => {
  test("PENDING_APPROVAL -> PUBLISHED with server-controlled reviewer and timestamp", async () => {
    const c = seed();
    const before = Date.now();
    const res = await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN)).send({});
    const after = Date.now();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PUBLISHED");
    expect(res.body.phase).toBe("UPCOMING");
    expect(res.body.reviewedBy).toMatchObject({ id: ADMIN, name: "Ada Admin" });

    expect(store[0].status).toBe("PUBLISHED");
    expect(store[0].reviewed_by).toBe(ADMIN);
    expect(store[0].reviewed_at.getTime()).toBeGreaterThanOrEqual(before);
    expect(store[0].reviewed_at.getTime()).toBeLessThanOrEqual(after);
  });

  test("client-supplied status / reviewed_by / reviewed_at are ignored", async () => {
    const c = seed();
    const before = Date.now();
    const res = await request(app)
      .post(`/api/admin/contests/${c._id}/approve`)
      .set(auth(ADMIN))
      .send({ status: "DRAFT", reviewed_by: OTHER_TEACHER, reviewedBy: OTHER_TEACHER, reviewed_at: "2000-01-01T00:00:00Z", reviewedAt: "2000-01-01T00:00:00Z" });
    expect(res.status).toBe(200);
    expect(store[0].status).toBe("PUBLISHED");
    expect(store[0].reviewed_by).toBe(ADMIN);
    expect(store[0].reviewed_at.getTime()).toBeGreaterThanOrEqual(before);
  });

  test("an optional note is stored trimmed; over-long / non-string note -> 400", async () => {
    const c = seed();
    expect((await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN)).send({ note: "x".repeat(501) })).status).toBe(400);
    expect((await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN)).send({ note: { $ne: 1 } })).status).toBe(400);
    expect(store[0].status).toBe("PENDING_APPROVAL");
    const ok = await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN)).send({ note: "  Great contest  " });
    expect(ok.status).toBe(200);
    expect(store[0].review_note).toBe("Great contest");
  });

  test("repeated approval -> 409 and the first review is not overwritten", async () => {
    const c = seed();
    await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN)).send({});
    const firstAt = store[0].reviewed_at;
    const again = await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN2)).send({});
    expect(again.status).toBe(409);
    expect(again.body.message).toMatch(/already been published/);
    expect(store[0].reviewed_by).toBe(ADMIN);
    expect(store[0].reviewed_at).toBe(firstAt);
  });

  test("invalid statuses cannot be approved: REJECTED -> 409 (must be resubmitted), PUBLISHED -> 409, DRAFT -> 404", async () => {
    const rej = seed({ status: "REJECTED" });
    const pub = seed({ status: "PUBLISHED" });
    const draft = seed({ status: "DRAFT" });
    const r1 = await request(app).post(`/api/admin/contests/${rej._id}/approve`).set(auth(ADMIN));
    expect(r1.status).toBe(409);
    expect((await request(app).post(`/api/admin/contests/${pub._id}/approve`).set(auth(ADMIN))).status).toBe(409);
    expect((await request(app).post(`/api/admin/contests/${draft._id}/approve`).set(auth(ADMIN))).status).toBe(404);
    expect(store.map((d) => d.status)).toEqual(["REJECTED", "PUBLISHED", "DRAFT"]);
    expect(store.every((d) => d.reviewed_by === null)).toBe(true);
  });

  test("nonexistent contest -> 404; malformed id -> 400", async () => {
    expect((await request(app).post(`/api/admin/contests/${oid(31337)}/approve`).set(auth(ADMIN))).status).toBe(404);
    expect((await request(app).post("/api/admin/contests/nope/approve").set(auth(ADMIN))).status).toBe(400);
  });

  test("cannot approve a contest whose end time has already passed", async () => {
    const c = seed({ start_at: future(-5), end_at: future(-1) });
    const res = await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/end time has already passed/);
    expect(store[0].status).toBe("PENDING_APPROVAL");
  });

  test("cannot approve a contest whose games were deleted", async () => {
    const c = seed({ challenges: [{ game_content_id: G_A }, { game_content_id: oid(4040) }] });
    const res = await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/no longer exist/);
    expect(store[0].status).toBe("PENDING_APPROVAL");
  });

  test("a lost race (someone else changed it after we read it) -> 409, no overwrite", async () => {
    const c = seed();
    Contest.findOneAndUpdate.mockResolvedValueOnce(null);
    const res = await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/just reviewed/);
  });

  test("the update is conditional on the validated status", async () => {
    const c = seed();
    await request(app).post(`/api/admin/contests/${c._id}/approve`).set(auth(ADMIN));
    expect(Contest.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ status: "PENDING_APPROVAL" });
  });
});

// =====================================================================
describe("POST /api/admin/contests/:id/reject", () => {
  test("PENDING_APPROVAL -> REJECTED with reason, server-controlled reviewer and timestamp", async () => {
    const c = seed();
    const before = Date.now();
    const res = await request(app).post(`/api/admin/contests/${c._id}/reject`).set(auth(ADMIN)).send({ note: "  Games are too easy for grade 6  " });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "REJECTED", reviewNote: "Games are too easy for grade 6", phase: null });
    expect(store[0]).toMatchObject({ status: "REJECTED", reviewed_by: ADMIN, review_note: "Games are too easy for grade 6" });
    expect(store[0].reviewed_at.getTime()).toBeGreaterThanOrEqual(before);
  });

  test.each([
    ["missing", undefined],
    ["empty", ""],
    ["whitespace only", "     "],
    ["too short", "no"],
    ["not a string", { $gt: "" }],
    ["too long", "x".repeat(501)],
  ])("rejection with a %s reason -> 400 and the contest is untouched", async (_l, note) => {
    const c = seed();
    const res = await request(app).post(`/api/admin/contests/${c._id}/reject`).set(auth(ADMIN)).send({ note });
    expect(res.status).toBe(400);
    expect(store[0].status).toBe("PENDING_APPROVAL");
    expect(store[0].reviewed_by).toBeNull();
    expect(Contest.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("client-supplied status / reviewer / timestamp are ignored", async () => {
    const c = seed();
    const res = await request(app)
      .post(`/api/admin/contests/${c._id}/reject`)
      .set(auth(ADMIN))
      .send({ note: "Please add more games", status: "PUBLISHED", reviewed_by: OTHER_TEACHER, reviewed_at: "2000-01-01T00:00:00Z" });
    expect(res.status).toBe(200);
    expect(store[0].status).toBe("REJECTED");
    expect(store[0].reviewed_by).toBe(ADMIN);
    expect(store[0].reviewed_at.getFullYear()).toBeGreaterThan(2020);
  });

  test("repeated rejection -> 409 and the first reason/reviewer are kept", async () => {
    const c = seed();
    await request(app).post(`/api/admin/contests/${c._id}/reject`).set(auth(ADMIN)).send({ note: "First reason here" });
    const again = await request(app).post(`/api/admin/contests/${c._id}/reject`).set(auth(ADMIN2)).send({ note: "Second reason here" });
    expect(again.status).toBe(409);
    expect(store[0].review_note).toBe("First reason here");
    expect(store[0].reviewed_by).toBe(ADMIN);
  });

  test("cannot reject an already-published contest (PUBLISHED is terminal) or a draft", async () => {
    const pub = seed({ status: "PUBLISHED" });
    const draft = seed({ status: "DRAFT" });
    expect((await request(app).post(`/api/admin/contests/${pub._id}/reject`).set(auth(ADMIN)).send({ note: "Changed my mind" })).status).toBe(409);
    expect((await request(app).post(`/api/admin/contests/${draft._id}/reject`).set(auth(ADMIN)).send({ note: "Changed my mind" })).status).toBe(404);
    expect(store.map((d) => d.status)).toEqual(["PUBLISHED", "DRAFT"]);
  });

  test("nonexistent -> 404, malformed id -> 400", async () => {
    expect((await request(app).post(`/api/admin/contests/${oid(31337)}/reject`).set(auth(ADMIN)).send({ note: "Some reason" })).status).toBe(404);
    expect((await request(app).post("/api/admin/contests/zzz/reject").set(auth(ADMIN)).send({ note: "Some reason" })).status).toBe(400);
  });

  test("a rejection can still be issued even if the end time has passed (so the teacher gets feedback)", async () => {
    const c = seed({ start_at: future(-5), end_at: future(-1) });
    expect((await request(app).post(`/api/admin/contests/${c._id}/reject`).set(auth(ADMIN)).send({ note: "Please reschedule" })).status).toBe(200);
  });
});

// =====================================================================
describe("end-to-end lifecycle (teacher <-> admin)", () => {
  const post = (url, who, body) => request(app).post(url).set(auth(who)).send(body);

  test("create -> submit -> reject -> teacher sees note -> resubmit (same contest) -> approve -> PUBLISHED", async () => {
    // Teacher creates a DRAFT, and the admin can't see it yet.
    const created = (await post("/api/contests", TEACHER, validCreateBody())).body;
    expect(created.status).toBe("DRAFT");
    expect((await request(app).get(`/api/admin/contests/${created.id}`).set(auth(ADMIN))).status).toBe(404);
    expect((await request(app).get("/api/admin/contests").set(auth(ADMIN))).body.total).toBe(0);

    // Teacher submits -> shows up in the admin queue with a submission time.
    const submitted = await post(`/api/contests/${created.id}/submit`, TEACHER);
    expect(submitted.body.status).toBe("PENDING_APPROVAL");
    expect(submitted.body.submittedAt).toBeTruthy();
    const queue = await request(app).get("/api/admin/contests?status=PENDING_APPROVAL").set(auth(ADMIN));
    expect(queue.body.contests.map((c) => c.id)).toEqual([created.id]);
    expect(queue.body.contests[0].teacher.name).toBe("Tina Teacher");

    // Admin rejects with a reason.
    expect((await post(`/api/admin/contests/${created.id}/reject`, ADMIN, { note: "Add a harder game" })).status).toBe(200);

    // Teacher sees REJECTED + the reason, and the admin's identity is not exposed to them.
    const mine1 = (await request(app).get("/api/contests/my").set(auth(TEACHER))).body.contests;
    expect(mine1).toHaveLength(1);
    expect(mine1[0]).toMatchObject({ status: "REJECTED", reviewNote: "Add a harder game" });
    expect(mine1[0]).not.toHaveProperty("reviewedBy");
    expect(mine1[0]).not.toHaveProperty("reviewed_by");

    // A rejected contest cannot be published without resubmission.
    expect((await post(`/api/admin/contests/${created.id}/approve`, ADMIN, {})).status).toBe(409);

    // Teacher resubmits the SAME contest (no duplicate is created).
    const resub = await post(`/api/contests/${created.id}/submit`, TEACHER);
    expect(resub.status).toBe(200);
    expect(resub.body.status).toBe("PENDING_APPROVAL");
    expect(store).toHaveLength(1);

    // Admin approves.
    const approved = await post(`/api/admin/contests/${created.id}/approve`, ADMIN, {});
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe("PUBLISHED");

    // Teacher sees PUBLISHED, the stale rejection reason is gone, phase is derived.
    const mine2 = (await request(app).get("/api/contests/my").set(auth(TEACHER))).body.contests;
    expect(mine2[0]).toMatchObject({ status: "PUBLISHED", phase: "UPCOMING", reviewNote: "" });

    // PUBLISHED is terminal: no resubmit, no second approve/reject.
    expect((await post(`/api/contests/${created.id}/submit`, TEACHER)).status).toBe(400);
    expect((await post(`/api/admin/contests/${created.id}/approve`, ADMIN, {})).status).toBe(409);
    expect((await post(`/api/admin/contests/${created.id}/reject`, ADMIN, { note: "Too late now" })).status).toBe(409);
  });

  test("a teacher cannot publish by creating with status PUBLISHED or by submitting", async () => {
    const created = (await post("/api/contests", TEACHER, validCreateBody({ status: "PUBLISHED", reviewed_by: ADMIN }))).body;
    expect(created.status).toBe("DRAFT");
    expect(store[0].reviewed_by).toBeNull();
    const submitted = await post(`/api/contests/${created.id}/submit`, TEACHER, { status: "PUBLISHED" });
    expect(submitted.body.status).toBe("PENDING_APPROVAL");
  });

  test("another teacher cannot submit someone else's contest, and a student cannot touch any status", async () => {
    const created = (await post("/api/contests", TEACHER, validCreateBody())).body;
    expect((await post(`/api/contests/${created.id}/submit`, OTHER_TEACHER)).status).toBe(404);
    expect((await post(`/api/contests/${created.id}/submit`, STUDENT)).status).toBe(403);
    expect((await post(`/api/admin/contests/${created.id}/approve`, STUDENT, {})).status).toBe(403);
    expect(store[0].status).toBe("DRAFT");
  });
});

// Integration tests for contest RESULTS + LEADERBOARD against a real
// in-memory MongoDB: the real aggregation pipeline, the real unique
// contest-session index and the real game flow.
// Same mongodb-memory-server + supertest pattern as studentContests.test.js.
// Run with: npx jest tests/integration/contestResults.test.js
//
// The same behaviours are covered WITHOUT a database in
// tests/unit/contestResultsApi.mockedModels.test.js, whose aggregation is
// run through a small evaluator. THIS file is what proves the pipeline
// against genuine MongoDB semantics.

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.FRONTEND_URL = "http://localhost:5173";
  app = require("../../src/app");
  await mongoose.connection.asPromise();
  await require("../../src/models/QuizzSession").init();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

const User = require("../../src/models/User");
const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const GameContent = require("../../src/models/GameContent");
const Contest = require("../../src/models/Contest");
const Section = require("../../src/models/Section");
const QuizSession = require("../../src/models/QuizzSession");

async function registerAs(role, grade = 6, name) {
  const email = `${role}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app).post("/api/auth/register").send({ name: name || `Test ${role}`, email, password: "password123", grade });
  await User.findByIdAndUpdate(res.body.user.id, { role, status: "active" });
  return { token: res.body.token, userId: res.body.user.id, h: { Authorization: `Bearer ${res.body.token}` } };
}

async function seedContent(grade = 6) {
  const subject = await Subject.create({ name: "Mathematics", grade });
  const chapter = await Chapter.create({ subject_id: subject._id, title: "Fractions", order_index: 1 });
  const concept = await Concept.create({ chapter_id: chapter._id, title: "Equivalent fractions", explanation_text: "x" });
  const mk = (title, order) =>
    GameContent.create({
      game_type: "MATH_FRACTION_BUILDER", concept_id: concept._id, title, order_index: order,
      payload: { pieces: [{ id: "p1" }, { id: "p2" }, { id: "p3" }], correct_piece_ids: ["p1", "p2"] },
    });
  return { subject, chapter, a: await mk("Build 1/2", 1), b: await mk("Build 3/4", 2) };
}

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000);

// Real teacher -> admin flow, then shift the window so the contest is live.
async function publishedContest({ teacher, admin, content }) {
  const created = await request(app).post("/api/contests").set(teacher.h).send({
    title: "Weekly Fractions Blitz", description: "Play both", grade: 6,
    subjectId: content.subject._id.toString(), chapterId: content.chapter._id.toString(),
    challengeIds: [content.a._id.toString(), content.b._id.toString()],
    startAt: inHours(1).toISOString(), endAt: inHours(25).toISOString(),
  });
  await request(app).post(`/api/contests/${created.body.id}/submit`).set(teacher.h);
  await request(app).post(`/api/admin/contests/${created.body.id}/approve`).set(admin.h).send({});
  await Contest.findByIdAndUpdate(created.body.id, { start_at: inHours(-1), end_at: inHours(24) });
  return created.body.id;
}

// Plays one game through the REAL flow. `correct` picks the right/wrong answer.
async function play(student, contestId, content, { correct = true, finish = true } = {}) {
  const start = await request(app).post("/api/games/start").set(student.h).send({
    gameType: "MATH_FRACTION_BUILDER", contentId: content._id.toString(), ...(contestId ? { contestId } : {}),
  });
  expect(start.status).toBeLessThan(300);
  if (!finish) return start.body.sessionId;
  await request(app).post(`/api/games/${start.body.sessionId}/attempt`).set(student.h).send({ selectedPieceIds: correct ? ["p1", "p2"] : ["p1"] });
  const done = await request(app).post(`/api/games/${start.body.sessionId}/complete`).set(student.h);
  expect(done.status).toBe(200);
  return start.body.sessionId;
}

describe("results from real persisted sessions", () => {
  test("ranks students from the real aggregation; practice runs, unfinished and wrong games are handled", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const s1 = await registerAs("student", 6, "Ann");
    const s2 = await registerAs("student", 6, "Ben");
    const s3 = await registerAs("student", 6, "Cat");
    const s4 = await registerAs("student", 6, "Dan");
    const content = await seedContent();
    await Section.create({ name: "6A", grade: 6, teacher_id: teacher.userId, student_ids: [s1.userId] });
    const id = await publishedContest({ teacher, admin, content });

    await play(s1, id, content.a); await play(s1, id, content.b); // Ann: solves both
    await play(s2, id, content.a);                                // Ben: solves one
    await play(s2, null, content.b);                              // Ben also PRACTISES the other game — must not count
    await play(s3, id, content.a, { finish: false });             // Cat: started only
    await play(s4, id, content.a, { correct: false });            // Dan: finished, wrong

    const res = await request(app).get(`/api/contests/${id}/results`).set(teacher.h);
    expect(res.status).toBe(200);
    expect(res.body.rows.map((r) => [r.name, r.rank, r.status])).toEqual([
      ["Ann", 1, "COMPLETED"], ["Ben", 2, "PARTIAL"], ["Dan", null, "PARTIAL"], ["Cat", null, "IN_PROGRESS"],
    ]);
    const ann = res.body.rows[0];
    expect(ann).toMatchObject({ challengesSolved: 2, challengesCompleted: 2, correctAnswers: 2, totalAnswers: 2, accuracy: 100, completionPercent: 100 });
    // XP is exactly what the existing completion flow stored on the sessions
    const stored = await QuizSession.find({ contest_id: id, user_id: s1.userId });
    expect(ann.xpEarned).toBe(stored.reduce((sum, s) => sum + s.xp_awarded, 0));
    expect(res.body.rows.find((r) => r.name === "Ben").challengesStarted).toBe(1); // the practice run is not in the contest
    expect(res.body.rows.find((r) => r.name === "Cat")).toMatchObject({ challengesCompleted: 0, xpEarned: 0, elapsedSeconds: null });
    // email only for the teacher's own section students
    expect(res.body.rows.find((r) => r.name === "Ann").email).toBeTruthy();
    expect(res.body.rows.find((r) => r.name === "Ben").email).toBeNull();
    expect(res.body.summary).toEqual({ challengeCount: 2, participantCount: 4, completedCount: 1, partialCount: 2, inProgressCount: 1, rankedCount: 2 });
  });

  test("authorization across the three roles", async () => {
    const teacher = await registerAs("teacher");
    const other = await registerAs("teacher");
    const admin = await registerAs("admin");
    const student = await registerAs("student", 6);
    const content = await seedContent();
    const id = await publishedContest({ teacher, admin, content });
    await play(student, id, content.a);

    expect((await request(app).get(`/api/contests/${id}/results`).set(other.h)).status).toBe(404);
    expect((await request(app).get(`/api/contests/${id}/results`).set(student.h)).status).toBe(403);
    expect((await request(app).get(`/api/admin/contests/${id}/results`).set(teacher.h)).status).toBe(403);
    expect((await request(app).get(`/api/admin/contests/${id}/results`).set(student.h)).status).toBe(403);
    const asAdmin = await request(app).get(`/api/admin/contests/${id}/results`).set(admin.h);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.rows[0].email).toBeTruthy();
    const detail = await request(app).get(`/api/admin/contests/${id}/results/${student.userId}`).set(admin.h);
    expect(detail.status).toBe(200);
    expect(detail.body.challenges.map((c) => c.status)).toEqual(["COMPLETED", "NOT_STARTED"]);
    expect((await request(app).get("/api/contests/nope/results").set(teacher.h)).status).toBe(400);
  });

  test("unpublished contests expose nothing", async () => {
    const teacher = await registerAs("teacher");
    const content = await seedContent();
    const draft = await request(app).post("/api/contests").set(teacher.h).send({
      title: "Draft", grade: 6, subjectId: content.subject._id.toString(), challengeIds: [content.a._id.toString()],
      startAt: inHours(1).toISOString(), endAt: inHours(5).toISOString(),
    });
    const res = await request(app).get(`/api/contests/${draft.body.id}/results`).set(teacher.h);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONTEST_NOT_PUBLISHED");
  });

  test("student result + leaderboard: own result, public standings only, zero-participant contest is clean", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const s1 = await registerAs("student", 6, "Ann");
    const s2 = await registerAs("student", 6, "Ben");
    const s7 = await registerAs("student", 7, "Sev");
    const content = await seedContent();
    const id = await publishedContest({ teacher, admin, content });

    const empty = await request(app).get(`/api/student/contests/${id}/leaderboard`).set(s1.h);
    expect(empty.body).toMatchObject({ leaderboard: [], rankedCount: 0, currentUser: null });
    const none = await request(app).get(`/api/student/contests/${id}/result`).set(s1.h);
    expect(none.body).toMatchObject({ participated: false, result: null });

    await play(s1, id, content.a); await play(s2, id, content.a); await play(s2, id, content.b);
    const mine = await request(app).get(`/api/student/contests/${id}/result`).set(s1.h);
    expect(mine.body.result).toMatchObject({ rank: 2, challengesSolved: 1 });
    expect(JSON.stringify(mine.body)).not.toContain("@test.com");
    const board = await request(app).get(`/api/student/contests/${id}/leaderboard`).set(s1.h);
    expect(board.body.leaderboard.map((r) => [r.rank, r.name, r.isCurrentUser])).toEqual([[1, "Ben", false], [2, "Ann", true]]);
    expect(JSON.stringify(board.body)).not.toMatch(/@test\.com|studentId|xpEarned/);
    expect((await request(app).get(`/api/student/contests/${id}/leaderboard`).set(s7.h)).status).toBe(404);
  });
});

// ---------------------------------------------------------------------
// Excel export (real MongoDB, real aggregation, real xlsx)
// ---------------------------------------------------------------------
const ExcelJS = require("exceljs");

const binaryParser = (res, cb) => {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};
const downloadXlsx = async (url, who) => {
  const res = await request(app).get(url).set(who.h).buffer(true).parse(binaryParser);
  let workbook = null;
  if (res.status === 200) {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
  }
  return { res, workbook };
};

describe("excel export of contest results", () => {
  test("the file contains exactly the results the JSON endpoint reports, for the right people only", async () => {
    const teacher = await registerAs("teacher");
    const other = await registerAs("teacher");
    const admin = await registerAs("admin");
    const s1 = await registerAs("student", 6, "Ann");
    const s2 = await registerAs("student", 6, "Ben");
    const s3 = await registerAs("student", 6, "Cat");
    const content = await seedContent();
    await Section.create({ name: "6A", grade: 6, teacher_id: teacher.userId, student_ids: [s1.userId] });
    const id = await publishedContest({ teacher, admin, content });

    await play(s1, id, content.a); await play(s1, id, content.b);
    await play(s2, id, content.a);
    await play(s3, id, content.a, { finish: false });

    const api = (await request(app).get(`/api/contests/${id}/results?limit=100`).set(teacher.h)).body;

    // teacher (owner)
    const { res, workbook } = await downloadXlsx(`/api/contests/${id}/results/export`, teacher);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="Learnova_Contest_Weekly_Fractions_Blitz_Results\.xlsx"/);
    expect(workbook.worksheets.map((w) => w.name)).toEqual(["Contest Summary", "Results", "Challenge Details"]);
    const rows = [];
    workbook.getWorksheet("Results").eachRow((r, i) => { if (i > 1) rows.push(r.values.slice(1)); });
    expect(rows.map((r) => [r[1], r[0] ?? null, r[8]])).toEqual(api.rows.map((r) => [r.name, r.rank, r.challengesSolved]));
    expect(rows.find((r) => r[1] === "Ann")[3]).toBeTruthy();   // her section
    expect(rows.find((r) => r[1] === "Ben")[3] == null).toBe(true); // not in the teacher's section
    const detail = [];
    workbook.getWorksheet("Challenge Details").eachRow((r, i) => { if (i > 1) detail.push(r.values.slice(1)); });
    expect(detail).toHaveLength(3 * 2); // 3 participants x 2 games

    // another teacher / a student: nothing
    expect((await downloadXlsx(`/api/contests/${id}/results/export`, other)).res.status).toBe(404);
    expect((await downloadXlsx(`/api/contests/${id}/results/export`, s1)).res.status).toBe(403);
    expect((await downloadXlsx(`/api/admin/contests/${id}/results/export`, teacher)).res.status).toBe(403);

    // admin: everyone's email
    const adminFile = await downloadXlsx(`/api/admin/contests/${id}/results/export`, admin);
    expect(adminFile.res.status).toBe(200);
    const adminRows = [];
    adminFile.workbook.getWorksheet("Results").eachRow((r, i) => { if (i > 1) adminRows.push(r.values.slice(1)); });
    expect(adminRows.every((r) => r[3])).toBe(true);
  });

  test("an empty contest exports a valid workbook; unpublished contests export nothing", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const content = await seedContent();
    const id = await publishedContest({ teacher, admin, content });
    const { res, workbook } = await downloadXlsx(`/api/contests/${id}/results/export`, teacher);
    expect(res.status).toBe(200);
    expect(workbook.getWorksheet("Results").rowCount).toBe(1); // header only

    const draft = await request(app).post("/api/contests").set(teacher.h).send({
      title: "Draft", grade: 6, subjectId: content.subject._id.toString(), challengeIds: [content.a._id.toString()],
      startAt: inHours(1).toISOString(), endAt: inHours(5).toISOString(),
    });
    expect((await downloadXlsx(`/api/contests/${draft.body.id}/results/export`, teacher)).res.status).toBe(409);
    expect((await downloadXlsx("/api/contests/nope/results/export", teacher)).res.status).toBe(400);
  });
});

// Integration tests for Student Contest discovery + participation against a
// real in-memory MongoDB. Same mongodb-memory-server + supertest pattern as
// contests.test.js / adminContests.test.js — needs a machine that can
// download/run mongod.
// Run with: npx jest tests/integration/studentContests.test.js
//
// The same behaviours are covered WITHOUT a database in
// tests/unit/studentContestApi.mockedModels.test.js; this file is what
// proves them against the real Mongoose models, the real unique partial
// index, and real transactions.

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
  await require("../../src/models/QuizzSession").init(); // make sure indexes are built
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
const QuizSession = require("../../src/models/QuizzSession");

async function registerAs(role, grade = 6) {
  const email = `${role}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app).post("/api/auth/register").send({ name: `Test ${role}`, email, password: "password123", grade });
  await User.findByIdAndUpdate(res.body.user.id, { role, status: "active" });
  return { token: res.body.token, userId: res.body.user.id, h: { Authorization: `Bearer ${res.body.token}` } };
}

async function seedContent(grade = 6) {
  const subject = await Subject.create({ name: "Mathematics", grade });
  const chapter = await Chapter.create({ subject_id: subject._id, title: "Fractions", order_index: 1 });
  const concept = await Concept.create({ chapter_id: chapter._id, title: "Equivalent fractions", explanation_text: "x" });
  const mk = (title, order) =>
    GameContent.create({
      game_type: "MATH_FRACTION_BUILDER",
      concept_id: concept._id,
      title,
      order_index: order,
      payload: { pieces: [{ id: "p1" }, { id: "p2" }, { id: "p3" }], correct_piece_ids: ["p1", "p2"], hint: "SECRET-HINT" },
    });
  const a = await mk("Build 1/2", 1);
  const b = await mk("Build 3/4", 2);
  const outsider = await mk("Not in the contest", 3);
  return { subject, chapter, concept, a, b, outsider };
}

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000);

// Goes through the REAL teacher -> admin flow, then (optionally) moves the
// window so the contest is in the phase a test needs.
async function publishedContest({ teacher, admin, content, grade = 6, start = -1, end = 24 }) {
  const created = await request(app)
    .post("/api/contests")
    .set(teacher.h)
    .send({
      title: "Weekly Fractions Blitz",
      description: "Play both",
      grade,
      subjectId: content.subject._id.toString(),
      chapterId: content.chapter._id.toString(),
      challengeIds: [content.a._id.toString(), content.b._id.toString()],
      startAt: inHours(1).toISOString(),
      endAt: inHours(25).toISOString(),
    });
  expect(created.status).toBe(201);
  await request(app).post(`/api/contests/${created.body.id}/submit`).set(teacher.h);
  expect((await request(app).post(`/api/admin/contests/${created.body.id}/approve`).set(admin.h).send({})).status).toBe(200);
  // The API only accepts future windows; shift it directly to test each phase.
  await Contest.findByIdAndUpdate(created.body.id, { start_at: inHours(start), end_at: inHours(end) });
  return created.body.id;
}

const start = (who, contestId, contentId) =>
  request(app).post("/api/games/start").set(who.h).send({ gameType: "MATH_FRACTION_BUILDER", contentId: contentId.toString(), contestId });

describe("index", () => {
  test("QuizSession has the partial unique contest index and it really blocks duplicates", async () => {
    const indexes = await QuizSession.collection.indexes();
    const idx = indexes.find((i) => i.key.contest_id === 1 && i.key.user_id === 1 && i.key.content_id === 1);
    expect(idx).toBeDefined();
    expect(idx.unique).toBe(true);
    expect(idx.partialFilterExpression).toBeDefined();

    const ids = { user_id: new mongoose.Types.ObjectId(), content_id: new mongoose.Types.ObjectId(), contest_id: new mongoose.Types.ObjectId() };
    await QuizSession.create({ ...ids, session_type: "game-session", game_type: "MATH_FRACTION_BUILDER" });
    await expect(QuizSession.create({ ...ids, session_type: "game-session", game_type: "MATH_FRACTION_BUILDER" })).rejects.toMatchObject({ code: 11000 });
    // ...but practice sessions (no contest_id) are unrestricted.
    const practice = { user_id: ids.user_id, content_id: ids.content_id, session_type: "game-session", game_type: "MATH_FRACTION_BUILDER" };
    await QuizSession.create(practice);
    await QuizSession.create(practice);
  });
});

describe("discovery", () => {
  test("a grade-6 student sees the published grade-6 contest; other grades and non-published contests stay hidden", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const s6 = await registerAs("student", 6);
    const s7 = await registerAs("student", 7);
    const content = await seedContent();
    const id = await publishedContest({ teacher, admin, content });

    // a draft and a pending contest exist too
    const draft = await request(app).post("/api/contests").set(teacher.h).send({
      title: "Hidden draft", grade: 6, subjectId: content.subject._id.toString(), challengeIds: [content.a._id.toString()],
      startAt: inHours(1).toISOString(), endAt: inHours(5).toISOString(),
    });

    const list = await request(app).get("/api/student/contests").set(s6.h);
    expect(list.status).toBe(200);
    expect(list.body.contests.map((c) => c.id)).toEqual([id]);
    expect(list.body.contests[0]).toMatchObject({ phase: "ACTIVE", challengeCount: 2, completedCount: 0, subject: "Mathematics" });

    expect((await request(app).get("/api/student/contests").set(s7.h)).body.contests).toEqual([]);
    expect((await request(app).get(`/api/student/contests/${id}`).set(s7.h)).status).toBe(404);
    expect((await request(app).get(`/api/student/contests/${draft.body.id}`).set(s6.h)).status).toBe(404);
    expect((await request(app).get("/api/student/contests").set(teacher.h)).status).toBe(403);
  });
});

describe("participation", () => {
  test("play a contest challenge through the normal game flow: one session, normal XP, no second attempt", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const student = await registerAs("student", 6);
    const content = await seedContent();
    const id = await publishedContest({ teacher, admin, content });

    const levels = await request(app).get(`/api/games/content?gameType=MATH_FRACTION_BUILDER&contestId=${id}`).set(student.h);
    expect(levels.body.content.map((c) => c.id).sort()).toEqual([content.a._id.toString(), content.b._id.toString()].sort());
    expect(JSON.stringify(levels.body)).not.toContain("SECRET-HINT");

    // an unrelated game cannot be attached to the contest
    expect((await start(student, id, content.outsider._id)).status).toBe(403);

    const started = await start(student, id, content.a._id);
    expect(started.status).toBe(201);
    const session = await QuizSession.findById(started.body.sessionId);
    expect(session.contest_id.toString()).toBe(id);
    expect(session.user_id.toString()).toBe(student.userId);

    const attempt = await request(app).post(`/api/games/${started.body.sessionId}/attempt`).set(student.h).send({ selectedPieceIds: ["p1", "p2"] });
    expect(attempt.body.isCorrect).toBe(true);
    const done = await request(app).post(`/api/games/${started.body.sessionId}/complete`).set(student.h);
    expect(done.status).toBe(200);
    expect(done.body.xpAwarded).toBe(30);
    expect((await User.findById(student.userId)).xp_total).toBe(30);

    // same challenge cannot be played for the contest again; practice still works
    expect((await start(student, id, content.a._id)).status).toBe(409);
    const practice = await request(app).post("/api/games/start").set(student.h).send({ gameType: "MATH_FRACTION_BUILDER", contentId: content.a._id.toString() });
    expect(practice.status).toBe(201);
    expect((await QuizSession.findById(practice.body.sessionId)).contest_id).toBeUndefined();

    const detail = await request(app).get(`/api/student/contests/${id}`).set(student.h);
    expect(detail.body.progress).toEqual({ completed: 1, total: 2 });
    expect(detail.body.challenges[0]).toMatchObject({ status: "COMPLETED", isCorrect: true, canPlay: false });
    const after = await request(app).get(`/api/games/content?gameType=MATH_FRACTION_BUILDER&contestId=${id}`).set(student.h);
    expect(after.body.content.map((c) => c.id)).toEqual([content.b._id.toString()]);
  });

  test("upcoming and ended contests cannot be started; an ended one cannot be scored mid-game", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const student = await registerAs("student", 6);
    const content = await seedContent();
    const upcoming = await publishedContest({ teacher, admin, content, start: 2, end: 6 });
    const ended = await publishedContest({ teacher, admin, content, start: -8, end: -2 });
    const live = await publishedContest({ teacher, admin, content, start: -1, end: 5 });

    expect((await start(student, upcoming, content.a._id)).body.code).toBe("CONTEST_NOT_STARTED");
    expect((await start(student, ended, content.a._id)).body.code).toBe("CONTEST_ENDED");

    const started = await start(student, live, content.b._id);
    expect(started.status).toBe(201);
    await Contest.findByIdAndUpdate(live, { end_at: inHours(-0.01) });
    const late = await request(app).post(`/api/games/${started.body.sessionId}/attempt`).set(student.h).send({ selectedPieceIds: ["p1", "p2"] });
    expect(late.status).toBe(409);
    expect((await QuizSession.findById(started.body.sessionId)).completed_at).toBeFalsy();
  });

  test("two parallel starts for the same challenge create exactly one session", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const student = await registerAs("student", 6);
    const content = await seedContent();
    const id = await publishedContest({ teacher, admin, content });

    const [a, b] = await Promise.all([start(student, id, content.a._id), start(student, id, content.a._id)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(await QuizSession.countDocuments({ contest_id: id, user_id: student.userId })).toBe(1);
  });
});

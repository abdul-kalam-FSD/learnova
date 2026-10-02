// Integration tests for the Teacher Contest feature: POST /api/contests,
// GET /api/contests/my, POST /api/contests/:id/submit and
// GET /api/contests/game-options, against a real (in-memory) MongoDB.
//
// Same mongodb-memory-server + supertest pattern as
// tests/integration/assignments.test.js — needs a machine that can
// download/run mongod (the sandbox this was written in could not).
// Run with: npx jest tests/integration/contests.test.js
//
// The same behaviours are also covered WITHOUT a database (mocked
// models) in tests/unit/contestApi.mockedModels.test.js; this file is
// what proves them against real Mongoose casting/validation/indexes.

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
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const User = require("../../src/models/User");
const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const GameContent = require("../../src/models/GameContent");
const Contest = require("../../src/models/Contest");

async function registerAs(role, grade = 6) {
  const email = `${role}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app).post("/api/auth/register").send({ name: `Test ${role}`, email, password: "password123", grade });
  await User.findByIdAndUpdate(res.body.user.id, { role, status: "active" });
  return { token: res.body.token, userId: res.body.user.id };
}

async function seedContent(grade = 6, subjectName = "Mathematics") {
  const subject = await Subject.create({ name: subjectName, grade });
  const chapter = await Chapter.create({ subject_id: subject._id, title: "Fractions", order_index: 1 });
  const concept = await Concept.create({ chapter_id: chapter._id, title: "Equivalent fractions", explanation_text: "x" });
  const game = await GameContent.create({
    game_type: "MATH_FRACTION_BUILDER",
    concept_id: concept._id,
    title: "Build 1/2",
    payload: { target: "1/2", secret: "ANSWER-KEY" },
  });
  return { subject, chapter, concept, game };
}

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
const body = ({ subject, chapter, game }, over = {}) => ({
  title: "Weekly Fractions Blitz",
  description: "Play it",
  grade: 6,
  subjectId: subject._id.toString(),
  chapterId: chapter._id.toString(),
  challengeIds: [game._id.toString()],
  startAt: inHours(1),
  endAt: inHours(25),
  ...over,
});

describe("contest authorization", () => {
  test("a student cannot create or list contests", async () => {
    const { token } = await registerAs("student");
    const c = await seedContent();
    const create = await request(app).post("/api/contests").set("Authorization", `Bearer ${token}`).send(body(c));
    expect(create.status).toBe(403);
    expect(await Contest.countDocuments()).toBe(0);
    expect((await request(app).get("/api/contests/my").set("Authorization", `Bearer ${token}`)).status).toBe(403);
  });

  test("a teacher awaiting admin approval cannot create contests", async () => {
    const { token, userId } = await registerAs("teacher");
    await User.findByIdAndUpdate(userId, { status: "pending" });
    const c = await seedContent();
    const res = await request(app).post("/api/contests").set("Authorization", `Bearer ${token}`).send(body(c));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("TEACHER_PENDING");
  });
});

describe("teacher creates and lists contests", () => {
  test("creates a DRAFT owned by the teacher and lists it under /my only for them", async () => {
    const { token, userId } = await registerAs("teacher");
    const { token: otherToken } = await registerAs("teacher");
    const c = await seedContent();

    const res = await request(app).post("/api/contests").set("Authorization", `Bearer ${token}`).send(body(c, { status: "PUBLISHED" }));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("DRAFT");
    const stored = await Contest.findById(res.body.id);
    expect(stored.teacher_id.toString()).toBe(userId);
    expect(stored.challenges[0].game_content_id.toString()).toBe(c.game._id.toString());

    const mine = await request(app).get("/api/contests/my").set("Authorization", `Bearer ${token}`);
    expect(mine.body.contests).toHaveLength(1);
    expect(mine.body.contests[0]).toMatchObject({ subject: "Mathematics", chapterTitle: "Fractions", grade: 6 });

    const theirs = await request(app).get("/api/contests/my").set("Authorization", `Bearer ${otherToken}`);
    expect(theirs.body.contests).toHaveLength(0);
  });

  test("rejects references that do not line up (wrong grade / other subject's game)", async () => {
    const { token } = await registerAs("teacher");
    const math6 = await seedContent(6, "Mathematics");
    const sci6 = await seedContent(6, "Science");
    const auth = { Authorization: `Bearer ${token}` };

    const wrongGrade = await request(app).post("/api/contests").set(auth).send(body(math6, { grade: 7 }));
    expect(wrongGrade.status).toBe(400);

    const foreignGame = await request(app)
      .post("/api/contests")
      .set(auth)
      .send(body(math6, { chapterId: undefined, challengeIds: [sci6.game._id.toString()] }));
    expect(foreignGame.status).toBe(400);

    const missingGame = await request(app)
      .post("/api/contests")
      .set(auth)
      .send(body(math6, { challengeIds: [new mongoose.Types.ObjectId().toString()] }));
    expect(missingGame.status).toBe(404);

    expect(await Contest.countDocuments()).toBe(0);
  });

  test("submit moves DRAFT -> PENDING_APPROVAL for the owner only", async () => {
    const { token } = await registerAs("teacher");
    const { token: otherToken } = await registerAs("teacher");
    const c = await seedContent();
    const created = await request(app).post("/api/contests").set("Authorization", `Bearer ${token}`).send(body(c));

    const other = await request(app).post(`/api/contests/${created.body.id}/submit`).set("Authorization", `Bearer ${otherToken}`);
    expect(other.status).toBe(404);

    const ok = await request(app).post(`/api/contests/${created.body.id}/submit`).set("Authorization", `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe("PENDING_APPROVAL");
  });
});

describe("GET /api/contests/game-options", () => {
  test("returns playable games for the subject without leaking payloads", async () => {
    const { token } = await registerAs("teacher");
    const c = await seedContent();
    const res = await request(app)
      .get(`/api/contests/game-options?subjectId=${c.subject._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.games).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toContain("ANSWER-KEY");
  });
});

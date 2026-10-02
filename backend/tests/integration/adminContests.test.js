// Integration tests for Admin contest review (list / detail / approve /
// reject) against a real in-memory MongoDB. Same mongodb-memory-server +
// supertest pattern as contests.test.js and assignments.test.js — needs a
// machine that can download/run mongod.
// Run with: npx jest tests/integration/adminContests.test.js
//
// The same behaviours are also covered WITHOUT a database in
// tests/unit/adminContestApi.mockedModels.test.js; this file is what
// proves them against real Mongoose casting/validation/conditional updates.

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
  for (const key in collections) await collections[key].deleteMany({});
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
  return { token: res.body.token, userId: res.body.user.id, h: { Authorization: `Bearer ${res.body.token}` } };
}

async function seedContent() {
  const subject = await Subject.create({ name: "Mathematics", grade: 6 });
  const chapter = await Chapter.create({ subject_id: subject._id, title: "Fractions", order_index: 1 });
  const concept = await Concept.create({ chapter_id: chapter._id, title: "Equivalent fractions", explanation_text: "x" });
  const game = await GameContent.create({
    game_type: "MATH_FRACTION_BUILDER",
    concept_id: concept._id,
    title: "Build 1/2",
    payload: { target: "1/2", secret: "ANSWER-KEY" },
  });
  return { subject, chapter, game };
}

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
const createBody = ({ subject, chapter, game }) => ({
  title: "Weekly Fractions Blitz",
  description: "Play it",
  grade: 6,
  subjectId: subject._id.toString(),
  chapterId: chapter._id.toString(),
  challengeIds: [game._id.toString()],
  startAt: inHours(1),
  endAt: inHours(25),
});

// Teacher creates + submits a contest; returns its id.
async function submittedContest(teacher, content) {
  const created = await request(app).post("/api/contests").set(teacher.h).send(createBody(content));
  await request(app).post(`/api/contests/${created.body.id}/submit`).set(teacher.h);
  return created.body.id;
}

describe("RBAC", () => {
  test("students and teachers cannot list, inspect, approve or reject", async () => {
    const teacher = await registerAs("teacher");
    const student = await registerAs("student");
    const content = await seedContent();
    const id = await submittedContest(teacher, content);

    for (const who of [student, teacher]) {
      expect((await request(app).get("/api/admin/contests").set(who.h)).status).toBe(403);
      expect((await request(app).get(`/api/admin/contests/${id}`).set(who.h)).status).toBe(403);
      expect((await request(app).post(`/api/admin/contests/${id}/approve`).set(who.h)).status).toBe(403);
      expect((await request(app).post(`/api/admin/contests/${id}/reject`).set(who.h).send({ note: "Not good enough" })).status).toBe(403);
    }
    expect((await Contest.findById(id)).status).toBe("PENDING_APPROVAL");
  });
});

describe("admin review", () => {
  test("lists the queue, inspects details without answer keys, and approves with server-set reviewer", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const content = await seedContent();
    const id = await submittedContest(teacher, content);

    const list = await request(app).get("/api/admin/contests?status=PENDING_APPROVAL").set(admin.h);
    expect(list.status).toBe(200);
    expect(list.body.contests).toHaveLength(1);
    expect(list.body.contests[0]).toMatchObject({ challengeCount: 1, subject: "Mathematics" });
    expect(list.body.counts.PENDING_APPROVAL).toBe(1);

    const detail = await request(app).get(`/api/admin/contests/${id}`).set(admin.h);
    expect(detail.status).toBe(200);
    expect(detail.body.challenges[0].title).toBe("Build 1/2");
    expect(JSON.stringify(detail.body)).not.toContain("ANSWER-KEY");

    const before = Date.now();
    const res = await request(app)
      .post(`/api/admin/contests/${id}/approve`)
      .set(admin.h)
      .send({ status: "DRAFT", reviewed_by: teacher.userId, reviewed_at: "2000-01-01" });
    expect(res.status).toBe(200);
    const stored = await Contest.findById(id);
    expect(stored.status).toBe("PUBLISHED");
    expect(stored.reviewed_by.toString()).toBe(admin.userId);
    expect(stored.reviewed_at.getTime()).toBeGreaterThanOrEqual(before);

    const again = await request(app).post(`/api/admin/contests/${id}/approve`).set(admin.h).send({});
    expect(again.status).toBe(409);
  });

  test("DRAFTs are invisible to admins; reject needs a reason and stores it", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const content = await seedContent();
    const draft = await request(app).post("/api/contests").set(teacher.h).send(createBody(content));
    expect((await request(app).get(`/api/admin/contests/${draft.body.id}`).set(admin.h)).status).toBe(404);

    const id = await submittedContest(teacher, content);
    const noReason = await request(app).post(`/api/admin/contests/${id}/reject`).set(admin.h).send({});
    expect(noReason.status).toBe(400);

    const rej = await request(app).post(`/api/admin/contests/${id}/reject`).set(admin.h).send({ note: "Add a harder game" });
    expect(rej.status).toBe(200);
    const stored = await Contest.findById(id);
    expect(stored).toMatchObject({ status: "REJECTED", review_note: "Add a harder game" });
    expect(stored.reviewed_by.toString()).toBe(admin.userId);
  });

  test("teacher sees the rejection, resubmits the same contest, admin approves it", async () => {
    const teacher = await registerAs("teacher");
    const admin = await registerAs("admin");
    const content = await seedContent();
    const id = await submittedContest(teacher, content);
    await request(app).post(`/api/admin/contests/${id}/reject`).set(admin.h).send({ note: "Add a harder game" });

    const mine = await request(app).get("/api/contests/my").set(teacher.h);
    expect(mine.body.contests[0]).toMatchObject({ status: "REJECTED", reviewNote: "Add a harder game" });

    expect((await request(app).post(`/api/contests/${id}/submit`).set(teacher.h)).status).toBe(200);
    expect(await Contest.countDocuments()).toBe(1);

    expect((await request(app).post(`/api/admin/contests/${id}/approve`).set(admin.h).send({})).status).toBe(200);
    const final = await request(app).get("/api/contests/my").set(teacher.h);
    expect(final.body.contests[0]).toMatchObject({ status: "PUBLISHED", reviewNote: "" });
  });
});

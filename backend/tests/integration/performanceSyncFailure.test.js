// Integration test for Section 31-36's mandatory failure-isolation
// behavior of the automatic Excel/Sheet sync: a sync failure must
// never roll back or hide the student's actual game result, must be
// recorded as sync_status: "failed" for an admin to see, and must be
// retryable via POST /api/admin/results/:sessionId/retry-sync.
//
// This is the one part of performanceSync.js the existing unit tests
// (tests/unit/performanceSync.test.js) don't exercise — those cover
// buildPerformanceRow/upsertRow as pure functions and a real
// success-path file round-trip, but never the actual catch branch in
// syncSessionToExcel, which needs a forced I/O failure to reach.
//
// Same mongodb-memory-server + supertest pattern as
// tests/integration/gameSelection.test.js — see that file's header
// note: the memory-server binary download is blocked in this
// sandbox's network allowlist, so this runs on a real dev machine /
// CI, not in the sandbox that authored it.
// Run with: npx jest tests/integration/performanceSyncFailure.test.js

// Mocked before any require of app/performanceSync so the real
// exceljs Workbook is never touched. writeFile rejects on the first
// call (simulating e.g. a disk/permissions failure during the game's
// own completion request) and resolves on every call after, so the
// same mock also proves the retry endpoint recovers once the
// underlying failure clears.
let mockWriteFileCallCount = 0;
jest.mock("exceljs", () => {
  return {
    Workbook: jest.fn().mockImplementation(() => {
      const sheetStub = {
        columns: [],
        getRow: jest.fn().mockReturnValue({ font: {} }),
        eachRow: jest.fn(),
        addRow: jest.fn(),
      };
      return {
        getWorksheet: jest.fn().mockReturnValue(undefined),
        addWorksheet: jest.fn().mockReturnValue(sheetStub),
        xlsx: {
          readFile: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockImplementation(() => {
            mockWriteFileCallCount += 1;
            if (mockWriteFileCallCount === 1) {
              return Promise.reject(new Error("Simulated disk failure"));
            }
            return Promise.resolve(undefined);
          }),
        },
      };
    }),
  };
});

// Uses a single-node replica set (not a plain standalone instance):
// completeGame/completeQuiz run their XP/mastery/streak writes inside
// a real Mongo session.startTransaction(), and MongoDB only allows
// transactions on a replica set member or mongos. A plain
// MongoMemoryServer instance is standalone, which is what caused
// "Transaction numbers are only allowed on a replica set member or
// mongos" here. This matches production, which already runs on a
// replica-set-backed MongoDB (Atlas).
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.FRONTEND_URL = "http://localhost:5173";
  app = require("../../src/app");
  await mongoose.connection.asPromise();
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  mockWriteFileCallCount = 0;
});

const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const GameContent = require("../../src/models/GameContent");
const QuizSession = require("../../src/models/QuizzSession");
const User = require("../../src/models/User");

async function registerStudent(grade) {
  const email = `student-${grade}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test Student", email, password: "password123", grade });
  return { token: res.body.token, userId: res.body.user.id };
}

async function loginAdmin() {
  const email = `admin-${Date.now()}-${Math.random()}@test.com`;
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Test Admin", email, password: "password123", grade: 10 });
  await User.updateOne({ email }, { role: "admin" });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "password123" });
  return res.body.token;
}

async function seedFractionBuilderContent(grade) {
  const subject = await Subject.create({ name: "Mathematics", grade });
  const chapter = await Chapter.create({
    subject_id: subject._id,
    title: "Test Chapter",
    order_index: 1,
  });
  const concept = await Concept.create({
    chapter_id: chapter._id,
    title: "Test Concept",
    explanation_text: "Explanation",
  });
  const content = await GameContent.create({
    game_type: "MATH_FRACTION_BUILDER",
    concept_id: concept._id,
    title: "Level 1",
    difficulty: "easy",
    payload: {
      target: { numerator: 1, denominator: 2 },
      pieces: [{ id: "p1" }, { id: "p2" }],
      correct_piece_ids: ["p1"],
    },
  });
  return { subject, chapter, concept, content };
}

async function playAndCompleteGame(token, content) {
  const startRes = await request(app)
    .post("/api/games/start")
    .set("Authorization", `Bearer ${token}`)
    .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id.toString() });
  const sessionId = startRes.body.sessionId || startRes.body.session?._id;

  await request(app)
    .post(`/api/games/${sessionId}/attempt`)
    .set("Authorization", `Bearer ${token}`)
    .send({ selectedPieceIds: ["p1"] });

  const completeRes = await request(app)
    .post(`/api/games/${sessionId}/complete`)
    .set("Authorization", `Bearer ${token}`);

  return { sessionId, completeRes };
}

describe("Excel/Sheet sync failure isolation (Section 31-36)", () => {
  test("a sync failure does not block completion or touch the game result, and is recorded for retry", async () => {
    const { token } = await registerStudent(6);
    const { content } = await seedFractionBuilderContent(6);

    const { sessionId, completeRes } = await playAndCompleteGame(token, content);

    // The game completion request itself must succeed regardless of
    // the sync outcome (Section 36: "sync failure does not fail the
    // game"), and must honestly report the sync failure rather than
    // silently claiming success.
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.performanceSync).toBe("failed");
    expect(completeRes.body.xpAwarded).toBeGreaterThan(0);

    const session = await QuizSession.findById(sessionId);
    // The real result must be fully intact — sync failing must never
    // roll back or null out the score/XP/completion this student
    // actually earned.
    expect(session.completed_at).toBeTruthy();
    expect(session.xp_awarded).toBeGreaterThan(0);
    expect(session.sync_status).toBe("failed");
    expect(session.sync_error).toBe("Simulated disk failure");
    expect(session.synced_at).toBeFalsy();
  });

  test("an admin can retry a failed sync without touching the underlying result", async () => {
    const { token } = await registerStudent(6);
    const { content } = await seedFractionBuilderContent(6);
    const { sessionId } = await playAndCompleteGame(token, content);

    const before = await QuizSession.findById(sessionId);
    expect(before.sync_status).toBe("failed");

    const adminToken = await loginAdmin();
    const retryRes = await request(app)
      .post(`/api/admin/results/${sessionId}/retry-sync`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.status).toBe("synced");

    const after = await QuizSession.findById(sessionId);
    expect(after.sync_status).toBe("synced");
    expect(after.synced_at).toBeTruthy();
    expect(after.sync_error).toBeFalsy();
    // Retrying sync must never re-touch the actual game result.
    expect(after.completed_at.getTime()).toBe(before.completed_at.getTime());
    expect(after.xp_awarded).toBe(before.xp_awarded);
  });

  test("a non-admin cannot call the retry-sync endpoint", async () => {
    const { token } = await registerStudent(6);
    const { content } = await seedFractionBuilderContent(6);
    const { sessionId } = await playAndCompleteGame(token, content);

    const res = await request(app)
      .post(`/api/admin/results/${sessionId}/retry-sync`)
      .set("Authorization", `Bearer ${token}`);

    expect([401, 403]).toContain(res.status);
  });
});

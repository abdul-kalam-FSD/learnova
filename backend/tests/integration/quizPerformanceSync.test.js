// Regression test for the full-project-audit fix: completeQuiz
// (quizControllers.js) never called syncSessionToExcel at all — only
// gameControllers.completeGame did. Every quiz/case-investigation
// completion silently never reached the performance workbook:
// sync_status stayed unset forever, GET /admin/results reported it as
// "Pending" (adminControllers.js defaults unset sync_status to
// "pending"), and the Admin UI only renders a Retry button for
// "failed" rows, not "pending" ones — so there was no automatic OR
// manual path for a completed quiz's result to ever sync.
//
// Uses real exceljs (not mocked) against a throwaway PERFORMANCE_SYNC_DIR
// so this also proves an actual workbook row gets written, not just
// that sync_status flips.
//
// Same mongodb-memory-server + supertest pattern as
// tests/integration/performanceSyncFailure.test.js — see that file's
// header note: the memory-server binary download is blocked in this
// sandbox's network allowlist, so this runs on a real dev machine /
// CI, not in the sandbox that authored it.
// Run with: npx jest tests/integration/quizPerformanceSync.test.js

const os = require("os");
const path = require("path");
const fs = require("fs");

const TMP_SYNC_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "usg-quiz-sync-"));
process.env.PERFORMANCE_SYNC_DIR = TMP_SYNC_DIR;

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
const ExcelJS = require("exceljs");

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
  fs.rmSync(TMP_SYNC_DIR, { recursive: true, force: true });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const Concept = require("../../src/models/Concept");
const Chapter = require("../../src/models/Chapter");
const Subject = require("../../src/models/Subject");
const Question = require("../../src/models/Question");
const UserConceptMastery = require("../../src/models/UserConceptMastery");
const QuizSession = require("../../src/models/QuizzSession");

async function registerStudent(grade) {
  const email = `quiz-student-${grade}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Quiz Student", email, password: "password123", grade });
  return { token: res.body.token, userId: res.body.user.id };
}

async function seedWeakConceptQuiz(userId, grade) {
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
  const question = await Question.create({
    concept_id: concept._id,
    question_text: "2 + 2 = ?",
    options: [
      { id: "a", text: "3" },
      { id: "b", text: "4" },
    ],
    correct_option_id: "b",
    explanation_text: "Basic addition",
  });
  await UserConceptMastery.create({
    user_id: userId,
    concept_id: concept._id,
    state: "weak",
    correct_streak: 0,
  });
  return { question };
}

describe("Automatic Excel sync on quiz completion (full-project audit fix)", () => {
  test("completing a weak-concept quiz session syncs to the workbook, same as a game session does", async () => {
    const { token, userId } = await registerStudent(6);
    const { question } = await seedWeakConceptQuiz(userId, 6);

    const startRes = await request(app)
      .post("/api/quiz/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionType: "weak-concept-targeted" });
    const sessionId = startRes.body.sessionId;

    await request(app)
      .post(`/api/quiz/${sessionId}/answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: question._id.toString(), selectedOptionId: "b" });

    const completeRes = await request(app)
      .post(`/api/quiz/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    expect(completeRes.status).toBe(200);
    // Previously undefined — completeQuiz never returned this at all.
    expect(completeRes.body.performanceSync).toBe("synced");

    const session = await QuizSession.findById(sessionId);
    expect(session.sync_status).toBe("synced");
    expect(session.synced_at).toBeTruthy();

    // Prove an actual row landed in the workbook, not just the flag.
    const workbookPath = path.join(TMP_SYNC_DIR, "student-performance.xlsx");
    expect(fs.existsSync(workbookPath)).toBe(true);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(workbookPath);
    const sheet = workbook.getWorksheet("Performance");
    const resultIdColIndex = sheet.getRow(1).values.findIndex((v) => v === "Result ID");
    let found = false;
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      if (row.getCell(resultIdColIndex).value === sessionId) found = true;
    });
    expect(found).toBe(true);
  });
});

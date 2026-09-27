// Regression test for the completeQuiz idempotency fix: quizControllers.
// completeQuiz previously had none of the duplicate/race protection that
// gameControllers.completeGame already had (see that file's "BUGFIX
// (production bug 1 - duplicate completion race)" comment). A plain
// `if (session.completed_at)` check let two near-simultaneous requests
// both pass before either wrote completed_at back, and a genuine
// duplicate/retry request got a hard 400 "already completed" error
// instead of the actual result.
//
// This file proves completeQuiz now has the same guarantees:
//   1. normal completion works exactly as before
//   2. a duplicate sequential completion request gets 200 + the
//      stored result, not a 400 error, and does not re-award XP/mastery
//   3. two concurrent completion requests: exactly one applies
//      XP/mastery/streak/assignment/sync; the loser gets the winner's
//      stored result
//   4. "retry after timeout" (simulated as a second request after the
//      first has already committed) recovers the stored result
//   5. downstream side effects (XP total, mastery state, assignment
//      status, sync) are not duplicated by any of the above
//
// Same mongodb-memory-server + MongoMemoryReplSet + supertest pattern
// as tests/integration/quizAssignmentCompletion.test.js — see that
// file's header note: the memory-server binary download is blocked in
// this sandbox's network allowlist, so this runs on a real dev
// machine / CI, not in the sandbox that authored it.
// Run with: npx jest tests/integration/completeQuizIdempotency.test.js

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
});

const Concept = require("../../src/models/Concept");
const Chapter = require("../../src/models/Chapter");
const Subject = require("../../src/models/Subject");
const Question = require("../../src/models/Question");
const UserConceptMastery = require("../../src/models/UserConceptMastery");
const Assignment = require("../../src/models/Assignment");
const QuizSession = require("../../src/models/QuizzSession");
const User = require("../../src/models/User");

async function registerStudent(grade) {
  const email = `idem-student-${grade}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Idempotency Student", email, password: "password123", grade });
  return { token: res.body.token, userId: res.body.user.id };
}

async function seedWeakConceptQuiz(userId, grade) {
  const subject = await Subject.create({ name: "Mathematics", grade });
  const chapter = await Chapter.create({ subject_id: subject._id, title: "Test Chapter", order_index: 1 });
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
  return { concept, question };
}

async function startAndAnswer(token, question) {
  const startRes = await request(app)
    .post("/api/quiz/start")
    .set("Authorization", `Bearer ${token}`)
    .send({ sessionType: "weak-concept-targeted" });
  const sessionId = startRes.body.sessionId;

  await request(app)
    .post(`/api/quiz/${sessionId}/answer`)
    .set("Authorization", `Bearer ${token}`)
    .send({ questionId: question._id.toString(), selectedOptionId: "b" });

  return sessionId;
}

describe("completeQuiz idempotency (parity with completeGame)", () => {
  test("1. normal completion still works exactly as before", async () => {
    const { token, userId } = await registerStudent(6);
    const { question } = await seedWeakConceptQuiz(userId, 6);
    const sessionId = await startAndAnswer(token, question);

    const res = await request(app)
      .post(`/api/quiz/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.correctCount).toBe(1);
    expect(res.body.totalQuestions).toBe(1);
    expect(res.body.xpAwarded).toBeGreaterThan(0);
    expect(res.body.alreadyCompleted).toBeUndefined();
  });

  test("2. duplicate sequential completion returns 200 with the stored result, not a 400 error, and does not re-award XP", async () => {
    const { token, userId } = await registerStudent(6);
    const { question } = await seedWeakConceptQuiz(userId, 6);
    const sessionId = await startAndAnswer(token, question);

    const first = await request(app)
      .post(`/api/quiz/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);
    expect(first.status).toBe(200);
    const xpAfterFirst = (await User.findById(userId)).xp_total;

    const second = await request(app)
      .post(`/api/quiz/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    expect(second.status).toBe(200);
    expect(second.body.alreadyCompleted).toBe(true);
    expect(second.body.xpAwarded).toBe(first.body.xpAwarded);
    expect(second.body.correctCount).toBe(first.body.correctCount);

    const xpAfterSecond = (await User.findById(userId)).xp_total;
    expect(xpAfterSecond).toBe(xpAfterFirst);
  });

  test("3. two concurrent completion requests: exactly one applies rewards, the other gets the stored result", async () => {
    const { token, userId } = await registerStudent(6);
    const { question } = await seedWeakConceptQuiz(userId, 6);
    const sessionId = await startAndAnswer(token, question);

    const [resA, resB] = await Promise.all([
      request(app).post(`/api/quiz/${sessionId}/complete`).set("Authorization", `Bearer ${token}`),
      request(app).post(`/api/quiz/${sessionId}/complete`).set("Authorization", `Bearer ${token}`),
    ]);

    expect([resA.status, resB.status]).toEqual([200, 200]);
    const alreadyCompletedFlags = [resA.body.alreadyCompleted, resB.body.alreadyCompleted];
    // Exactly one of the two requests was the winner (no alreadyCompleted
    // flag); the other lost the race and got the replayed result.
    expect(alreadyCompletedFlags.filter((f) => f === true)).toHaveLength(1);
    expect(alreadyCompletedFlags.filter((f) => f === undefined)).toHaveLength(1);

    // Both responses report the same xpAwarded — the loser replayed the
    // winner's stored value, it didn't compute (and apply) its own.
    expect(resA.body.xpAwarded).toBe(resB.body.xpAwarded);

    const user = await User.findById(userId);
    const session = await QuizSession.findById(sessionId);
    // XP was granted exactly once: the user's total equals what a single
    // completion reports, not double that.
    expect(user.xp_total).toBe(resA.body.xpAwarded);
    expect(session.xp_awarded).toBe(resA.body.xpAwarded);
  });

  test("4. retry after the session already committed recovers the stored result instead of erroring", async () => {
    const { token, userId } = await registerStudent(6);
    const { question } = await seedWeakConceptQuiz(userId, 6);
    const sessionId = await startAndAnswer(token, question);

    // Simulates a client that never saw the first response (timeout,
    // dropped connection) and retries the same request after the
    // backend actually committed.
    const committed = await request(app)
      .post(`/api/quiz/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);
    expect(committed.status).toBe(200);

    const retry = await request(app)
      .post(`/api/quiz/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    expect(retry.status).toBe(200);
    expect(retry.body.message).toBeUndefined();
    expect(retry.body.alreadyCompleted).toBe(true);
    expect(retry.body.correctCount).toBe(committed.body.correctCount);
    expect(retry.body.xpAwarded).toBe(committed.body.xpAwarded);
  });

  test("5. duplicate/concurrent completion does not duplicate mastery or assignment side effects", async () => {
    const { token, userId } = await registerStudent(6);
    const { concept, question } = await seedWeakConceptQuiz(userId, 6);
    const teacher = await User.create({
      name: "Ms. Teacher",
      email: `teacher-${Date.now()}@test.com`,
      password_hash: "irrelevant-for-this-test",
      role: "teacher",
      grade: 6,
    });
    const assignment = await Assignment.create({
      teacher_id: teacher._id,
      concept_id: concept._id,
      students: [{ student_id: userId, status: "pending" }],
    });
    const sessionId = await startAndAnswer(token, question);

    await Promise.all([
      request(app).post(`/api/quiz/${sessionId}/complete`).set("Authorization", `Bearer ${token}`),
      request(app).post(`/api/quiz/${sessionId}/complete`).set("Authorization", `Bearer ${token}`),
    ]);
    await request(app)
      .post(`/api/quiz/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    const mastery = await UserConceptMastery.findOne({ user_id: userId, concept_id: concept._id });
    // A single correct answer only ever runs one mastery transition,
    // regardless of how many completion requests were made.
    expect(mastery.correct_streak).toBe(1);

    const updatedAssignment = await Assignment.findById(assignment._id);
    const mine = updatedAssignment.students.find((s) => s.student_id.toString() === userId);
    expect(mine.status).toBe("completed");

    const session = await QuizSession.findById(sessionId);
    expect(session.sync_status).not.toBe("pending");
  });
});

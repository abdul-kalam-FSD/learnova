// Regression test for the full-project-audit fix: completeQuiz
// (quizControllers.js) never touched the Assignment collection at
// all — only gameControllers.completeGame did. A student who
// satisfied a teacher-assigned concept via weak-concept practice (or
// a case investigation) — rather than the specific game the teacher
// happened to assign — had that assignment stay "pending" forever,
// with no automatic way for the roster (TeacherAssignments.jsx) or
// the student's "My Assignments" list to ever show it as done.
//
// Same mongodb-memory-server + supertest pattern as
// tests/integration/quizPerformanceSync.test.js — see that file's
// header note: the memory-server binary download is blocked in this
// sandbox's network allowlist, so this runs on a real dev machine /
// CI, not in the sandbox that authored it.
// Run with: npx jest tests/integration/quizAssignmentCompletion.test.js

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
});

const Concept = require("../../src/models/Concept");
const Chapter = require("../../src/models/Chapter");
const Subject = require("../../src/models/Subject");
const Question = require("../../src/models/Question");
const UserConceptMastery = require("../../src/models/UserConceptMastery");
const Assignment = require("../../src/models/Assignment");
const User = require("../../src/models/User");

async function registerStudent(grade) {
  const email = `assign-student-${grade}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Assign Student", email, password: "password123", grade });
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

describe("Assignment completion via quiz sessions (full-project audit fix)", () => {
  test("answering an assigned concept correctly in a weak-concept quiz flips the assignment to completed", async () => {
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
      note: "Please practice this",
      students: [{ student_id: userId, status: "pending" }],
    });

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

    const updated = await Assignment.findById(assignment._id);
    const mine = updated.students.find((s) => s.student_id.toString() === userId);
    expect(mine.status).toBe("completed");
    expect(mine.completed_at).toBeTruthy();
  });

  test("an incorrect answer leaves the assignment pending so the student can try again", async () => {
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

    const startRes = await request(app)
      .post("/api/quiz/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionType: "weak-concept-targeted" });
    const sessionId = startRes.body.sessionId;

    await request(app)
      .post(`/api/quiz/${sessionId}/answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: question._id.toString(), selectedOptionId: "a" }); // wrong

    await request(app)
      .post(`/api/quiz/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    const updated = await Assignment.findById(assignment._id);
    const mine = updated.students.find((s) => s.student_id.toString() === userId);
    expect(mine.status).toBe("pending");
    expect(mine.completed_at).toBeFalsy();
  });

  test("a different student's pending entry on the same assignment is untouched", async () => {
    const { token, userId } = await registerStudent(6);
    const { userId: otherStudentId } = await registerStudent(6);
    const { concept, question } = await seedWeakConceptQuiz(userId, 6);
    // Give the other student the same weak concept too, though they
    // never take the quiz in this test — only userId does.
    await UserConceptMastery.create({
      user_id: otherStudentId,
      concept_id: concept._id,
      state: "weak",
      correct_streak: 0,
    });

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
      students: [
        { student_id: userId, status: "pending" },
        { student_id: otherStudentId, status: "pending" },
      ],
    });

    const startRes = await request(app)
      .post("/api/quiz/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionType: "weak-concept-targeted" });
    const sessionId = startRes.body.sessionId;

    await request(app)
      .post(`/api/quiz/${sessionId}/answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: question._id.toString(), selectedOptionId: "b" });

    await request(app)
      .post(`/api/quiz/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    const updated = await Assignment.findById(assignment._id);
    const mine = updated.students.find((s) => s.student_id.toString() === userId);
    const other = updated.students.find((s) => s.student_id.toString() === otherStudentId);
    expect(mine.status).toBe("completed");
    expect(other.status).toBe("pending");
  });
});

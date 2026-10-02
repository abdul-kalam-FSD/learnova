// Task 3 (Mistake Review V1) — GET /api/quiz/:sessionId/review.
// Scope: quiz-type sessions only (weak-concept-targeted,
// case-investigation), using the already-persisted
// QuizSession.questions[] structured data. Read-only — never mutates
// QuizSession or Question, never recalculates correctness.
//
// Same mongodb-memory-server + supertest pattern as the other
// integration tests here — see assignments.test.js's header note: the
// memory-server binary download is blocked in this sandbox's network
// allowlist, so this runs on a real dev machine / CI, not in the
// sandbox that authored it. This endpoint does no transactions, so a
// plain MongoMemoryServer (not a replica set) is enough, matching the
// non-transactional integration tests (assignments.test.js,
// teacher.test.js) rather than the replica-set ones (guestPersistence,
// completeQuizIdempotency, completeGameIdempotency, etc).

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

const Concept = require("../../src/models/Concept");
const Chapter = require("../../src/models/Chapter");
const Subject = require("../../src/models/Subject");
const Question = require("../../src/models/Question");
const QuizSession = require("../../src/models/QuizzSession");

async function registerStudent(grade = 6) {
  const email = `review-student-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Review Student", email, password: "password123", grade });
  return { token: res.body.token, userId: res.body.user.id };
}

async function seedConceptAndQuestions(count = 3) {
  const subject = await Subject.create({ name: "Mathematics", grade: 6 });
  const chapter = await Chapter.create({ subject_id: subject._id, title: "Chapter", order_index: 1 });
  const concept = await Concept.create({
    chapter_id: chapter._id,
    title: "Fractions",
    explanation_text: "Explanation",
  });
  const questions = [];
  for (let i = 0; i < count; i++) {
    questions.push(
      await Question.create({
        concept_id: concept._id,
        question_text: `Question ${i}`,
        options: [
          { id: "a", text: "Wrong" },
          { id: "b", text: "Right" },
        ],
        correct_option_id: "b",
        explanation_text: `Explanation for question ${i}`,
      }),
    );
  }
  return { concept, questions };
}

// Builds a completed session directly (bypassing start/answer/complete)
// so each test can control exactly which answers were right/wrong,
// which were left unanswered, and in what order, without depending on
// the idempotency-fix behavior of completeQuiz itself.
async function createCompletedSession(userId, concept, answeredQuestions, eligibleQuestionIds) {
  return QuizSession.create({
    user_id: userId,
    session_type: "weak-concept-targeted",
    eligible_question_ids: eligibleQuestionIds,
    started_at: new Date(Date.now() - 60000),
    completed_at: new Date(),
    questions: answeredQuestions.map((q, i) => ({
      question_id: q.question._id,
      concept_id: concept._id,
      selected_option_id: q.selectedOptionId,
      is_correct: q.selectedOptionId === q.question.correct_option_id,
      answered_at: new Date(Date.now() - (answeredQuestions.length - i) * 1000),
    })),
  });
}

describe("GET /api/quiz/:sessionId/review", () => {
  test("1. authenticated owner with mistakes gets a populated review", async () => {
    const { token, userId } = await registerStudent();
    const { concept, questions } = await seedConceptAndQuestions(2);
    const session = await createCompletedSession(
      userId,
      concept,
      [
        { question: questions[0], selectedOptionId: "a" }, // wrong
        { question: questions[1], selectedOptionId: "b" }, // right
      ],
      questions.map((q) => q._id),
    );

    const res = await request(app)
      .get(`/api/quiz/${session._id}/review`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mistakes).toHaveLength(1);
    const mistake = res.body.mistakes[0];
    expect(mistake.question_text).toBe("Question 0");
    expect(mistake.selected_option).toEqual({ id: "a", text: "Wrong" });
    expect(mistake.correct_option).toEqual({ id: "b", text: "Right" });
    expect(mistake.explanation).toBe("Explanation for question 0");
    expect(mistake.concept_title).toBe("Fractions");
  });

  test("2. unauthenticated request is rejected", async () => {
    const { userId } = await registerStudent();
    const { concept, questions } = await seedConceptAndQuestions(1);
    const session = await createCompletedSession(
      userId,
      concept,
      [{ question: questions[0], selectedOptionId: "a" }],
      [questions[0]._id],
    );

    const res = await request(app).get(`/api/quiz/${session._id}/review`);
    expect(res.status).toBe(401);
  });

  test("3. a different authenticated user cannot access another student's session", async () => {
    const owner = await registerStudent();
    const other = await registerStudent();
    const { concept, questions } = await seedConceptAndQuestions(1);
    const session = await createCompletedSession(
      owner.userId,
      concept,
      [{ question: questions[0], selectedOptionId: "a" }],
      [questions[0]._id],
    );

    const res = await request(app)
      .get(`/api/quiz/${session._id}/review`)
      .set("Authorization", `Bearer ${other.token}`);

    expect(res.status).toBe(403);
  });

  test("4. nonexistent session returns 404", async () => {
    const { token } = await registerStudent();
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/quiz/${fakeId}/review`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test("5. malformed session id returns 400, not a 500", async () => {
    const { token } = await registerStudent();

    const res = await request(app)
      .get("/api/quiz/not-a-valid-id/review")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  test("6. a quiz with no mistakes returns an empty array, not an error", async () => {
    const { token, userId } = await registerStudent();
    const { concept, questions } = await seedConceptAndQuestions(2);
    const session = await createCompletedSession(
      userId,
      concept,
      [
        { question: questions[0], selectedOptionId: "b" },
        { question: questions[1], selectedOptionId: "b" },
      ],
      questions.map((q) => q._id),
    );

    const res = await request(app)
      .get(`/api/quiz/${session._id}/review`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mistakes).toEqual([]);
  });

  test("7. an eligible-but-unanswered question is not reported as a mistake or an error", async () => {
    // A completed session can legitimately have eligible_question_ids
    // longer than questions[] — completeQuiz only requires at least
    // one answer, not every eligible question. There is nothing to
    // review for a question the student never attempted.
    const { token, userId } = await registerStudent();
    const { concept, questions } = await seedConceptAndQuestions(3);
    const session = await createCompletedSession(
      userId,
      concept,
      [{ question: questions[0], selectedOptionId: "a" }], // only 1 of 3 eligible, and wrong
      questions.map((q) => q._id), // all 3 were eligible
    );

    const res = await request(app)
      .get(`/api/quiz/${session._id}/review`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mistakes).toHaveLength(1);
    expect(res.body.mistakes[0].question_text).toBe("Question 0");
  });

  test("8. multiple mistakes preserve the original answer order, and correct answers are excluded", async () => {
    const { token, userId } = await registerStudent();
    const { concept, questions } = await seedConceptAndQuestions(4);
    const session = await createCompletedSession(
      userId,
      concept,
      [
        { question: questions[0], selectedOptionId: "a" }, // wrong, 1st
        { question: questions[1], selectedOptionId: "b" }, // right
        { question: questions[2], selectedOptionId: "a" }, // wrong, 2nd
        { question: questions[3], selectedOptionId: "a" }, // wrong, 3rd
      ],
      questions.map((q) => q._id),
    );

    const res = await request(app)
      .get(`/api/quiz/${session._id}/review`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mistakes).toHaveLength(3);
    expect(res.body.mistakes.map((m) => m.question_text)).toEqual([
      "Question 0",
      "Question 2",
      "Question 3",
    ]);
    expect(res.body.mistakes.some((m) => m.question_text === "Question 1")).toBe(false);
  });

  test("9. does not mutate QuizSession or Question data", async () => {
    const { token, userId } = await registerStudent();
    const { concept, questions } = await seedConceptAndQuestions(1);
    const session = await createCompletedSession(
      userId,
      concept,
      [{ question: questions[0], selectedOptionId: "a" }],
      [questions[0]._id],
    );
    const sessionBefore = await QuizSession.findById(session._id).lean();
    const questionBefore = await Question.findById(questions[0]._id).lean();

    await request(app)
      .get(`/api/quiz/${session._id}/review`)
      .set("Authorization", `Bearer ${token}`);

    const sessionAfter = await QuizSession.findById(session._id).lean();
    const questionAfter = await Question.findById(questions[0]._id).lean();
    expect(sessionAfter).toEqual(sessionBefore);
    expect(questionAfter).toEqual(questionBefore);
  });

  test("10. game-session type returns a clear 400 rather than a silent empty review", async () => {
    const { token, userId } = await registerStudent();
    const gameSession = await QuizSession.create({
      user_id: userId,
      session_type: "game-session",
      game_type: "MATH_FRACTION_BUILDER",
      started_at: new Date(),
      completed_at: new Date(),
    });

    const res = await request(app)
      .get(`/api/quiz/${gameSession._id}/review`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  test("11. a deleted/missing Question document does not crash the endpoint", async () => {
    const { token, userId } = await registerStudent();
    const { concept, questions } = await seedConceptAndQuestions(1);
    const session = await createCompletedSession(
      userId,
      concept,
      [{ question: questions[0], selectedOptionId: "a" }],
      [questions[0]._id],
    );
    await Question.findByIdAndDelete(questions[0]._id);

    const res = await request(app)
      .get(`/api/quiz/${session._id}/review`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mistakes).toHaveLength(1);
    expect(res.body.mistakes[0].question_text).toBeNull();
    expect(res.body.mistakes[0].explanation).toBeNull();
    expect(res.body.mistakes[0].correct_option).toBeNull();
    // The student's own selection is still reported even though the
    // question record it belonged to is gone.
    expect(res.body.mistakes[0].selected_option).toEqual({ id: "a", text: null });
  });
});

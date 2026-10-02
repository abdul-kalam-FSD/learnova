// Task 1C — completeGame duplicate / concurrent / retry behaviour.
//
// gameControllers.completeGame had the same defect completeQuiz had
// before Task 1A: it manages its transaction manually and had no
// handling for MongoDB's TransientTransactionError. Two genuinely
// overlapping completion requests for the same session write the same
// QuizSession document inside their own transactions, so the second
// gets a WriteConflict (code 112, TransientTransactionError) and the
// controller used to return a raw 500 for it. completeGame now retries
// the whole transaction (bounded to 5 attempts) on that label only.
//
// What this file proves, and how:
//   1. normal completion is unchanged
//   2. a sequential duplicate returns the stored result (no XP re-award)
//   3. two requests fired at the same server at the same time both
//      resolve 200, exactly one applies rewards, the other replays
//   4. XP / streak / mastery / assignment side effects happen once
//   5. a retry after a committed completion replays the stored result
//   6. a TransientTransactionError on the first attempt is retried in
//      a FRESH transaction and the completion still succeeds once
//   7. a persistent transient error is bounded (5 attempts) and rolls
//      everything back, leaving the session completable afterwards
//   8. a non-transient error is NOT retried, rolls the completion claim
//      back, and the student can complete successfully afterwards
//
// About "genuine overlap": at the HTTP level there is no way to force
// two requests to interleave inside MongoDB deterministically. Test 3
// therefore (a) fires both requests at one already-listening server in
// the same tick, (b) repeats over several independent sessions, and
// (c) records how many transactions were started — more than two means
// the retry path really ran for that round. That count is printed, not
// asserted, because a given round may or may not collide. Tests 6-8
// exercise the retry logic deterministically by injecting the error
// labels MongoDB itself would raise, so the retry path is covered even
// if the timing in test 3 never collides on a given machine.
//
// Same mongodb-memory-server replica-set + supertest setup as
// completeQuizIdempotency.test.js / guestPersistence.test.js (the
// completion path uses real transactions, which need a replica set).
// Run with: npx jest tests/integration/completeGameIdempotency.test.js --runInBand

const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");

jest.setTimeout(60000);

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
  jest.restoreAllMocks();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const GameContent = require("../../src/models/GameContent");
const UserConceptMastery = require("../../src/models/UserConceptMastery");
const Assignment = require("../../src/models/Assignment");
const QuizSession = require("../../src/models/QuizzSession");
const User = require("../../src/models/User");

// ---------- helpers ----------

async function registerStudent(grade) {
  const email = `game-idem-${grade}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Game Idempotency Student", email, password: "password123", grade });
  return { token: res.body.token, userId: res.body.user.id };
}

// Same real, checkable MATH_FRACTION_BUILDER level guestPersistence.test.js
// uses: [p1, p2] is the correct answer.
async function seedFractionLevel(grade) {
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
      pieces: [
        { id: "p1", numerator: 1, denominator: 4 },
        { id: "p2", numerator: 1, denominator: 4 },
        { id: "p3", numerator: 1, denominator: 8 },
      ],
      correct_piece_ids: ["p1", "p2"],
    },
  });
  return { concept, content };
}

// Registers a student, seeds a level, starts a game and submits a
// correct attempt — leaving the session ready for /complete.
async function setupAttemptedSession(grade = 6) {
  const { token, userId } = await registerStudent(grade);
  const { concept, content } = await seedFractionLevel(grade);

  const startRes = await request(app)
    .post("/api/games/start")
    .set("Authorization", `Bearer ${token}`)
    .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id });
  const sessionId = startRes.body.sessionId;

  const attemptRes = await request(app)
    .post(`/api/games/${sessionId}/attempt`)
    .set("Authorization", `Bearer ${token}`)
    .send({ selectedPieceIds: ["p1", "p2"] });
  expect(attemptRes.status).toBe(200);
  expect(attemptRes.body.isCorrect).toBe(true);

  return { token, userId, concept, content, sessionId };
}

function complete(token, sessionId, agent = request(app)) {
  return agent
    .post(`/api/games/${sessionId}/complete`)
    .set("Authorization", `Bearer ${token}`)
    .send({});
}

// Counts how many transactions the controller starts. Installed only
// right before the completion call(s) so setup traffic isn't counted.
// Each completion request starts exactly one transaction on its first
// attempt, so a total above the number of requests means a retry ran.
function trackTransactionStarts() {
  const counter = { starts: 0 };
  const originalStartSession = mongoose.startSession.bind(mongoose);
  jest.spyOn(mongoose, "startSession").mockImplementation(async (...args) => {
    const clientSession = await originalStartSession(...args);
    const originalStartTransaction = clientSession.startTransaction.bind(clientSession);
    clientSession.startTransaction = (...txArgs) => {
      counter.starts += 1;
      return originalStartTransaction(...txArgs);
    };
    return clientSession;
  });
  return counter;
}

// The error object MongoDB's driver raises for a retryable transaction
// failure: it exposes hasErrorLabel(). Used to inject the failure
// deterministically at a point that is inside the transaction and
// AFTER the completion claim has been written.
function makeTransientError() {
  const err = new Error("simulated WriteConflict (code 112)");
  err.code = 112;
  err.hasErrorLabel = (label) => label === "TransientTransactionError";
  return err;
}

// ---------- tests ----------

describe("completeGame idempotency, concurrency and retry", () => {
  test("1. normal completion still works exactly as before", async () => {
    const { token, userId, concept, sessionId } = await setupAttemptedSession();

    const res = await complete(token, sessionId);

    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
    expect(res.body.xpAwarded).toBeGreaterThan(0);
    expect(res.body.alreadyCompleted).toBeUndefined();
    expect(res.body.masteryUpdate.concept_id.toString()).toBe(concept._id.toString());

    const user = await User.findById(userId);
    expect(user.xp_total).toBe(res.body.xpAwarded);
    expect(user.streak_count).toBe(1);
    const session = await QuizSession.findById(sessionId);
    expect(session.completed_at).toBeInstanceOf(Date);
    expect(session.xp_awarded).toBe(res.body.xpAwarded);
  });

  test("2. a sequential duplicate returns 200 with the stored result and does not re-award XP", async () => {
    const { token, userId, sessionId } = await setupAttemptedSession();

    const first = await complete(token, sessionId);
    expect(first.status).toBe(200);
    const userAfterFirst = await User.findById(userId);

    const second = await complete(token, sessionId);

    expect(second.status).toBe(200);
    expect(second.body.alreadyCompleted).toBe(true);
    expect(second.body.xpAwarded).toBe(first.body.xpAwarded);
    expect(second.body.isCorrect).toBe(first.body.isCorrect);

    const userAfterSecond = await User.findById(userId);
    expect(userAfterSecond.xp_total).toBe(userAfterFirst.xp_total);
    expect(userAfterSecond.streak_count).toBe(userAfterFirst.streak_count);
  });

  test("3. two overlapping completion requests both resolve 200 and only one applies rewards", async () => {
    const ROUNDS = 3;
    let totalStarts = 0;
    let totalRequests = 0;

    for (let round = 1; round <= ROUNDS; round++) {
      const { token, userId, concept, sessionId } = await setupAttemptedSession();
      const counter = trackTransactionStarts();

      // One already-listening server, both requests created and awaited
      // in the same tick, so they hit it as close together as HTTP allows.
      const server = app.listen(0);
      let resA;
      let resB;
      try {
        const agent = request(server);
        [resA, resB] = await Promise.all([
          complete(token, sessionId, agent),
          complete(token, sessionId, agent),
        ]);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
      jest.restoreAllMocks();
      totalStarts += counter.starts;
      totalRequests += 2;

      // Neither request may surface a transient conflict as a 500.
      expect([resA.status, resB.status]).toEqual([200, 200]);

      // Exactly one winner (no alreadyCompleted flag) and one replay.
      const flags = [resA.body.alreadyCompleted, resB.body.alreadyCompleted];
      expect(flags.filter((f) => f === true)).toHaveLength(1);
      expect(flags.filter((f) => f === undefined)).toHaveLength(1);

      // Both report the same stored result.
      expect(resA.body.xpAwarded).toBe(resB.body.xpAwarded);
      expect(resA.body.isCorrect).toBe(true);
      expect(resB.body.isCorrect).toBe(true);

      // Persisted state: rewards applied exactly once.
      const user = await User.findById(userId);
      expect(user.xp_total).toBe(resA.body.xpAwarded);
      expect(user.streak_count).toBe(1);
      const session = await QuizSession.findById(sessionId);
      expect(session.xp_awarded).toBe(resA.body.xpAwarded);
      expect(await QuizSession.countDocuments({ user_id: userId, completed_at: { $ne: null } })).toBe(1);
      expect(await UserConceptMastery.countDocuments({ user_id: userId, concept_id: concept._id })).toBe(1);
    }

    // Diagnostic only (not asserted — a given round may not collide):
    // more transactions than requests means the retry path ran.
    console.info(
      `[completeGame concurrency] ${totalRequests} completion requests started ${totalStarts} transactions ` +
        (totalStarts > totalRequests
          ? "-> the transient-conflict retry path was exercised by real overlap"
          : "-> no retry was needed in these rounds (requests did not collide inside MongoDB)"),
    );
  });

  test("4. duplicate and concurrent completion do not duplicate mastery, streak or assignment side effects", async () => {
    const { token, userId, concept, sessionId } = await setupAttemptedSession();
    const teacher = await User.create({
      name: "Ms. Teacher",
      email: `game-teacher-${Date.now()}@test.com`,
      password_hash: "irrelevant-for-this-test",
      role: "teacher",
      grade: 6,
    });
    const assignment = await Assignment.create({
      teacher_id: teacher._id,
      concept_id: concept._id,
      students: [{ student_id: userId, status: "pending" }],
    });

    await Promise.all([complete(token, sessionId), complete(token, sessionId)]);
    await complete(token, sessionId);
    await complete(token, sessionId);

    const mastery = await UserConceptMastery.findOne({ user_id: userId, concept_id: concept._id });
    // One correct attempt is exactly one mastery transition, however
    // many completion requests were made.
    expect(mastery.correct_streak).toBe(1);
    expect(await UserConceptMastery.countDocuments({ user_id: userId, concept_id: concept._id })).toBe(1);

    const user = await User.findById(userId);
    expect(user.streak_count).toBe(1);

    const updatedAssignment = await Assignment.findById(assignment._id);
    const mine = updatedAssignment.students.find((s) => s.student_id.toString() === userId);
    expect(mine.status).toBe("completed");

    const session = await QuizSession.findById(sessionId);
    expect(session.sync_status).not.toBe("pending");
  });

  test("5. a retry after a committed completion recovers the stored result instead of erroring", async () => {
    const { token, sessionId } = await setupAttemptedSession();

    const committed = await complete(token, sessionId);
    expect(committed.status).toBe(200);

    // A client that never saw the first response and retries.
    const retry = await complete(token, sessionId);

    expect(retry.status).toBe(200);
    expect(retry.body.message).toBeUndefined();
    expect(retry.body.alreadyCompleted).toBe(true);
    expect(retry.body.xpAwarded).toBe(committed.body.xpAwarded);
    expect(retry.body.isCorrect).toBe(committed.body.isCorrect);
  });

  test("6. a TransientTransactionError on the first attempt is retried in a fresh transaction and completes exactly once", async () => {
    const { token, userId, sessionId } = await setupAttemptedSession();
    const counter = trackTransactionStarts();

    // Fails once, AFTER the completion claim has been written inside
    // the transaction, then behaves normally — so the abort has to roll
    // the claim back for the retry to be able to win it again.
    const saveSpy = jest
      .spyOn(UserConceptMastery.prototype, "save")
      .mockRejectedValueOnce(makeTransientError());

    const res = await complete(token, sessionId);

    expect(res.status).toBe(200);
    expect(res.body.alreadyCompleted).toBeUndefined(); // the retry was the real winner
    expect(res.body.xpAwarded).toBeGreaterThan(0);
    expect(counter.starts).toBe(2); // first attempt + one fresh retry
    expect(saveSpy).toHaveBeenCalledTimes(2);

    const user = await User.findById(userId);
    expect(user.xp_total).toBe(res.body.xpAwarded); // awarded once, not twice
    expect(user.streak_count).toBe(1);
    expect(await UserConceptMastery.countDocuments({ user_id: userId })).toBe(1);
    const session = await QuizSession.findById(sessionId);
    expect(session.completed_at).toBeInstanceOf(Date);
    expect(session.xp_awarded).toBe(res.body.xpAwarded);
  });

  test("7. a persistent transient error is bounded to 5 attempts, rolls everything back, and the session stays completable", async () => {
    const { token, userId, sessionId } = await setupAttemptedSession();
    const counter = trackTransactionStarts();
    jest.spyOn(UserConceptMastery.prototype, "save").mockRejectedValue(makeTransientError());

    const failed = await complete(token, sessionId);

    expect(failed.status).toBe(500);
    expect(failed.body.alreadyCompleted).toBeUndefined();
    expect(counter.starts).toBe(5); // bounded — not infinite

    // Nothing from any of the 5 attempts survived.
    const sessionAfterFailure = await QuizSession.findById(sessionId);
    // An un-completed session has no completed_at field at all, which Mongoose
    // reads back as undefined (not null) — `?? null` treats both as "not completed",
    // the same way the controller's own `completed_at: null` claim filter does.
    expect(sessionAfterFailure.completed_at ?? null).toBeNull();
    expect((await User.findById(userId)).xp_total).toBe(0);
    expect(await UserConceptMastery.countDocuments({ user_id: userId })).toBe(0);

    // Once the fault is gone, the same session completes normally.
    jest.restoreAllMocks();
    const recovered = await complete(token, sessionId);
    expect(recovered.status).toBe(200);
    expect(recovered.body.alreadyCompleted).toBeUndefined();
    expect(recovered.body.xpAwarded).toBeGreaterThan(0);
    expect((await User.findById(userId)).xp_total).toBe(recovered.body.xpAwarded);
  });

  test("8. a non-transient error is not retried, rolls the completion claim back, and a later attempt succeeds", async () => {
    const { token, userId, sessionId } = await setupAttemptedSession();
    const counter = trackTransactionStarts();
    const saveSpy = jest
      .spyOn(UserConceptMastery.prototype, "save")
      .mockRejectedValueOnce(new Error("simulated non-transient failure"));

    const failed = await complete(token, sessionId);

    expect(failed.status).toBe(500);
    expect(counter.starts).toBe(1); // ordinary errors are never retried
    expect(saveSpy).toHaveBeenCalledTimes(1);

    // The claim (completed_at) was written before the failure and must
    // have been rolled back together with everything else.
    const sessionAfterFailure = await QuizSession.findById(sessionId);
    // An un-completed session has no completed_at field at all, which Mongoose
    // reads back as undefined (not null) — `?? null` treats both as "not completed",
    // the same way the controller's own `completed_at: null` claim filter does.
    expect(sessionAfterFailure.completed_at ?? null).toBeNull();
    expect((await User.findById(userId)).xp_total).toBe(0);

    // The student retries and gets a real, single completion — not a
    // false "already completed" replay of a completion that never
    // committed.
    const recovered = await complete(token, sessionId);
    expect(recovered.status).toBe(200);
    expect(recovered.body.alreadyCompleted).toBeUndefined();
    expect(recovered.body.xpAwarded).toBeGreaterThan(0);
    expect((await User.findById(userId)).xp_total).toBe(recovered.body.xpAwarded);
  });
});
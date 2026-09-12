// NOTE: These tests use mongodb-memory-server, which downloads a real
// MongoDB binary on first run. That download is blocked by this
// sandbox's network allowlist (fastdl.mongodb.org is not reachable
// here) — same limitation noted in security.test.js/gameSelection.test.js.
// They will run normally on a real dev machine or CI runner with
// internet access. Run with: npx jest tests/integration/guestPersistence.test.js
//
// Scope: verifies the guest -> gameplay -> XP/mastery/streak
// persistence path end-to-end against a real (in-memory) MongoDB —
// i.e. that a guest's play isn't just held in localStorage/JWT
// claims, but is actually written to and re-read from the database,
// and that it survives the guest -> registered-account upgrade.

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

const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const GameContent = require("../../src/models/GameContent");
const UserConceptMastery = require("../../src/models/UserConceptMastery");
const User = require("../../src/models/User");
const QuizSession = require("../../src/models/QuizzSession");

// ---------- helpers ----------

// Mirrors seedGameForGrade in gameSelection.test.js — a single
// MATH_FRACTION_BUILDER level with a real, checkable correct answer
// (checkAttempt's subset-sum rule for this game_type), not just a
// placeholder payload, so submitGameAttempt's scoring is exercised
// for real rather than assumed.
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
  return { subject, chapter, concept, content };
}

async function createGuest(grade) {
  const res = await request(app).post("/api/auth/guest").send({ grade });
  return { token: res.body.token, userId: res.body.user.id, body: res.body };
}

async function playThroughFractionGame(token, content, selectedPieceIds) {
  const startRes = await request(app)
    .post("/api/games/start")
    .set("Authorization", `Bearer ${token}`)
    .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id });
  const sessionId = startRes.body.sessionId;

  const attemptRes = await request(app)
    .post(`/api/games/${sessionId}/attempt`)
    .set("Authorization", `Bearer ${token}`)
    .send({ selectedPieceIds });

  const completeRes = await request(app)
    .post(`/api/games/${sessionId}/complete`)
    .set("Authorization", `Bearer ${token}`)
    .send({});

  return { sessionId, startRes, attemptRes, completeRes };
}

// ---------- tests ----------

describe("Guest session creation", () => {
  test("POST /api/auth/guest creates a real, persisted User document scoped to the chosen grade", async () => {
    const { token, userId, body } = await createGuest(7);

    expect(token).toBeTruthy();
    expect(body.user.is_guest).toBe(true);
    expect(body.user.grade).toBe(7);

    // Not just a JWT claim — an actual row exists in the DB.
    const stored = await User.findById(userId);
    expect(stored).not.toBeNull();
    expect(stored.is_guest).toBe(true);
    expect(stored.grade).toBe(7);
    expect(stored.xp_total).toBe(0);
    expect(stored.email).toBeUndefined();
  });

  test("rejects a grade outside 4-12", async () => {
    const res = await request(app).post("/api/auth/guest").send({ grade: 3 });
    expect(res.status).toBe(400);
  });
});

describe("Guest -> gameplay -> XP/mastery/streak persistence", () => {
  test("a correct attempt persists XP, mastery, streak, and a completed session to the database", async () => {
    const { token, userId } = await createGuest(6);
    const { concept, content } = await seedFractionLevel(6);

    const { sessionId, attemptRes, completeRes } =
      await playThroughFractionGame(token, content, ["p1", "p2"]);

    expect(attemptRes.status).toBe(200);
    expect(attemptRes.body.isCorrect).toBe(true);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.xpAwarded).toBeGreaterThan(0);
    expect(completeRes.body.masteryUpdate.concept_id.toString()).toBe(
      concept._id.toString(),
    );
    // Phase 6B (P1-3): additive fields — a brand-new mastery record
    // starts at "weak", and a single correct attempt (this helper only
    // plays through once) isn't enough to leave "weak" per
    // applyMasteryTransition's own 2-in-a-row rule, so this is exactly
    // the "no fabricated update" case the fix targets.
    expect(completeRes.body.masteryUpdate.previous_state).toBe("weak");
    expect(completeRes.body.masteryUpdate.changed).toBe(false);
    expect(completeRes.body.masteryUpdate.new_state).toBe("weak");

    // Re-read every affected collection directly from the database —
    // this is the actual "hits real Mongo" check, independent of
    // whatever the API response claims.
    const storedUser = await User.findById(userId);
    expect(storedUser.xp_total).toBe(completeRes.body.xpAwarded);
    expect(storedUser.streak_count).toBe(1);
    expect(storedUser.last_active_date).not.toBeNull();

    const mastery = await UserConceptMastery.findOne({
      user_id: userId,
      concept_id: concept._id,
    });
    expect(mastery).not.toBeNull();
    // A single correct attempt is exactly one short of the 2-in-a-row
    // promotion rule in applyMasteryTransition (see the masteryUpdate
    // assertions above) -- state correctly stays "weak" here.
    expect(mastery.state).toBe("weak");

    const session = await QuizSession.findById(sessionId);
    expect(session.completed_at).not.toBeNull();
    expect(session.xp_awarded).toBe(completeRes.body.xpAwarded);
    expect(session.game_payload.is_correct).toBe(true);
  });

  test("an incorrect attempt still records a completed session with zero XP and no mastery promotion", async () => {
    const { token, userId } = await createGuest(6);
    const { concept, content } = await seedFractionLevel(6);

    const { sessionId, attemptRes, completeRes } =
      await playThroughFractionGame(token, content, ["p3"]); // wrong subset

    expect(attemptRes.body.isCorrect).toBe(false);
    expect(completeRes.body.isCorrect).toBe(false);
    expect(completeRes.body.xpAwarded).toBe(0);

    const storedUser = await User.findById(userId);
    expect(storedUser.xp_total).toBe(0);

    const mastery = await UserConceptMastery.findOne({
      user_id: userId,
      concept_id: concept._id,
    });
    expect(mastery.state).toBe("weak");

    const session = await QuizSession.findById(sessionId);
    expect(session.completed_at).not.toBeNull();
    expect(session.game_payload.is_correct).toBe(false);
  });

  test("GET /api/auth/me reflects persisted XP after reconnecting with the same guest token", async () => {
    const { token, userId } = await createGuest(8);
    const { content } = await seedFractionLevel(8);
    const { completeRes } = await playThroughFractionGame(token, content, [
      "p1",
      "p2",
    ]);

    // Simulates the guest closing/reopening the app: a fresh request
    // with the stored token, no in-memory state carried over.
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.id).toBe(userId);
    expect(meRes.body.user.xp_total).toBe(completeRes.body.xpAwarded);
  });

  test("two guest sessions do not share or leak XP/mastery", async () => {
    const guestA = await createGuest(6);
    const guestB = await createGuest(6);
    const { content } = await seedFractionLevel(6);

    await playThroughFractionGame(guestA.token, content, ["p1", "p2"]);

    const userA = await User.findById(guestA.userId);
    const userB = await User.findById(guestB.userId);
    expect(userA.xp_total).toBeGreaterThan(0);
    expect(userB.xp_total).toBe(0);

    const masteryB = await UserConceptMastery.findOne({
      user_id: guestB.userId,
    });
    expect(masteryB).toBeNull();
  });

  test("a guest cannot play content outside their own grade (cross-grade isolation still applies to guests)", async () => {
    const { token } = await createGuest(6);
    const { content } = await seedFractionLevel(9); // different grade

    const res = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id });

    expect(res.status).toBe(403);
  });
});

describe("Guest -> registered account upgrade preserves persisted progress", () => {
  test("XP, mastery, streak and session history survive the upgrade, under the same user _id", async () => {
    const { token, userId } = await createGuest(6);
    const { concept, content } = await seedFractionLevel(6);
    const { completeRes } = await playThroughFractionGame(token, content, [
      "p1",
      "p2",
    ]);
    const xpBeforeUpgrade = completeRes.body.xpAwarded;

    const upgradeEmail = `upgraded-${Date.now()}@test.com`;
    const upgradeRes = await request(app)
      .post("/api/auth/upgrade-guest")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Real Name",
        email: upgradeEmail,
        password: "password123",
      });

    expect(upgradeRes.status).toBe(200);
    expect(upgradeRes.body.user.id).toBe(userId); // same document, in-place upgrade
    expect(upgradeRes.body.user.is_guest).toBe(false);

    const storedUser = await User.findById(userId);
    expect(storedUser.is_guest).toBe(false);
    expect(storedUser.email).toBe(upgradeEmail);
    expect(storedUser.xp_total).toBe(xpBeforeUpgrade);
    expect(storedUser.streak_count).toBe(1);

    const mastery = await UserConceptMastery.findOne({
      user_id: userId,
      concept_id: concept._id,
    });
    expect(mastery).not.toBeNull();
    // Same single-correct-attempt case as the guest-persistence test
    // above -- one correct attempt keeps state "weak" per the 2-in-a-row
    // promotion rule.
    expect(mastery.state).toBe("weak");

    // The upgraded account's new token still resolves to the same
    // progress via /auth/me (new login, old data).
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${upgradeRes.body.token}`);
    expect(meRes.body.user.xp_total).toBe(xpBeforeUpgrade);
  });

  test("a real (non-guest) account cannot call upgrade-guest to reset its own credentials", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Already Real",
      email: `real-${Date.now()}@test.com`,
      password: "password123",
      grade: 6,
    });
    const token = registerRes.body.token;

    const res = await request(app)
      .post("/api/auth/upgrade-guest")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Hijack",
        email: `hijack-${Date.now()}@test.com`,
        password: "password123",
      });

    expect(res.status).toBe(400);
  });
});

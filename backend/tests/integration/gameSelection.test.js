// Integration tests for the Game Selection Engine (Section 17/18):
// GET /api/games/catalog and GET /api/games/recommended.
//
// Same mongodb-memory-server + supertest pattern as
// tests/integration/security.test.js — see that file's header note:
// the memory-server binary download is blocked in this sandbox's
// network allowlist, so these run on a real dev machine / CI, not here.
// Run with: npx jest tests/integration/gameSelection.test.js

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

const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const GameContent = require("../../src/models/GameContent");
const UserConceptMastery = require("../../src/models/UserConceptMastery");
const QuizSession = require("../../src/models/QuizzSession");

async function registerStudent(grade) {
  const email = `student-${grade}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test Student", email, password: "password123", grade });
  return { token: res.body.token, userId: res.body.user.id };
}

// Mirrors seedGradeContent in security.test.js but also creates one
// GameContent item, since that's what catalog/recommended read.
async function seedGameForGrade(grade, { subjectName = "Mathematics", gameType = "MATH_FRACTION_BUILDER" } = {}) {
  const subject = await Subject.create({ name: subjectName, grade });
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
    game_type: gameType,
    concept_id: concept._id,
    title: "Level 1",
    difficulty: "easy",
    payload: { target: { numerator: 1, denominator: 2 }, pieces: [], correct_piece_ids: [] },
  });
  return { subject, chapter, concept, content };
}

// Adds another GameContent item (a different game_type/mechanic) to
// an already-seeded concept, for testing tier-preference/fallback
// within a single concept.
async function seedGameForConcept(concept, gameType, { title = "Level 2", difficulty = "easy" } = {}) {
  return GameContent.create({
    game_type: gameType,
    concept_id: concept._id,
    title,
    difficulty,
    payload: { target: { numerator: 1, denominator: 2 }, pieces: [], correct_piece_ids: [] },
  });
}

// Phase 6C-C: a completed game-session QuizSession row, keyed exactly the
// way completeGame writes one — content_id + completed_at set — so
// getRecommendedGame's alreadyCompleted check has real data to find.
async function completeGameSession(userId, contentId, gameType) {
  return QuizSession.create({
    user_id: userId,
    session_type: "game-session",
    game_type: gameType,
    content_id: contentId,
    started_at: new Date(),
    completed_at: new Date(),
  });
}

describe("GET /api/games/catalog", () => {
  test("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/games/catalog");
    expect(res.status).toBe(401);
  });

  test("groups a student's own-grade content by subject", async () => {
    const { token } = await registerStudent(6);
    await seedGameForGrade(6, { subjectName: "Mathematics", gameType: "MATH_FRACTION_BUILDER" });
    await seedGameForGrade(6, { subjectName: "Physics", gameType: "PHYSICS_CIRCUIT_BUILDER" });

    const res = await request(app)
      .get("/api/games/catalog")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const subjects = res.body.catalog.map((s) => s.subject).sort();
    expect(subjects).toEqual(["Mathematics", "Physics"]);

    const math = res.body.catalog.find((s) => s.subject === "Mathematics");
    expect(math.gameTypes).toEqual([
      { game_type: "MATH_FRACTION_BUILDER", label: "Fraction Builder", count: 1, isNew: true },
    ]);
  });

  test("does not leak another grade's content into the catalog (cross-grade isolation)", async () => {
    const { token: grade6Token } = await registerStudent(6);
    // Content only exists for grade 9 — the same IDOR class covered
    // for /games/start in security.test.js, checked here for /catalog.
    await seedGameForGrade(9, { subjectName: "Mathematics", gameType: "MATH_EQUATION_BUILDER" });

    const res = await request(app)
      .get("/api/games/catalog")
      .set("Authorization", `Bearer ${grade6Token}`);

    expect(res.status).toBe(200);
    expect(res.body.catalog).toEqual([]);
  });
});

describe("GET /api/games/recommended", () => {
  test("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/games/recommended");
    expect(res.status).toBe(401);
  });

  test("404s when the student's grade has no game content yet", async () => {
    const { token } = await registerStudent(6);
    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test("falls back to any content when the student has no mastery records", async () => {
    const { token } = await registerStudent(6);
    await seedGameForGrade(6, { subjectName: "Mathematics", gameType: "MATH_FRACTION_BUILDER" });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.gameType).toBe("MATH_FRACTION_BUILDER");
    expect(res.body.subject).toBe("Mathematics");
    expect(res.body.reason).toBe("fallback-any-content");
  });

  test("prioritizes a weak-mastery concept's game over a strong one", async () => {
    const { token, userId } = await registerStudent(6);
    const weak = await seedGameForGrade(6, {
      subjectName: "Physics",
      gameType: "PHYSICS_CIRCUIT_BUILDER",
    });
    const strong = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_BUILDER",
    });

    await UserConceptMastery.create({
      user_id: userId,
      concept_id: weak.concept._id,
      state: "weak",
    });
    await UserConceptMastery.create({
      user_id: userId,
      concept_id: strong.concept._id,
      state: "strong",
    });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.gameType).toBe("PHYSICS_CIRCUIT_BUILDER");
    expect(res.body.reason).toBe("weak-concept");
  });
});

// Phase 6C-C: "Recommended Next" must not imply new content when the
// recommendation engine's pick was already completed. alreadyCompleted is
// derived from a real completed QuizSession row keyed to the exact
// GameContent._id recommended — never from mastery state alone.
describe("GET /api/games/recommended - alreadyCompleted (Phase 6C-C)", () => {
  test("alreadyCompleted is false when the student has never completed the recommended content", async () => {
    const { token } = await registerStudent(6);
    await seedGameForGrade(6, { subjectName: "Mathematics", gameType: "MATH_FRACTION_BUILDER" });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.alreadyCompleted).toBe(false);
    expect(res.body.contentId).toBeTruthy();
  });

  test("alreadyCompleted is true when the student has a completed session for the exact recommended content", async () => {
    const { token, userId } = await registerStudent(6);
    const seeded = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_BUILDER",
    });
    await completeGameSession(userId, seeded.content._id, "MATH_FRACTION_BUILDER");

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.gameType).toBe("MATH_FRACTION_BUILDER");
    expect(res.body.contentId).toBe(String(seeded.content._id));
    expect(res.body.alreadyCompleted).toBe(true);
  });

  test("alreadyCompleted stays false for an in-progress (not-yet-completed) session on the same content", async () => {
    const { token, userId } = await registerStudent(6);
    const seeded = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_BUILDER",
    });
    // Started but never completed — completed_at intentionally left unset.
    await QuizSession.create({
      user_id: userId,
      session_type: "game-session",
      game_type: "MATH_FRACTION_BUILDER",
      content_id: seeded.content._id,
      started_at: new Date(),
    });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.alreadyCompleted).toBe(false);
  });

  test("alreadyCompleted does not leak across students (another student's completion doesn't mark this student's recommendation as completed)", async () => {
    const { token: studentAToken } = await registerStudent(6);
    const { userId: studentBId } = await registerStudent(6);
    const seeded = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_BUILDER",
    });
    await completeGameSession(studentBId, seeded.content._id, "MATH_FRACTION_BUILDER");

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${studentAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.alreadyCompleted).toBe(false);
  });

  test("alreadyCompleted is content-specific, not gameType-wide: completing one level of a gameType doesn't mark a different level of the same gameType as completed", async () => {
    const { token, userId } = await registerStudent(6);
    const seeded = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_BUILDER",
    });
    // A second GameContent doc, same game_type, same concept — completing
    // this one must not mark the (newer, recommended) other one complete.
    const otherContent = await GameContent.create({
      game_type: "MATH_FRACTION_BUILDER",
      concept_id: seeded.concept._id,
      title: "Level 2",
      difficulty: "easy",
      payload: { target: { numerator: 1, denominator: 2 }, pieces: [], correct_piece_ids: [] },
    });
    await completeGameSession(userId, seeded.content._id, "MATH_FRACTION_BUILDER");

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // findBestContent sorts by createdAt desc, so the newer otherContent is
    // the one actually recommended here — and it was never completed.
    expect(res.body.contentId).toBe(String(otherContent._id));
    expect(res.body.alreadyCompleted).toBe(false);
  });
});

// Adaptive mechanic selection (Section 3/4 of the completion spec):
// getRecommendedGame must pick the mechanic *tier* that matches the
// student's mastery state for a concept, not just any game_type
// registered for that concept.
describe("GET /api/games/recommended - adaptive mechanic tier selection", () => {
  test("weak mastery prefers a GUIDED mechanic over other tiers on the same concept", async () => {
    const { token, userId } = await registerStudent(6);
    // MATH_FRACTION_BUILDER = GUIDED, MATH_FRACTION_SPEED_CHALLENGE = ADVANCED
    const seeded = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_SPEED_CHALLENGE",
    });
    await seedGameForConcept(seeded.concept, "MATH_FRACTION_BUILDER");

    await UserConceptMastery.create({ user_id: userId, concept_id: seeded.concept._id, state: "weak" });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.gameType).toBe("MATH_FRACTION_BUILDER");
    expect(res.body.mechanicTier).toBe("GUIDED");
    expect(res.body.reason).toBe("weak-concept");
  });

  test("learning mastery prefers a PRACTICE mechanic over other tiers on the same concept", async () => {
    const { token, userId } = await registerStudent(6);
    // MATH_FRACTION_BUILDER = GUIDED, MATH_NUMBER_MACHINE = PRACTICE
    const seeded = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_BUILDER",
    });
    await seedGameForConcept(seeded.concept, "MATH_NUMBER_MACHINE");

    await UserConceptMastery.create({ user_id: userId, concept_id: seeded.concept._id, state: "learning" });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.gameType).toBe("MATH_NUMBER_MACHINE");
    expect(res.body.mechanicTier).toBe("PRACTICE");
    expect(res.body.reason).toBe("learning-concept");
  });

  test("strong mastery prefers an ADVANCED mechanic over other tiers on the same concept", async () => {
    const { token, userId } = await registerStudent(6);
    // MATH_FRACTION_BUILDER = GUIDED, MATH_FRACTION_SPEED_CHALLENGE = ADVANCED
    const seeded = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_BUILDER",
    });
    await seedGameForConcept(seeded.concept, "MATH_FRACTION_SPEED_CHALLENGE");

    await UserConceptMastery.create({ user_id: userId, concept_id: seeded.concept._id, state: "strong" });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.gameType).toBe("MATH_FRACTION_SPEED_CHALLENGE");
    expect(res.body.mechanicTier).toBe("ADVANCED");
    expect(res.body.reason).toBe("strong-concept");
  });

  test("falls back to an available mechanic when the preferred tier has no content for the concept", async () => {
    const { token, userId } = await registerStudent(6);
    // Only an ADVANCED mechanic exists for this concept, but mastery is weak
    // (prefers GUIDED). Must still recommend the ADVANCED one rather than
    // returning nothing or jumping to a different concept.
    const seeded = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_SPEED_CHALLENGE",
    });

    await UserConceptMastery.create({ user_id: userId, concept_id: seeded.concept._id, state: "weak" });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.gameType).toBe("MATH_FRACTION_SPEED_CHALLENGE");
    expect(res.body.reason).toBe("weak-concept");
  });

  test("never recommends a game_type that isn't in the registry", async () => {
    const { token, userId } = await registerStudent(6);
    const seeded = await seedGameForGrade(6, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_BUILDER",
    });
    // Simulate a stale/unregistered game_type left behind in the DB.
    await seedGameForConcept(seeded.concept, "MATH_RETIRED_MECHANIC", { title: "Stale" });

    await UserConceptMastery.create({ user_id: userId, concept_id: seeded.concept._id, state: "weak" });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.gameType).toBe("MATH_FRACTION_BUILDER");
    expect(res.body.gameType).not.toBe("MATH_RETIRED_MECHANIC");
  });

  test("does not recommend a grade-incompatible game even with matching mastery", async () => {
    const { token: grade6Token, userId: grade6UserId } = await registerStudent(6);
    // Weak-mastery concept only exists for grade 9 — grade 6 student's
    // gradeConceptIds must never include it.
    const grade9 = await seedGameForGrade(9, {
      subjectName: "Mathematics",
      gameType: "MATH_FRACTION_BUILDER",
    });
    await seedGameForGrade(6, { subjectName: "Physics", gameType: "PHYSICS_CIRCUIT_BUILDER" });

    await UserConceptMastery.create({
      user_id: grade6UserId,
      concept_id: grade9.concept._id,
      state: "weak",
    });

    const res = await request(app)
      .get("/api/games/recommended")
      .set("Authorization", `Bearer ${grade6Token}`);

    expect(res.status).toBe(200);
    expect(res.body.gameType).toBe("PHYSICS_CIRCUIT_BUILDER");
    expect(res.body.reason).toBe("fallback-any-content");
  });
});

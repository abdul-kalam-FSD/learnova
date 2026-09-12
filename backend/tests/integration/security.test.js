// NOTE: These tests use mongodb-memory-server, which downloads a real
// MongoDB binary on first run. That download is blocked by this
// sandbox's network allowlist (fastdl.mongodb.org is not reachable
// here) — verified directly, see the audit conversation. They will
// run normally in a real dev machine or CI runner with internet
// access. Run with: npx jest tests/integration
//
// Scope: only the things actually fixed/changed this session —
// per "don't generate meaningless tests for coverage numbers".

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
  // app.js calls connectDB() itself on require, using MONGO_URI above.
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

// ---------- helpers ----------
const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const Question = require("../../src/models/Question");
const Case = require("../../src/models/Case");
const GameContent = require("../../src/models/GameContent");

async function registerStudent(grade) {
  const email = `student-${grade}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test Student", email, password: "password123", grade });
  return { token: res.body.token, userId: res.body.user.id };
}

async function seedGradeContent(grade) {
  const subject = await Subject.create({ name: "Biology", grade });
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
    explanation_text: "Basic math",
  });
  return { subject, chapter, concept, question };
}

// ---------- Authentication ----------
describe("Authentication", () => {
  test("register rejects a password under 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "X", email: "short@test.com", password: "abc", grade: 9 });
    expect(res.status).toBe(400);
  });

  test("register rejects a duplicate email", async () => {
    const email = "dupe@test.com";
    await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email, password: "password123", grade: 9 });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "B", email, password: "password123", grade: 9 });
    expect(res.status).toBe(400);
  });

  test("register cannot self-assign a role", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "X",
      email: "roletest@test.com",
      password: "password123",
      grade: 9,
      role: "admin",
    });
    expect(res.body.user.role).toBe("student");
  });

  test("login fails with wrong password, no account-enumeration hint", async () => {
    const email = "loginfail@test.com";
    await request(app)
      .post("/api/auth/register")
      .send({ name: "X", email, password: "password123", grade: 9 });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrongpassword" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test("protected route rejects requests with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("protected route rejects an invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

// ---------- Authorization ----------
describe("Authorization", () => {
  test("student cannot access GameContent admin endpoints", async () => {
    const { token } = await registerStudent(9);
    const res = await request(app)
      .get("/api/admin/game-content")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("student cannot access admin endpoints", async () => {
    const { token } = await registerStudent(9);
    const res = await request(app)
      .get("/api/admin/students")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("student cannot start a case from a different grade (cross-grade IDOR)", async () => {
    const { question, ...g12 } = await seedGradeContent(12);
    const caseDoc = await Case.create({
      title: "Grade 12 Case",
      intro_text: "intro",
      mission_text: "mission",
      clue_count: 1,
      concept_ids: [g12.concept._id],
      dragdrop_task: { items: ["Step 1"] },
      matching_task: { pairs: [{ structure: "Structure 1", role: "Role 1" }] },
    });
    const { token } = await registerStudent(9); // Grade 9 student, Grade 12 case
    const res = await request(app)
      .post(`/api/cases/${caseDoc._id}/start`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("student cannot start GameContent from a different grade", async () => {
    const g6 = await seedGradeContent(6);
    const content = await GameContent.create({
      game_type: "MATH_FRACTION_BUILDER",
      concept_id: g6.concept._id,
      title: "Grade 6 challenge",
      payload: {
        target: { numerator: 1, denominator: 2 },
        pieces: [{ id: "p1", numerator: 1, denominator: 2 }],
        correct_piece_ids: ["p1"],
      },
    });
    const { token } = await registerStudent(9); // Grade 9 student, Grade 6 content
    const res = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id });
    expect(res.status).toBe(403);
  });

  test("student cannot view a chapter from a different grade", async () => {
    const g12 = await seedGradeContent(12);
    const { token } = await registerStudent(9);
    const res = await request(app)
      .get(`/api/chapters/${g12.chapter._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("student A cannot submit answers into student B's quiz session", async () => {
    const g9 = await seedGradeContent(9);
    const { token: tokenA } = await registerStudent(9);
    const { token: tokenB } = await registerStudent(9);

    const startRes = await request(app)
      .post("/api/quiz/start")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ sessionType: "weak-concept-targeted" })
      .catch(() => null);

    // weak-concept-targeted requires an existing "weak" mastery record,
    // which a fresh student won't have — so seed one directly.
    const UserConceptMastery = require("../../src/models/UserConceptMastery");
    const jwt = require("jsonwebtoken");
    const decodedA = jwt.verify(tokenA, process.env.JWT_SECRET);
    await UserConceptMastery.create({
      user_id: decodedA.userId,
      concept_id: g9.concept._id,
      state: "weak",
      correct_streak: 0,
    });

    const realStart = await request(app)
      .post("/api/quiz/start")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ sessionType: "weak-concept-targeted" });
    expect(realStart.status).toBe(201);
    const sessionId = realStart.body.sessionId;

    const hijackAttempt = await request(app)
      .post(`/api/quiz/${sessionId}/answer`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ questionId: g9.question._id, selectedOptionId: "b" });

    expect(hijackAttempt.status).toBe(403);
  });
});

// ---------- Game answer-key security ----------
describe("Game answer security", () => {
  test("startGame response never contains the answer key", async () => {
    const g6 = await seedGradeContent(6);
    const content = await GameContent.create({
      game_type: "MATH_FRACTION_BUILDER",
      concept_id: g6.concept._id,
      title: "Build 1/2",
      payload: {
        target: { numerator: 1, denominator: 2 },
        pieces: [
          { id: "p1", numerator: 1, denominator: 2 },
          { id: "p2", numerator: 1, denominator: 4 },
          { id: "p3", numerator: 1, denominator: 8 },
        ],
        correct_piece_ids: ["p1"],
        hint: "It's just one piece",
      },
    });
    const { token } = await registerStudent(6);
    const res = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id });

    expect(res.status).toBe(201);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/correct_piece_ids/);
    // Piece ids (p1/p2/p3) ARE meant to be visible — the student needs
    // to see every option to play. What must never leak is *which one
    // is correct*, i.e. the correct_piece_ids key/value pairing itself
    // (already checked above) and the hint.
    expect(raw).not.toMatch(/hint/);
  });

  test("submitting the correct piece IDs is accepted as correct", async () => {
    const g6 = await seedGradeContent(6);
    const content = await GameContent.create({
      game_type: "MATH_FRACTION_BUILDER",
      concept_id: g6.concept._id,
      title: "Build 1/2",
      payload: {
        target: { numerator: 1, denominator: 2 },
        pieces: [{ id: "p1", numerator: 1, denominator: 2 }],
        correct_piece_ids: ["p1"],
      },
    });
    const { token } = await registerStudent(6);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id });

    const attemptRes = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedPieceIds: ["p1"] });

    expect(attemptRes.body.isCorrect).toBe(true);
  });
});

// ---------- Game answer security — remaining game types ----------
// Section 26 audit found MATH_FRACTION_BUILDER was the only game_type
// with any test coverage. These cover the other four so far
// (PHYSICS_CIRCUIT_BUILDER, BIO_ECOSYSTEM_BALANCE, BIO_VIRTUAL_LAB,
// CHEMISTRY_EQUATION_BALANCER) — same three things checked each time:
// answer key isn't leaked at startGame, a correct attempt is accepted,
// a wrong attempt is rejected.
describe("Game answer security — remaining game types", () => {
  test("PHYSICS_CIRCUIT_BUILDER: correct_mapping not leaked, right mapping accepted, wrong mapping rejected", async () => {
    const g6 = await seedGradeContent(6);
    const content = await GameContent.create({
      game_type: "PHYSICS_CIRCUIT_BUILDER",
      concept_id: g6.concept._id,
      title: "Wire the circuit",
      payload: {
        slots: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
        components: [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Battery first",
      },
    });
    const { token } = await registerStudent(6);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "PHYSICS_CIRCUIT_BUILDER", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_mapping/);
    // c1/c2/c3 are meant to be visible — they're the components the
    // student picks from to wire the circuit. What must never leak is
    // which slot each one belongs to (correct_mapping, checked above)
    // and the hint.
    expect(raw).not.toMatch(/hint/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mapping: { s1: "c2", s2: "c1", s3: "c3" } });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "PHYSICS_CIRCUIT_BUILDER", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mapping: { s1: "c1", s2: "c2", s3: "c3" } });
    expect(right.body.isCorrect).toBe(true);
  });

  test("BIO_ECOSYSTEM_BALANCE: correct_order not leaked, right order accepted, wrong order rejected", async () => {
    const g7 = await seedGradeContent(7);
    const content = await GameContent.create({
      game_type: "BIO_ECOSYSTEM_BALANCE",
      concept_id: g7.concept._id,
      title: "Predator decline chain",
      payload: {
        events: [{ id: "d1" }, { id: "d2" }, { id: "d3" }],
        correct_order: ["d2", "d1", "d3"],
      },
    });
    const { token } = await registerStudent(7);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "BIO_ECOSYSTEM_BALANCE", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_order/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orderedPieceIds: ["d1", "d2", "d3"] });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "BIO_ECOSYSTEM_BALANCE", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orderedPieceIds: ["d2", "d1", "d3"] });
    expect(right.body.isCorrect).toBe(true);
  });

  test("BIO_VIRTUAL_LAB: correct_hotspot_id not leaked, right hotspot accepted, wrong hotspot rejected", async () => {
    const g8 = await seedGradeContent(8);
    const content = await GameContent.create({
      game_type: "BIO_VIRTUAL_LAB",
      concept_id: g8.concept._id,
      title: "Find the nucleus",
      payload: {
        hotspots: [{ id: "h1" }, { id: "h2" }, { id: "h3" }],
        correct_hotspot_id: "h2",
      },
    });
    const { token } = await registerStudent(8);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "BIO_VIRTUAL_LAB", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_hotspot_id/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedHotspotId: "h1" });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "BIO_VIRTUAL_LAB", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedHotspotId: "h2" });
    expect(right.body.isCorrect).toBe(true);
  });

  test("CHEMISTRY_MOLECULE_BUILDER: correct_piece_ids not leaked, right atom tiles accepted, wrong tiles rejected", async () => {
    const g8 = await seedGradeContent(8);
    const content = await GameContent.create({
      game_type: "CHEMISTRY_MOLECULE_BUILDER",
      concept_id: g8.concept._id,
      title: "Build: Water (H2O)",
      payload: {
        target_formula: "H2O",
        target_name: "Water",
        atom_pool: [
          { id: "a1", element: "H", symbol: "H" },
          { id: "a2", element: "H", symbol: "H" },
          { id: "a3", element: "O", symbol: "O" },
          { id: "a4", element: "N", symbol: "N" },
        ],
        correct_piece_ids: ["a1", "a2", "a3"],
        hint: "Two hydrogen, one oxygen",
      },
    });
    const { token } = await registerStudent(8);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CHEMISTRY_MOLECULE_BUILDER", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_piece_ids/);
    expect(raw).not.toMatch(/hint/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedPieceIds: ["a1", "a4"] });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CHEMISTRY_MOLECULE_BUILDER", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedPieceIds: ["a3", "a1", "a2"] }); // order shouldn't matter
    expect(right.body.isCorrect).toBe(true);
  });

  test("CHEMISTRY_REACTION_LAB: correct_mapping not leaked, right mapping accepted, wrong mapping rejected", async () => {
    const g10 = await seedGradeContent(10);
    const content = await GameContent.create({
      game_type: "CHEMISTRY_REACTION_LAB",
      concept_id: g10.concept._id,
      title: "Predict the Reaction Type",
      payload: {
        scenario: "Assign the correct outcome to each beaker.",
        slots: [{ id: "s1", label: "Zn + HCl" }, { id: "s2", label: "CaCO3 heated" }],
        components: [
          { id: "c1", label: "Displacement" },
          { id: "c2", label: "Decomposition" },
          { id: "c3", label: "No reaction" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "Look for a gas being released or an element swapping places.",
      },
    });
    const { token } = await registerStudent(10);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CHEMISTRY_REACTION_LAB", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_mapping/);
    expect(raw).not.toMatch(/hint/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mapping: { s1: "c2", s2: "c1" } });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CHEMISTRY_REACTION_LAB", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mapping: { s1: "c1", s2: "c2" } });
    expect(right.body.isCorrect).toBe(true);
  });

  test("GEOGRAPHY_ROUTE_BUILDER: correct_order not leaked, right order accepted, wrong order rejected", async () => {
    const g8 = await seedGradeContent(8);
    const content = await GameContent.create({
      game_type: "GEOGRAPHY_ROUTE_BUILDER",
      concept_id: g8.concept._id,
      title: "Trace the river",
      payload: {
        journey_label: "Source to sea",
        scrambled_stops: [{ id: "r1" }, { id: "r2" }, { id: "r3" }],
        correct_order: ["r2", "r1", "r3"],
        hint: "Start at the source",
      },
    });
    const { token } = await registerStudent(8);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "GEOGRAPHY_ROUTE_BUILDER", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_order/);
    expect(raw).not.toMatch(/hint/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orderedPieceIds: ["r1", "r2", "r3"] });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "GEOGRAPHY_ROUTE_BUILDER", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orderedPieceIds: ["r2", "r1", "r3"] });
    expect(right.body.isCorrect).toBe(true);
  });

  test("ENGLISH_WORD_FORGE: correct_order not leaked, right piece order accepted, wrong order rejected", async () => {
    const g6 = await seedGradeContent(6);
    const content = await GameContent.create({
      game_type: "ENGLISH_WORD_FORGE",
      concept_id: g6.concept._id,
      title: "Forge: unhappiness",
      payload: {
        target_meaning: "the state of not being happy",
        scrambled_pieces: [{ id: "w1" }, { id: "w2" }, { id: "w3" }],
        correct_order: ["w1", "w2", "w3"],
        hint: "prefix, root, suffix",
      },
    });
    const { token } = await registerStudent(6);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "ENGLISH_WORD_FORGE", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_order/);
    expect(raw).not.toMatch(/hint/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orderedPieceIds: ["w2", "w1", "w3"] });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "ENGLISH_WORD_FORGE", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orderedPieceIds: ["w1", "w2", "w3"] });
    expect(right.body.isCorrect).toBe(true);
  });

  test("CS_DEBUGGING_LAB: correct_hotspot_id not leaked, right buggy line accepted, wrong line rejected", async () => {
    const g8 = await seedGradeContent(8);
    const content = await GameContent.create({
      game_type: "CS_DEBUGGING_LAB",
      concept_id: g8.concept._id,
      title: "Bug: Swap Two Variables",
      payload: {
        scenario_label: "Swap x and y using a temp variable",
        code_lines: [{ id: "l1" }, { id: "l2" }, { id: "l3" }],
        correct_hotspot_id: "l3",
        hint: "Does the original value still exist?",
      },
    });
    const { token } = await registerStudent(8);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CS_DEBUGGING_LAB", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_hotspot_id/);
    expect(raw).not.toMatch(/hint/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedHotspotId: "l1" });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CS_DEBUGGING_LAB", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedHotspotId: "l3" });
    expect(right.body.isCorrect).toBe(true);
  });

  test("TAMIL_PROVERB_MATCH: correct_mapping not leaked, right mapping accepted, wrong mapping rejected", async () => {
    const g7 = await seedGradeContent(7);
    const content = await GameContent.create({
      game_type: "TAMIL_PROVERB_MATCH",
      concept_id: g7.concept._id,
      title: "பழமொழி பொருத்துக — 1",
      payload: {
        scenario: "Match proverbs to meanings",
        slots: [{ id: "s1", label: "p1" }, { id: "s2", label: "p2" }],
        components: [
          { id: "c1", label: "meaning 1" },
          { id: "c2", label: "meaning 2" },
          { id: "c3", label: "decoy" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "look at the key word",
      },
    });
    const { token } = await registerStudent(7);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "TAMIL_PROVERB_MATCH", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_mapping/);
    expect(raw).not.toMatch(/hint/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mapping: { s1: "c2", s2: "c1" } });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "TAMIL_PROVERB_MATCH", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mapping: { s1: "c1", s2: "c2" } });
    expect(right.body.isCorrect).toBe(true);
  });

  test("SOCIAL_SCIENCE_CIVIC_DECISION: correct_hotspot_id not leaked, right choice accepted, wrong choice rejected", async () => {
    const g9 = await seedGradeContent(9);
    const content = await GameContent.create({
      game_type: "SOCIAL_SCIENCE_CIVIC_DECISION",
      concept_id: g9.concept._id,
      title: "Gram Sabha Budget Decision",
      payload: {
        scenario_label: "How should the Panchayat decide?",
        options: [{ id: "o1" }, { id: "o2" }, { id: "o3" }],
        correct_hotspot_id: "o2",
        hint: "Everyone affected should have a voice.",
      },
    });
    const { token } = await registerStudent(9);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "SOCIAL_SCIENCE_CIVIC_DECISION", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_hotspot_id/);
    expect(raw).not.toMatch(/hint/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedHotspotId: "o1" });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "SOCIAL_SCIENCE_CIVIC_DECISION", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedHotspotId: "o2" });
    expect(right.body.isCorrect).toBe(true);
  });

  // Chemistry has no stored answer key at all (real atom-count check
  // instead — see gameControllers.checkAttempt), so there's nothing to
  // assert isn't leaked. What matters here is that the balance check
  // itself is right: it must accept ANY valid scaling, not just one
  // "canonical" coefficient set, and must reject unbalanced attempts.
  test("CHEMISTRY_EQUATION_BALANCER: accepts any valid scaled balance, rejects an unbalanced attempt", async () => {
    const g8 = await seedGradeContent(8);
    const content = await GameContent.create({
      game_type: "CHEMISTRY_EQUATION_BALANCER",
      concept_id: g8.concept._id,
      title: "Balance: H2 + O2 -> H2O",
      payload: {
        equation_display: "H2 + O2 -> H2O",
        max_coefficient: 4,
        species: [
          { id: "h1", formula: "H2", side: "reactant", atoms: { H: 2 } },
          { id: "h2", formula: "O2", side: "reactant", atoms: { O: 2 } },
          { id: "h3", formula: "H2O", side: "product", atoms: { H: 2, O: 1 } },
        ],
      },
    });
    const { token } = await registerStudent(8);

    const start1 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CHEMISTRY_EQUATION_BALANCER", contentId: content._id });
    const unbalanced = await request(app)
      .post(`/api/games/${start1.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ coefficients: { h1: 1, h2: 1, h3: 1 } }); // H: 2 vs 2, O: 2 vs 1 — not equal
    expect(unbalanced.body.isCorrect).toBe(false);

    const start2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CHEMISTRY_EQUATION_BALANCER", contentId: content._id });
    const canonical = await request(app)
      .post(`/api/games/${start2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ coefficients: { h1: 2, h2: 1, h3: 2 } }); // 2H2 + O2 -> 2H2O
    expect(canonical.body.isCorrect).toBe(true);

    const start3 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CHEMISTRY_EQUATION_BALANCER", contentId: content._id });
    const scaled = await request(app)
      .post(`/api/games/${start3.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ coefficients: { h1: 4, h2: 2, h3: 4 } }); // same ratio, scaled up
    expect(scaled.body.isCorrect).toBe(true);
  });

  test("HISTORY_TIMELINE_BUILDER: correct_order not leaked, right sequence accepted, wrong sequence rejected", async () => {
    const g7 = await seedGradeContent(7);
    const content = await GameContent.create({
      game_type: "HISTORY_TIMELINE_BUILDER",
      concept_id: g7.concept._id,
      title: "Founding to Consolidation",
      payload: {
        era_label: "1526 – 1556",
        scrambled_events: [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
        correct_order: ["m2", "m1", "m3"],
      },
    });
    const { token } = await registerStudent(7);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "HISTORY_TIMELINE_BUILDER", contentId: content._id });

    const raw = JSON.stringify(startRes.body);
    expect(raw).not.toMatch(/correct_order/);

    const wrong = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orderedPieceIds: ["m1", "m2", "m3"] });
    expect(wrong.body.isCorrect).toBe(false);

    const startRes2 = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "HISTORY_TIMELINE_BUILDER", contentId: content._id });
    const right = await request(app)
      .post(`/api/games/${startRes2.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orderedPieceIds: ["m2", "m1", "m3"] });
    expect(right.body.isCorrect).toBe(true);
  });

  test("game content list excludes challenges from a different grade's concept", async () => {
    const g8 = await seedGradeContent(8);
    const g11 = await seedGradeContent(11);
    await GameContent.create({
      game_type: "CHEMISTRY_EQUATION_BALANCER",
      concept_id: g8.concept._id,
      title: "Grade 8 challenge",
      payload: { equation_display: "x", max_coefficient: 1, species: [] },
    });
    await GameContent.create({
      game_type: "CHEMISTRY_EQUATION_BALANCER",
      concept_id: g11.concept._id,
      title: "Grade 11 challenge",
      payload: { equation_display: "y", max_coefficient: 1, species: [] },
    });
    const { token } = await registerStudent(8);
    const res = await request(app)
      .get("/api/games/content")
      .set("Authorization", `Bearer ${token}`)
      .query({ gameType: "CHEMISTRY_EQUATION_BALANCER" });

    const titles = res.body.content.map((c) => c.title);
    expect(titles).toContain("Grade 8 challenge");
    expect(titles).not.toContain("Grade 11 challenge");
  });

  test("game content list (level-select stage) never leaks answer keys or hints, for both single-check and multi-question game types", async () => {
    const g6 = await seedGradeContent(6);
    await GameContent.create({
      game_type: "MATH_FRACTION_BUILDER",
      concept_id: g6.concept._id,
      title: "Build 1/2",
      payload: {
        target: { numerator: 1, denominator: 2 },
        pieces: [
          { id: "p1", numerator: 1, denominator: 2 },
          { id: "p2", numerator: 1, denominator: 4 },
        ],
        correct_piece_ids: ["p1"],
        hint: "It's just one piece",
      },
    });
    await GameContent.create({
      game_type: "MATH_EQUATION_SPEED_CALCULATION",
      concept_id: g6.concept._id,
      title: "Quick equations",
      payload: {
        time_limit_seconds: 60,
        hint: "top-level hint should never appear either",
        questions: [
          { equation_label: "x + 2 = 5", correct_answer: 3 },
          { equation_label: "x - 1 = 4", correct_answer: 5 },
        ],
      },
    });
    const { token } = await registerStudent(6);

    const builderRes = await request(app)
      .get("/api/games/content")
      .set("Authorization", `Bearer ${token}`)
      .query({ gameType: "MATH_FRACTION_BUILDER" });
    const builderRaw = JSON.stringify(builderRes.body);
    expect(builderRaw).not.toMatch(/correct_piece_ids/);
    expect(builderRaw).not.toMatch(/hint/);

    const speedRes = await request(app)
      .get("/api/games/content")
      .set("Authorization", `Bearer ${token}`)
      .query({ gameType: "MATH_EQUATION_SPEED_CALCULATION" });
    const speedRaw = JSON.stringify(speedRes.body);
    expect(speedRaw).not.toMatch(/correct_answer/);
    expect(speedRaw).not.toMatch(/hint/);
    // The questions themselves (prompts) must still be visible —
    // this is the puzzle content, not the secret.
    expect(speedRaw).toMatch(/x \+ 2 = 5/);
  });

  test("student cannot start Chemistry GameContent from a different grade (cross-grade IDOR)", async () => {
    const g8 = await seedGradeContent(8);
    const content = await GameContent.create({
      game_type: "CHEMISTRY_EQUATION_BALANCER",
      concept_id: g8.concept._id,
      title: "Grade 8 balancing challenge",
      payload: {
        equation_display: "N2 + H2 -> NH3",
        max_coefficient: 4,
        species: [
          { id: "n1", formula: "N2", side: "reactant", atoms: { N: 2 } },
          { id: "n2", formula: "H2", side: "reactant", atoms: { H: 2 } },
          { id: "n3", formula: "NH3", side: "product", atoms: { N: 1, H: 3 } },
        ],
      },
    });
    const { token } = await registerStudent(11); // Grade 11 student, Grade 8 content
    const res = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "CHEMISTRY_EQUATION_BALANCER", contentId: content._id });
    expect(res.status).toBe(403);
  });
});

// ---------- Quiz session integrity ----------
describe("Quiz session integrity", () => {
  test("rejects a questionId outside the session's eligible set", async () => {
    const g9 = await seedGradeContent(9);
    // A second, unrelated concept/question the session was never given.
    const otherConcept = await Concept.create({
      chapter_id: g9.chapter._id,
      title: "Other Concept",
      explanation_text: "x",
    });
    const otherQuestion = await Question.create({
      concept_id: otherConcept._id,
      question_text: "Other question",
      options: [{ id: "a", text: "A" }],
      correct_option_id: "a",
      explanation_text: "x",
    });

    const { token, userId } = await registerStudent(9);
    const UserConceptMastery = require("../../src/models/UserConceptMastery");
    await UserConceptMastery.create({
      user_id: userId,
      concept_id: g9.concept._id,
      state: "weak",
    });

    const startRes = await request(app)
      .post("/api/quiz/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionType: "weak-concept-targeted" });

    const res = await request(app)
      .post(`/api/quiz/${startRes.body.sessionId}/answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: otherQuestion._id, selectedOptionId: "a" });

    expect(res.status).toBe(403);
  });

  test("rejects answering the same question twice in one session", async () => {
    const g9 = await seedGradeContent(9);
    const { token, userId } = await registerStudent(9);
    const UserConceptMastery = require("../../src/models/UserConceptMastery");
    await UserConceptMastery.create({
      user_id: userId,
      concept_id: g9.concept._id,
      state: "weak",
    });

    const startRes = await request(app)
      .post("/api/quiz/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionType: "weak-concept-targeted" });
    const sessionId = startRes.body.sessionId;
    const questionId = startRes.body.question.id;

    const first = await request(app)
      .post(`/api/quiz/${sessionId}/answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId, selectedOptionId: "b" });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/quiz/${sessionId}/answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId, selectedOptionId: "b" });
    expect(second.status).toBe(400);
  });
});
// ---------- Grade-band distractor capping (Section 26) ----------
describe("Grade-band distractor capping", () => {
  async function seedFractionBuilder(grade, pieces, correctIds) {
    const subject = await Subject.create({ name: "Mathematics", grade });
    const chapter = await Chapter.create({ subject_id: subject._id, title: "Fractions", order_index: 1 });
    const concept = await Concept.create({
      chapter_id: chapter._id,
      title: "Equivalent Fractions",
      explanation_text: "Explanation",
    });
    const content = await GameContent.create({
      game_type: "MATH_FRACTION_BUILDER",
      concept_id: concept._id,
      title: "Build 1/2",
      payload: {
        target: { numerator: 1, denominator: 2 },
        pieces,
        correct_piece_ids: correctIds,
        hint: "hint text",
      },
    });
    return { concept, content };
  }

  const widePool = [
    { id: "p1", numerator: 1, denominator: 2 },
    { id: "p2", numerator: 1, denominator: 4 },
    { id: "p3", numerator: 1, denominator: 8 },
    { id: "p4", numerator: 1, denominator: 16 },
    { id: "p5", numerator: 1, denominator: 3 },
  ];

  test("SIMPLE band (grade 4) receives the correct piece plus at most 1 distractor", async () => {
    const { content } = await seedFractionBuilder(4, widePool, ["p1"]);
    const { token } = await registerStudent(4);
    const res = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id });

    expect(res.status).toBe(201);
    const pieces = res.body.content.payload.pieces;
    expect(pieces).toHaveLength(2); // 1 correct + maxDistractors(1)
    expect(pieces.map((p) => p.id)).toContain("p1");
  });

  test("EXPERT band (grade 12) receives the full authored pool, uncapped", async () => {
    const { content } = await seedFractionBuilder(12, widePool, ["p1"]);
    const { token } = await registerStudent(12);
    const res = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id });

    expect(res.status).toBe(201);
    expect(res.body.content.payload.pieces).toHaveLength(widePool.length);
  });

  test("the same cap applies at the game-content-list (level select) stage, not just startGame", async () => {
    await seedFractionBuilder(5, widePool, ["p1"]);
    const { token } = await registerStudent(5);
    const res = await request(app)
      .get("/api/games/content")
      .set("Authorization", `Bearer ${token}`)
      .query({ gameType: "MATH_FRACTION_BUILDER" });

    expect(res.status).toBe(200);
    expect(res.body.content[0].payload.pieces).toHaveLength(2); // SIMPLE band, 1 correct + 1 distractor
  });

  test("capping never removes a piece the student needs to select correctly, even though it isn't sent", async () => {
    const { content } = await seedFractionBuilder(4, widePool, ["p1"]);
    const { token } = await registerStudent(4);
    const startRes = await request(app)
      .post("/api/games/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameType: "MATH_FRACTION_BUILDER", contentId: content._id });

    // Submit a piece (p3) that was trimmed from the sanitized pool the
    // client received — scoring still runs against the server-stored
    // correct_piece_ids, so this must be rejected as wrong, not error.
    const attempt = await request(app)
      .post(`/api/games/${startRes.body.sessionId}/attempt`)
      .set("Authorization", `Bearer ${token}`)
      .send({ selectedPieceIds: ["p3"] });

    expect(attempt.status).toBe(200);
    expect(attempt.body.isCorrect).toBe(false);
  });
});

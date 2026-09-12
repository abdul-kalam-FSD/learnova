// Integration tests for the Teacher Platform (Priority 2): GET
// /api/teacher/students, GET /api/teacher/students/:studentId, GET
// /api/teacher/students/:studentId/mastery, GET /api/teacher/weak-areas.
//
// Same mongodb-memory-server + supertest pattern as
// tests/integration/security.test.js and gameSelection.test.js — see
// security.test.js's header note: the memory-server binary download
// is blocked in this sandbox's network allowlist, so these run on a
// real dev machine / CI, not here.
// Run with: npx jest tests/integration/teacher.test.js

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

const User = require("../../src/models/User");
const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const GameContent = require("../../src/models/GameContent");
const QuizSession = require("../../src/models/QuizzSession");
const UserConceptMastery = require("../../src/models/UserConceptMastery");
const Section = require("../../src/models/Section");

async function registerStudent(grade, name = "Test Student") {
  const email = `student-${grade}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "password123", grade });
  return { token: res.body.token, userId: res.body.user.id };
}

// register always assigns role: "student" (role can't be
// self-assigned at signup — see security.test.js's "register cannot
// self-assign a role" test) — so tests that need a teacher/admin
// register normally, then flip the role directly in the DB. The
// existing token still works afterwards: the JWT only carries
// userId (see authControllers.js's jwt.sign), and requireTeacher/
// requireAdmin both re-fetch the role fresh from the DB rather than
// trusting the token.
async function registerAs(role, grade = 6) {
  const { token, userId } = await registerStudent(grade, `Test ${role}`);
  await User.findByIdAndUpdate(userId, { role });
  return { token, userId };
}

// Direct DB creation (same pattern as registerAs flipping role
// directly, and seedGameForGrade creating curriculum docs directly)
// rather than going through the admin API — these tests exercise the
// teacher endpoints' scoping, not the admin section-management API
// itself (that's covered separately, see sections.test.js).
async function createSection(teacherId, grade, studentIds = []) {
  return Section.create({ name: `Section for ${teacherId}`, grade, teacher_id: teacherId, student_ids: studentIds });
}

async function seedGameForGrade(grade, { subjectName = "Mathematics", gameType = "MATH_FRACTION_BUILDER" } = {}) {
  const subject = await Subject.create({ name: subjectName, grade });
  const chapter = await Chapter.create({ subject_id: subject._id, title: "Test Chapter", order_index: 1 });
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

describe("teacher endpoint authorization", () => {
  test("rejects an unauthenticated request on every teacher route", async () => {
    const routes = [
      "/api/teacher/students",
      "/api/teacher/students/507f1f77bcf86cd799439011",
      "/api/teacher/students/507f1f77bcf86cd799439011/mastery",
      "/api/teacher/weak-areas",
    ];
    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    }
  });

  test("a student cannot access teacher endpoints", async () => {
    const { token } = await registerStudent(6);
    const res = await request(app).get("/api/teacher/students").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("a teacher can access teacher endpoints", async () => {
    const { token } = await registerAs("teacher");
    const res = await request(app).get("/api/teacher/students").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test("an admin can also access teacher endpoints", async () => {
    const { token } = await registerAs("admin");
    const res = await request(app).get("/api/teacher/students").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/teacher/students", () => {
  test("lists students with grade, games completed, and overall mastery", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6, "Alex");
    await createSection(teacherId, 6, [studentId]);
    const seeded = await seedGameForGrade(6);

    await UserConceptMastery.create({ user_id: studentId, concept_id: seeded.concept._id, state: "strong" });
    await QuizSession.create({
      user_id: studentId,
      session_type: "game-session",
      game_type: "MATH_FRACTION_BUILDER",
      content_id: seeded.content._id,
      completed_at: new Date(),
      xp_awarded: 10,
    });

    const res = await request(app)
      .get("/api/teacher/students")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    const alex = res.body.students.find((s) => s.id === studentId);
    expect(alex).toBeDefined();
    expect(alex.grade).toBe(6);
    expect(alex.gamesCompleted).toBe(1);
    expect(alex.overallMastery.strong).toBe(1);
  });

  test("does not include teacher or admin accounts in the student list", async () => {
    const { token: teacherToken } = await registerAs("teacher");
    const { userId: adminId } = await registerAs("admin");

    const res = await request(app)
      .get("/api/teacher/students")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students.find((s) => s.id === adminId)).toBeUndefined();
  });

  test("grade filter narrows the list", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const { userId: s6 } = await registerStudent(6, "Grade Six");
    const { userId: s9 } = await registerStudent(9, "Grade Nine");
    await createSection(teacherId, 6, [s6]);
    await createSection(teacherId, 9, [s9]);

    const res = await request(app)
      .get("/api/teacher/students?grade=9")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students.every((s) => s.grade === 9)).toBe(true);
    expect(res.body.students.some((s) => s.name === "Grade Nine")).toBe(true);
  });

  test("a teacher with no assigned sections sees no students", async () => {
    const { token: teacherToken } = await registerAs("teacher");
    await registerStudent(6, "Nobody's Student");

    const res = await request(app)
      .get("/api/teacher/students")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toEqual([]);
  });

  test("a teacher does not see a student assigned to a different teacher's section", async () => {
    const { token: teacherAToken, userId: teacherAId } = await registerAs("teacher");
    const { userId: teacherBId } = await registerAs("teacher");
    const { userId: otherStudentId } = await registerStudent(6, "Belongs To B");
    await createSection(teacherBId, 6, [otherStudentId]);
    await createSection(teacherAId, 6, []);

    const res = await request(app)
      .get("/api/teacher/students")
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students.find((s) => s.id === otherStudentId)).toBeUndefined();
  });

  test("an admin still sees every student, unscoped", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: studentId } = await registerStudent(6, "Unassigned Student");

    const res = await request(app)
      .get("/api/teacher/students")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students.find((s) => s.id === studentId)).toBeDefined();
  });
});

describe("GET /api/teacher/students/:studentId", () => {
  test("returns subject/chapter/concept mastery tree, games played, and recent performance", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6, "Riya");
    await createSection(teacherId, 6, [studentId]);
    const seeded = await seedGameForGrade(6, { subjectName: "Physics", gameType: "PHYSICS_CIRCUIT_BUILDER" });

    await UserConceptMastery.create({ user_id: studentId, concept_id: seeded.concept._id, state: "learning" });
    await QuizSession.create({
      user_id: studentId,
      session_type: "game-session",
      game_type: "PHYSICS_CIRCUIT_BUILDER",
      content_id: seeded.content._id,
      completed_at: new Date(),
      xp_awarded: 15,
    });

    const res = await request(app)
      .get(`/api/teacher/students/${studentId}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Riya");
    const physics = res.body.subjects.find((s) => s.name === "Physics");
    expect(physics).toBeDefined();
    const concept = physics.chapters[0].concepts[0];
    expect(concept.mastery_state).toBe("learning");
    expect(res.body.gamesPlayed.length).toBe(1);
    expect(res.body.gamesPlayed[0].gameType).toBe("PHYSICS_CIRCUIT_BUILDER");
  });

  test("404s for a student id that doesn't exist", async () => {
    const { token: teacherToken } = await registerAs("teacher");
    const res = await request(app)
      .get("/api/teacher/students/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${teacherToken}`);
    expect(res.status).toBe(404);
  });

  test("400s for a malformed student id", async () => {
    const { token: teacherToken } = await registerAs("teacher");
    const res = await request(app)
      .get("/api/teacher/students/not-a-valid-id")
      .set("Authorization", `Bearer ${teacherToken}`);
    expect(res.status).toBe(400);
  });

  test("never leaks password_hash or any answer-key field for the student's games", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6, "Priv Test");
    await createSection(teacherId, 6, [studentId]);
    const seeded = await seedGameForGrade(6);
    await QuizSession.create({
      user_id: studentId,
      session_type: "game-session",
      game_type: "MATH_FRACTION_BUILDER",
      content_id: seeded.content._id,
      completed_at: new Date(),
      xp_awarded: 10,
    });

    const res = await request(app)
      .get(`/api/teacher/students/${studentId}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/password_hash/i);
    expect(raw).not.toMatch(/correct_piece_ids/i);
    expect(raw).not.toMatch(/correct_option_id/i);
  });

  test("404s for a real student who isn't in any of this teacher's sections (IDOR)", async () => {
    const { token: teacherAToken } = await registerAs("teacher");
    const { userId: teacherBId } = await registerAs("teacher");
    const { userId: otherStudentId } = await registerStudent(6, "Not Yours");
    await createSection(teacherBId, 6, [otherStudentId]);

    const res = await request(app)
      .get(`/api/teacher/students/${otherStudentId}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(404);
  });

  test("an admin can view a student's detail regardless of section assignment", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: studentId } = await registerStudent(6, "Any Student");

    const res = await request(app)
      .get(`/api/teacher/students/${studentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Any Student");
  });
});

describe("GET /api/teacher/students/:studentId/mastery", () => {
  test("returns the overall mastery summary plus the full subject tree", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6, "Sam");
    await createSection(teacherId, 6, [studentId]);
    const seeded = await seedGameForGrade(6);
    await UserConceptMastery.create({ user_id: studentId, concept_id: seeded.concept._id, state: "strong" });

    const res = await request(app)
      .get(`/api/teacher/students/${studentId}/mastery`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.overallMastery.strong).toBe(1);
    expect(res.body.overallMastery.totalConcepts).toBe(1);
    expect(res.body.subjects[0].chapters[0].concepts[0].mastery_state).toBe("strong");
  });

  test("404s for a student outside this teacher's sections (IDOR)", async () => {
    const { token: teacherAToken } = await registerAs("teacher");
    const { userId: teacherBId } = await registerAs("teacher");
    const { userId: otherStudentId } = await registerStudent(6, "Not Yours Either");
    await createSection(teacherBId, 6, [otherStudentId]);

    const res = await request(app)
      .get(`/api/teacher/students/${otherStudentId}/mastery`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(404);
  });
});

describe("GET /api/teacher/weak-areas", () => {
  test("aggregates mastery by concept across students and classifies status", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const seeded = await seedGameForGrade(6, { subjectName: "Chemistry", gameType: "CHEMISTRY_EQUATION_BALANCER" });
    const { userId: s1 } = await registerStudent(6, "S1");
    const { userId: s2 } = await registerStudent(6, "S2");
    const { userId: s3 } = await registerStudent(6, "S3");
    await createSection(teacherId, 6, [s1, s2, s3]);

    // 2/3 weak -> should classify as "needs-attention" (>= 50% weak)
    await UserConceptMastery.create({ user_id: s1, concept_id: seeded.concept._id, state: "weak" });
    await UserConceptMastery.create({ user_id: s2, concept_id: seeded.concept._id, state: "weak" });
    await UserConceptMastery.create({ user_id: s3, concept_id: seeded.concept._id, state: "strong" });

    const res = await request(app)
      .get("/api/teacher/weak-areas")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    const area = res.body.weakAreas.find((a) => a.conceptId === seeded.concept._id.toString());
    expect(area).toBeDefined();
    expect(area.weak).toBe(2);
    expect(area.strong).toBe(1);
    expect(area.totalStudents).toBe(3);
    expect(area.status).toBe("needs-attention");
  });

  test("grade filter only returns concepts from that grade", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const grade6 = await seedGameForGrade(6, { subjectName: "Mathematics", gameType: "MATH_FRACTION_BUILDER" });
    const grade9 = await seedGameForGrade(9, { subjectName: "Mathematics", gameType: "MATH_EQUATION_BUILDER" });
    const { userId: s1 } = await registerStudent(6, "G6");
    const { userId: s2 } = await registerStudent(9, "G9");
    await createSection(teacherId, 6, [s1]);
    await createSection(teacherId, 9, [s2]);

    await UserConceptMastery.create({ user_id: s1, concept_id: grade6.concept._id, state: "weak" });
    await UserConceptMastery.create({ user_id: s2, concept_id: grade9.concept._id, state: "weak" });

    const res = await request(app)
      .get("/api/teacher/weak-areas?grade=6")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.weakAreas.every((a) => a.grade === 6)).toBe(true);
    expect(res.body.weakAreas.some((a) => a.conceptId === grade9.concept._id.toString())).toBe(false);
  });

  test("a concept nobody has attempted yet is never included (no fake data)", async () => {
    const { token: teacherToken } = await registerAs("teacher");
    await seedGameForGrade(6); // no UserConceptMastery rows created

    const res = await request(app)
      .get("/api/teacher/weak-areas")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.weakAreas).toEqual([]);
  });

  test("only aggregates the requesting teacher's own students, not another teacher's", async () => {
    const { token: teacherAToken, userId: teacherAId } = await registerAs("teacher");
    const { userId: teacherBId } = await registerAs("teacher");
    const seeded = await seedGameForGrade(6, { subjectName: "Biology", gameType: "BIO_VIRTUAL_LAB" });
    const { userId: ownStudent } = await registerStudent(6, "Mine");
    const { userId: otherStudent } = await registerStudent(6, "Not Mine");
    await createSection(teacherAId, 6, [ownStudent]);
    await createSection(teacherBId, 6, [otherStudent]);

    await UserConceptMastery.create({ user_id: ownStudent, concept_id: seeded.concept._id, state: "weak" });
    await UserConceptMastery.create({ user_id: otherStudent, concept_id: seeded.concept._id, state: "strong" });

    const res = await request(app)
      .get("/api/teacher/weak-areas")
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    const area = res.body.weakAreas.find((a) => a.conceptId === seeded.concept._id.toString());
    expect(area).toBeDefined();
    // Only teacher A's own student's "weak" mastery counted — teacher
    // B's "strong" student must not appear in this total.
    expect(area.totalStudents).toBe(1);
    expect(area.weak).toBe(1);
    expect(area.strong).toBe(0);
  });
});

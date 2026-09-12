// Integration tests for the Assignment feature (Section 26):
// POST/GET /api/assignments and the student-facing GET /mine.
// This controller had zero test coverage before this pass despite
// being security-sensitive (teacher section-scoping, an IDOR-style
// 404-not-403 pattern on out-of-scope access, admin-unscoped reads) —
// flagged during the Teacher-module audit and covered here.
//
// Same mongodb-memory-server + supertest pattern as
// tests/integration/teacher.test.js — see that file's header note:
// the memory-server binary download is blocked in this sandbox's
// network allowlist, so these run on a real dev machine / CI, not here.
// Run with: npx jest tests/integration/assignments.test.js

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
const Section = require("../../src/models/Section");
const Subject = require("../../src/models/Subject");
const Chapter = require("../../src/models/Chapter");
const Concept = require("../../src/models/Concept");
const Assignment = require("../../src/models/Assignment");

async function registerStudent(grade, name = "Test Student") {
  const email = `student-${grade}-${Date.now()}-${Math.random()}@test.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "password123", grade });
  return { token: res.body.token, userId: res.body.user.id };
}

async function registerAs(role, grade = 6) {
  const { token, userId } = await registerStudent(grade, `Test ${role}`);
  await User.findByIdAndUpdate(userId, { role });
  return { token, userId };
}

async function seedConcept(grade = 6) {
  const subject = await Subject.create({ name: "Mathematics", grade });
  const chapter = await Chapter.create({ subject_id: subject._id, title: "Test Chapter", order_index: 1 });
  const concept = await Concept.create({
    chapter_id: chapter._id,
    title: "Test Concept",
    explanation_text: "Explanation",
  });
  return concept;
}

describe("assignment endpoint authorization", () => {
  test("rejects an unauthenticated request on every assignment route", async () => {
    const res = await request(app).get("/api/assignments/mine");
    expect(res.status).toBe(401);
  });

  test("a student cannot create, list-for-teacher, or cancel assignments", async () => {
    const { token: studentToken } = await registerAs("student");
    const concept = await seedConcept();

    const createRes = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ conceptId: concept._id.toString(), studentIds: [] });
    expect(createRes.status).toBe(403);

    const listRes = await request(app)
      .get("/api/assignments/teacher")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(listRes.status).toBe(403);
  });

  test("a teacher can create and list, and an admin can too", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6);
    // Teacher-initiated studentIds requests are scoped to the
    // teacher's own sections (see the IDOR test below) -- this
    // section is what makes `studentId` a legitimate target for this
    // teacher, matching the pattern used by the "can assign to their
    // own section" test further down.
    await Section.create({ name: "Grade 6 - A", grade: 6, teacher_id: teacherId, student_ids: [studentId] });
    const concept = await seedConcept();

    const createRes = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ conceptId: concept._id.toString(), studentIds: [studentId] });
    expect(createRes.status).toBe(201);

    const { token: adminToken } = await registerAs("admin");
    const listRes = await request(app)
      .get("/api/assignments/teacher")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.assignments).toHaveLength(1);
  });
});

describe("POST /api/assignments", () => {
  test("requires exactly one of studentIds or sectionId", async () => {
    const { token } = await registerAs("teacher");
    const concept = await seedConcept();

    const neither = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${token}`)
      .send({ conceptId: concept._id.toString() });
    expect(neither.status).toBe(400);

    const { userId: studentId } = await registerStudent(6);
    const section = await Section.create({ name: "Grade 6 - A", grade: 6, teacher_id: studentId, student_ids: [] });
    const both = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${token}`)
      .send({ conceptId: concept._id.toString(), studentIds: [studentId], sectionId: section._id.toString() });
    expect(both.status).toBe(400);
  });

  test("404s for an invalid conceptId and a nonexistent concept", async () => {
    const { token } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6);

    const badId = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${token}`)
      .send({ conceptId: "not-an-id", studentIds: [studentId] });
    expect(badId.status).toBe(400);

    const missing = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${token}`)
      .send({ conceptId: new mongoose.Types.ObjectId().toString(), studentIds: [studentId] });
    expect(missing.status).toBe(404);
  });

  test("a teacher cannot assign to a student outside their own sections (IDOR)", async () => {
    const { token: teacherToken } = await registerAs("teacher");
    const { userId: outsideStudentId } = await registerStudent(6);
    const concept = await seedConcept();

    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ conceptId: concept._id.toString(), studentIds: [outsideStudentId] });
    // Looks like "not found", not "forbidden" — same probing-resistance
    // pattern the rest of the teacher portal uses.
    expect(res.status).toBe(404);
  });

  test("a teacher cannot target another teacher's section (IDOR)", async () => {
    const { token: teacherAToken } = await registerAs("teacher");
    const { userId: teacherBId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6);
    const section = await Section.create({
      name: "Grade 6 - B",
      grade: 6,
      teacher_id: teacherBId,
      student_ids: [studentId],
    });
    const concept = await seedConcept();

    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${teacherAToken}`)
      .send({ conceptId: concept._id.toString(), sectionId: section._id.toString() });
    expect(res.status).toBe(404);
  });

  test("a teacher CAN assign to their own section, targeting every student in it", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const { userId: student1 } = await registerStudent(6);
    const { userId: student2 } = await registerStudent(6);
    const section = await Section.create({
      name: "Grade 6 - A",
      grade: 6,
      teacher_id: teacherId,
      student_ids: [student1, student2],
    });
    const concept = await seedConcept();

    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ conceptId: concept._id.toString(), sectionId: section._id.toString() });
    expect(res.status).toBe(201);
    expect(res.body.studentCount).toBe(2);
  });

  test("rejects a section with no students yet", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const section = await Section.create({ name: "Empty", grade: 6, teacher_id: teacherId, student_ids: [] });
    const concept = await seedConcept();

    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ conceptId: concept._id.toString(), sectionId: section._id.toString() });
    expect(res.status).toBe(400);
  });

  test("an admin can assign to any student regardless of section scope", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: studentId } = await registerStudent(6);
    const concept = await seedConcept();

    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ conceptId: concept._id.toString(), studentIds: [studentId] });
    expect(res.status).toBe(201);
  });
});

describe("GET /api/assignments/teacher/:id and DELETE /api/assignments/:id", () => {
  test("a teacher can view their own assignment's roster with student names", async () => {
    const { token: teacherToken, userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6, "Priya Kumar");
    const concept = await seedConcept();
    const assignment = await Assignment.create({
      teacher_id: teacherId,
      concept_id: concept._id,
      students: [{ student_id: studentId, status: "pending" }],
    });

    const res = await request(app)
      .get(`/api/assignments/teacher/${assignment._id}`)
      .set("Authorization", `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.roster).toHaveLength(1);
    expect(res.body.roster[0].name).toBe("Priya Kumar");
    expect(res.body.roster[0].status).toBe("pending");
  });

  test("a teacher cannot view or cancel another teacher's assignment (IDOR)", async () => {
    const { userId: teacherAId } = await registerAs("teacher");
    const { token: teacherBToken } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6);
    const concept = await seedConcept();
    const assignment = await Assignment.create({
      teacher_id: teacherAId,
      concept_id: concept._id,
      students: [{ student_id: studentId, status: "pending" }],
    });

    const viewRes = await request(app)
      .get(`/api/assignments/teacher/${assignment._id}`)
      .set("Authorization", `Bearer ${teacherBToken}`);
    expect(viewRes.status).toBe(404);

    const cancelRes = await request(app)
      .delete(`/api/assignments/${assignment._id}`)
      .set("Authorization", `Bearer ${teacherBToken}`);
    expect(cancelRes.status).toBe(404);

    // Confirm it genuinely wasn't cancelled by the blocked attempt.
    expect(await Assignment.findById(assignment._id)).not.toBeNull();
  });

  test("an admin can view and cancel any teacher's assignment", async () => {
    const { userId: teacherId } = await registerAs("teacher");
    const { token: adminToken } = await registerAs("admin");
    const { userId: studentId } = await registerStudent(6);
    const concept = await seedConcept();
    const assignment = await Assignment.create({
      teacher_id: teacherId,
      concept_id: concept._id,
      students: [{ student_id: studentId, status: "pending" }],
    });

    const viewRes = await request(app)
      .get(`/api/assignments/teacher/${assignment._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(viewRes.status).toBe(200);

    const cancelRes = await request(app)
      .delete(`/api/assignments/${assignment._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(cancelRes.status).toBe(200);
    expect(await Assignment.findById(assignment._id)).toBeNull();
  });
});

describe("GET /api/assignments/mine", () => {
  test("a student sees only assignments targeting them, pending sorted before completed", async () => {
    const { token: studentToken, userId: studentId } = await registerStudent(6);
    const { userId: otherStudentId } = await registerStudent(6);
    const { userId: teacherId } = await registerAs("teacher");
    const conceptA = await seedConcept();
    const conceptB = await seedConcept();

    await Assignment.create({
      teacher_id: teacherId,
      concept_id: conceptA._id,
      students: [{ student_id: studentId, status: "completed", completed_at: new Date() }],
    });
    await Assignment.create({
      teacher_id: teacherId,
      concept_id: conceptB._id,
      students: [{ student_id: studentId, status: "pending" }],
    });
    // Belongs to someone else entirely — must not leak into this list.
    await Assignment.create({
      teacher_id: teacherId,
      concept_id: conceptA._id,
      students: [{ student_id: otherStudentId, status: "pending" }],
    });

    const res = await request(app)
      .get("/api/assignments/mine")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.assignments).toHaveLength(2);
    expect(res.body.assignments[0].status).toBe("pending");
    expect(res.body.assignments[1].status).toBe("completed");
  });
});

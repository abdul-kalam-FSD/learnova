// Integration tests for admin Section (class/section) management:
// POST/GET/PATCH/DELETE /api/admin/sections, and student roster
// add/remove. Same mongodb-memory-server + supertest pattern as
// tests/integration/teacher.test.js — see that file's header note:
// the memory-server binary download is blocked in this sandbox's
// network allowlist, so these run on a real dev machine / CI, not here.
// Run with: npx jest tests/integration/sections.test.js

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

describe("admin section endpoint authorization", () => {
  test("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/admin/sections");
    expect(res.status).toBe(401);
  });

  test("a teacher cannot manage sections (admin-only)", async () => {
    const { token } = await registerAs("teacher");
    const res = await request(app).get("/api/admin/sections").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("an admin can manage sections", async () => {
    const { token } = await registerAs("admin");
    const res = await request(app).get("/api/admin/sections").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/sections", () => {
  test("creates a section for a valid teacher", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: teacherId } = await registerAs("teacher");

    const res = await request(app)
      .post("/api/admin/sections")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Grade 6 - A", grade: 6, teacher_id: teacherId });

    expect(res.status).toBe(201);
    expect(res.body.section.name).toBe("Grade 6 - A");
    expect(res.body.section.grade).toBe(6);
    expect(res.body.section.student_ids).toEqual([]);
  });

  test("rejects a teacher_id that isn't an actual teacher", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: studentId } = await registerStudent(6);

    const res = await request(app)
      .post("/api/admin/sections")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bad Section", grade: 6, teacher_id: studentId });

    expect(res.status).toBe(400);
  });

  test("requires name, grade, and teacher_id", async () => {
    const { token: adminToken } = await registerAs("admin");
    const res = await request(app)
      .post("/api/admin/sections")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Missing Fields" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/sections/:id/students", () => {
  test("adds a same-grade student to a section", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6, "Enrollee");
    const section = await Section.create({ name: "G6-A", grade: 6, teacher_id: teacherId, student_ids: [] });

    const res = await request(app)
      .post(`/api/admin/sections/${section._id}/students`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ studentId });

    expect(res.status).toBe(200);
    const ids = res.body.section.student_ids.map((s) => (s.id || s._id).toString());
    expect(ids).toContain(studentId);
  });

  test("rejects a student whose grade doesn't match the section's grade", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(9, "Wrong Grade");
    const section = await Section.create({ name: "G6-A", grade: 6, teacher_id: teacherId, student_ids: [] });

    const res = await request(app)
      .post(`/api/admin/sections/${section._id}/students`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ studentId });

    expect(res.status).toBe(400);
  });

  test("rejects adding a student already in a different section", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6, "Already Placed");
    const sectionA = await Section.create({ name: "G6-A", grade: 6, teacher_id: teacherId, student_ids: [studentId] });
    const sectionB = await Section.create({ name: "G6-B", grade: 6, teacher_id: teacherId, student_ids: [] });

    const res = await request(app)
      .post(`/api/admin/sections/${sectionB._id}/students`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ studentId });

    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/admin/sections/:id/students/:studentId", () => {
  test("removes a student from a section", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: teacherId } = await registerAs("teacher");
    const { userId: studentId } = await registerStudent(6, "Leaving");
    const section = await Section.create({ name: "G6-A", grade: 6, teacher_id: teacherId, student_ids: [studentId] });

    const res = await request(app)
      .delete(`/api/admin/sections/${section._id}/students/${studentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.section.student_ids).toEqual([]);
  });
});

describe("DELETE /api/admin/sections/:id", () => {
  test("deletes a section", async () => {
    const { token: adminToken } = await registerAs("admin");
    const { userId: teacherId } = await registerAs("teacher");
    const section = await Section.create({ name: "To Delete", grade: 6, teacher_id: teacherId, student_ids: [] });

    const res = await request(app)
      .delete(`/api/admin/sections/${section._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const found = await Section.findById(section._id);
    expect(found).toBeNull();
  });
});

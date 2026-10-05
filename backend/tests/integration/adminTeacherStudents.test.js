// Integration tests for the Admin "Manage Staff" teacher -> student
// overview:
//   GET /api/admin/users            (teacher rows carry studentCount)
//   GET /api/admin/teachers/:id/students
//
// The count and the roster both derive from Section.teacher_id +
// Section.student_ids (the same relationship the teacher dashboard
// scopes on) — nothing is hardcoded. Same mongodb-memory-server +
// supertest pattern as sections.test.js; the memory-server binary
// download is blocked in the Claude sandbox, so run on a dev machine/CI:
//   npx jest tests/integration/adminTeacherStudents.test.js

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

let counter = 0;
async function makeUser(role, extra = {}) {
  counter += 1;
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      name: extra.name || `Test ${role} ${counter}`,
      email: `${role}-${counter}-${Date.now()}@test.com`,
      password: "password123",
      grade: 6,
    });
  const userId = res.body.user.id;
  const update = { role, ...(extra.update || {}) };
  await User.findByIdAndUpdate(userId, update);
  return { token: res.body.token, userId };
}

async function makeStudents(n, grade = 6) {
  const ids = [];
  for (let i = 0; i < n; i += 1) {
    const { userId } = await makeUser("student", { update: { grade } });
    ids.push(userId);
  }
  return ids;
}

describe("admin teacher overview — authorization", () => {
  test("rejects unauthenticated requests", async () => {
    const res = await request(app).get(
      `/api/admin/teachers/${new mongoose.Types.ObjectId()}/students`,
    );
    expect(res.status).toBe(401);
  });

  test("a teacher cannot read another teacher's roster via the admin route", async () => {
    const t1 = await makeUser("teacher");
    const t2 = await makeUser("teacher");
    const res = await request(app)
      .get(`/api/admin/teachers/${t2.userId}/students`)
      .set("Authorization", `Bearer ${t1.token}`);
    expect(res.status).toBe(403);
  });

  test("a student gets 403 on the roster route and on the user list", async () => {
    const s = await makeUser("student");
    const t = await makeUser("teacher");
    const roster = await request(app)
      .get(`/api/admin/teachers/${t.userId}/students`)
      .set("Authorization", `Bearer ${s.token}`);
    const list = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${s.token}`);
    expect(roster.status).toBe(403);
    expect(list.status).toBe(403);
  });
});

describe("GET /api/admin/users — studentCount", () => {
  test("teacher rows carry the real count from sections; other roles omit it", async () => {
    const admin = await makeUser("admin");
    const adhil = await makeUser("teacher", { name: "Adhil" });
    const priya = await makeUser("teacher", { name: "Priya" });
    const kumar = await makeUser("teacher", { name: "Kumar" });

    const adhilStudents = await makeStudents(3);
    const priyaStudents = await makeStudents(2);
    const spread = await makeStudents(2, 7);

    // Adhil: one section of 3 + a second section of 2 (5 total)
    await Section.create({ name: "6-A", grade: 6, teacher_id: adhil.userId, student_ids: adhilStudents });
    await Section.create({ name: "7-A", grade: 7, teacher_id: adhil.userId, student_ids: spread });
    await Section.create({ name: "6-B", grade: 6, teacher_id: priya.userId, student_ids: priyaStudents });
    // Kumar has no section at all

    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);

    const byName = Object.fromEntries(res.body.users.map((u) => [u.name, u]));
    expect(byName.Adhil.studentCount).toBe(5);
    expect(byName.Priya.studentCount).toBe(2);
    expect(byName.Kumar.studentCount).toBe(0);
    expect(byName.Kumar).toBeDefined(); // zero-student teacher is NOT hidden
    const student = res.body.users.find((u) => u.role === "student");
    expect(student).toBeDefined();
    expect(student).not.toHaveProperty("studentCount");
  });

  test("count ignores deleted users, guests and non-students in student_ids", async () => {
    const admin = await makeUser("admin");
    const teacher = await makeUser("teacher", { name: "Adhil" });
    const real = await makeStudents(2);
    const guest = await makeUser("student", { update: { is_guest: true } });
    const notAStudent = await makeUser("admin");
    const ghost = new mongoose.Types.ObjectId();

    await Section.create({
      name: "6-A",
      grade: 6,
      teacher_id: teacher.userId,
      student_ids: [...real, guest.userId, notAStudent.userId, ghost],
    });

    const res = await request(app)
      .get("/api/admin/users?role=teacher")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.body.users.find((u) => u.name === "Adhil").studentCount).toBe(2);
  });

  test("a pending teacher still appears, with status pending and 0 students; approval keeps the count live", async () => {
    const admin = await makeUser("admin");
    const reg = await request(app).post("/api/auth/register").send({
      name: "Newbie",
      email: "newbie@test.com",
      password: "password123",
      role: "teacher",
    });
    const teacherId = reg.body.user.id;

    let res = await request(app)
      .get("/api/admin/users?role=teacher")
      .set("Authorization", `Bearer ${admin.token}`);
    let row = res.body.users.find((u) => u.id === teacherId);
    expect(row.status).toBe("pending");
    expect(row.studentCount).toBe(0);

    // Existing approval flow, unchanged
    const approve = await request(app)
      .patch(`/api/admin/users/${teacherId}/role`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ role: "teacher" });
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe("active");

    const students = await makeStudents(4);
    await Section.create({ name: "6-A", grade: 6, teacher_id: teacherId, student_ids: students });

    res = await request(app)
      .get("/api/admin/users?role=teacher")
      .set("Authorization", `Bearer ${admin.token}`);
    row = res.body.users.find((u) => u.id === teacherId);
    expect(row.status).toBe("active");
    expect(row.studentCount).toBe(4);
  });
});

describe("GET /api/admin/users — status filter (Pending Teachers count)", () => {
  test("status=pending narrows to pending teachers; bogus/object status values are ignored", async () => {
    const admin = await makeUser("admin");
    await makeUser("teacher", { name: "Active One" });
    await request(app).post("/api/auth/register").send({
      name: "Pending One",
      email: "pending-one@test.com",
      password: "password123",
      role: "teacher",
    });
    const auth = { Authorization: `Bearer ${admin.token}` };

    const pending = await request(app).get("/api/admin/users?role=teacher&status=pending").set(auth);
    expect(pending.body.total).toBe(1);
    expect(pending.body.users[0].name).toBe("Pending One");

    const bogus = await request(app).get("/api/admin/users?role=teacher&status=bogus").set(auth);
    const obj = await request(app).get("/api/admin/users?role=teacher&status[$ne]=active").set(auth);
    expect(bogus.body.total).toBe(2);
    expect(obj.body.total).toBe(2);
  });
});

describe("GET /api/admin/teachers/:id/students", () => {
  test("returns the actual assigned students; total equals the table count", async () => {
    const admin = await makeUser("admin");
    const adhil = await makeUser("teacher", { name: "Adhil" });
    const priya = await makeUser("teacher", { name: "Priya" });
    const mine = await makeStudents(3);
    const others = await makeStudents(2);
    await User.findByIdAndUpdate(mine[0], { name: "Asha", xp_total: 120, streak_count: 4 });
    await Section.create({ name: "6-A", grade: 6, teacher_id: adhil.userId, student_ids: mine });
    await Section.create({ name: "6-B", grade: 6, teacher_id: priya.userId, student_ids: others });

    const res = await request(app)
      .get(`/api/admin/teachers/${adhil.userId}/students`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.teacher.name).toBe("Adhil");
    expect(res.body.total).toBe(3);
    expect(res.body.students).toHaveLength(3);
    expect(res.body.students.map((s) => s.id).sort()).toEqual([...mine].sort());
    // Priya's students never leak into Adhil's roster
    for (const id of others) {
      expect(res.body.students.map((s) => s.id)).not.toContain(id);
    }
    const asha = res.body.students.find((s) => s.name === "Asha");
    expect(asha).toMatchObject({ grade: 6, xpTotal: 120, streakCount: 4 });
    expect(asha.section.name).toBe("6-A");

    const list = await request(app)
      .get("/api/admin/users?role=teacher")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.users.find((u) => u.name === "Adhil").studentCount).toBe(res.body.total);
  });

  test("a teacher with no students returns total 0 and an empty list (not 404)", async () => {
    const admin = await makeUser("admin");
    const teacher = await makeUser("teacher");
    const res = await request(app)
      .get(`/api/admin/teachers/${teacher.userId}/students`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.students).toEqual([]);
  });

  test("404 for a non-teacher id or unknown id; 400 for a malformed id", async () => {
    const admin = await makeUser("admin");
    const student = await makeUser("student");
    const auth = { Authorization: `Bearer ${admin.token}` };

    const notTeacher = await request(app)
      .get(`/api/admin/teachers/${student.userId}/students`)
      .set(auth);
    const unknown = await request(app)
      .get(`/api/admin/teachers/${new mongoose.Types.ObjectId()}/students`)
      .set(auth);
    const malformed = await request(app).get("/api/admin/teachers/not-an-id/students").set(auth);

    expect(notTeacher.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(malformed.status).toBe(400);
  });
});

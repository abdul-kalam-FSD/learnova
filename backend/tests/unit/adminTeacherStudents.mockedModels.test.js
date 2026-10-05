// Admin teacher -> student overview, MOCKED persistence.
//
// Drives the REAL admin router (protect + requireAdmin) and the REAL
// listUsers / getTeacherStudents controllers over HTTP with supertest.
// User and Section are small in-memory fakes, and Section.aggregate is a
// fake that applies the same "real, distinct students only" rule the
// production pipeline expresses — so this proves RBAC, response shape,
// zero-student handling and that count/list derive from the same data.
// It does NOT prove the real MongoDB $lookup/$group behaviour; that's
// covered by tests/integration/adminTeacherStudents.test.js (needs
// mongodb-memory-server).

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../../src/models/User");
jest.mock("../../src/models/Section");

const User = require("../../src/models/User");
const Section = require("../../src/models/Section");

process.env.JWT_SECRET = "test-secret";
const adminRoutes = require("../../src/routes/adminroutes");
const { notFound, globalErrorHandler } = require("../../src/middleware/errorHandler");

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(globalErrorHandler);

const oid = (n) => n.toString(16).padStart(24, "0");
const auth = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` });

const ADMIN = oid(1);
const STUDENT_USER = oid(2);
const ADHIL = oid(10);
const PRIYA = oid(11);
const KUMAR = oid(12);
const PENDING = oid(13);

let users;
let sections;

// Chainable, awaitable query fake (select/sort/skip/limit are no-ops
// except where the controller's result depends on them).
const query = (result) => {
  const q = {
    select: () => q,
    sort: () => q,
    skip: () => q,
    limit: () => q,
    then: (res, rej) => Promise.resolve(result).then(res, rej),
  };
  return q;
};

const matchesFilter = (doc, filter = {}) =>
  Object.entries(filter).every(([k, v]) => {
    if (k === "$or") return true;
    if (k === "_id" && v && v.$in) return v.$in.map(String).includes(String(doc._id));
    if (v && typeof v === "object" && "$ne" in v) return doc[k] !== v.$ne;
    return String(doc[k]) === String(v);
  });

const isRealStudent = (u) => u && u.role === "student" && u.is_guest !== true;

beforeEach(() => {
  jest.clearAllMocks();
  users = [
    { _id: ADMIN, name: "Admin", email: "a@x.com", role: "admin", status: "active" },
    { _id: STUDENT_USER, name: "Plain Student", email: "p@x.com", role: "student", status: "active", grade: 6 },
    { _id: ADHIL, name: "Adhil", email: "adhil@x.com", role: "teacher", status: "active" },
    { _id: PRIYA, name: "Priya", email: "priya@x.com", role: "teacher", status: "active" },
    { _id: KUMAR, name: "Kumar", email: "kumar@x.com", role: "teacher", status: "active" },
    { _id: PENDING, name: "Newbie", email: "n@x.com", role: "teacher", status: "pending" },
    // 3 real students for Adhil, 2 for Priya
    ...[20, 21, 22].map((n) => ({ _id: oid(n), name: `Adhil S${n}`, email: `s${n}@x.com`, role: "student", grade: 6, xp_total: n, streak_count: 1 })),
    ...[30, 31].map((n) => ({ _id: oid(n), name: `Priya S${n}`, email: `s${n}@x.com`, role: "student", grade: 7, xp_total: n, streak_count: 2 })),
    { _id: oid(40), name: "Guest", role: "student", is_guest: true },
  ];
  sections = [
    { _id: oid(100), name: "6-A", grade: 6, teacher_id: ADHIL, student_ids: [oid(20), oid(21), oid(22), oid(40), oid(999), ADMIN] },
    { _id: oid(101), name: "7-A", grade: 7, teacher_id: PRIYA, student_ids: [oid(30), oid(31)] },
  ];

  User.findById.mockImplementation((id) => query(users.find((u) => String(u._id) === String(id)) || null));
  User.findOne.mockImplementation((f) => query(users.find((u) => matchesFilter(u, f)) || null));
  User.find.mockImplementation((f) => query(users.filter((u) => matchesFilter(u, f))));
  User.countDocuments.mockImplementation(async (f) => users.filter((u) => matchesFilter(u, f)).length);
  User.collection = { name: "users" };

  Section.find.mockImplementation((f) => query(sections.filter((s) => String(s.teacher_id) === String(f.teacher_id))));
  Section.aggregate.mockImplementation(async (pipeline) => {
    const ids = pipeline[0].$match.teacher_id.$in.map(String);
    const counts = {};
    for (const sec of sections.filter((s) => ids.includes(String(s.teacher_id)))) {
      const seen = new Set(counts[sec.teacher_id]?.seen || []);
      for (const sid of sec.student_ids) {
        if (isRealStudent(users.find((u) => String(u._id) === String(sid)))) seen.add(String(sid));
      }
      counts[sec.teacher_id] = { seen };
    }
    return Object.entries(counts).map(([t, v]) => ({ _id: t, count: v.seen.size }));
  });
});

describe("admin teacher overview — authorization (real requireAdmin)", () => {
  test("401 without a token", async () => {
    const res = await request(app).get(`/api/admin/teachers/${ADHIL}/students`);
    expect(res.status).toBe(401);
  });

  test("403 for a student and for a teacher on both endpoints", async () => {
    for (const who of [STUDENT_USER, ADHIL]) {
      const roster = await request(app).get(`/api/admin/teachers/${PRIYA}/students`).set(auth(who));
      const list = await request(app).get("/api/admin/users").set(auth(who));
      expect(roster.status).toBe(403);
      expect(list.status).toBe(403);
    }
  });
});

describe("GET /api/admin/users — studentCount", () => {
  test("teacher rows get a count derived from sections; non-teachers omit the field", async () => {
    const res = await request(app).get("/api/admin/users").set(auth(ADMIN));
    expect(res.status).toBe(200);
    const byName = Object.fromEntries(res.body.users.map((u) => [u.name, u]));

    expect(byName.Adhil.studentCount).toBe(3); // guest, ghost and admin id excluded
    expect(byName.Priya.studentCount).toBe(2);
    expect(byName.Kumar.studentCount).toBe(0); // listed, with an explicit zero
    expect(byName.Newbie).toMatchObject({ status: "pending", studentCount: 0 });
    expect(byName["Plain Student"]).not.toHaveProperty("studentCount");
    expect(byName.Admin).not.toHaveProperty("studentCount");
  });

  test("only asks the database for the teachers on the current page", async () => {
    await request(app).get("/api/admin/users").set(auth(ADMIN));
    const pipeline = Section.aggregate.mock.calls[0][0];
    expect(pipeline[0].$match.teacher_id.$in.map(String).sort()).toEqual([ADHIL, PRIYA, KUMAR, PENDING].sort());
  });

  test("does not run the aggregation when the page has no teachers", async () => {
    users = users.filter((u) => u.role !== "teacher");
    const res = await request(app).get("/api/admin/users").set(auth(ADMIN));
    expect(res.status).toBe(200);
    expect(Section.aggregate).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/users — optional status filter (Staff summary: Pending Teachers)", () => {
  test("role=teacher&status=pending returns only pending teachers; total is the pending count", async () => {
    const res = await request(app)
      .get("/api/admin/users?role=teacher&status=pending&limit=1")
      .set(auth(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.users[0]).toMatchObject({ name: "Newbie", status: "pending" });
  });

  test("status=active excludes pending teachers", async () => {
    const res = await request(app).get("/api/admin/users?role=teacher&status=active").set(auth(ADMIN));
    expect(res.body.users.map((u) => u.name).sort()).toEqual(["Adhil", "Kumar", "Priya"]);
  });

  test("an unknown or object-shaped status is ignored — never forwarded to the database filter", async () => {
    for (const q of ["status=bogus", "status[$ne]=active"]) {
      User.countDocuments.mockClear();
      const res = await request(app).get(`/api/admin/users?role=teacher&${q}`).set(auth(ADMIN));
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(4); // no status filtering applied
      const filter = User.countDocuments.mock.calls[0][0];
      expect(filter).not.toHaveProperty("status");
    }
  });

  test("the status filter is still admin-only", async () => {
    const res = await request(app).get("/api/admin/users?role=teacher&status=pending").set(auth(ADHIL));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/teachers/:id/students", () => {
  test("returns exactly the real assigned students and a total equal to the table count", async () => {
    const roster = await request(app).get(`/api/admin/teachers/${ADHIL}/students`).set(auth(ADMIN));
    const list = await request(app).get("/api/admin/users").set(auth(ADMIN));

    expect(roster.status).toBe(200);
    expect(roster.body.teacher).toMatchObject({ id: ADHIL, name: "Adhil", status: "active" });
    expect(roster.body.students.map((s) => s.id).sort()).toEqual([oid(20), oid(21), oid(22)]);
    expect(roster.body.total).toBe(3);
    expect(roster.body.total).toBe(list.body.users.find((u) => u.name === "Adhil").studentCount);
    expect(roster.body.students[0]).toMatchObject({ grade: 6, section: { name: "6-A" } });
    expect(roster.body.students[0]).not.toHaveProperty("password_hash");
  });

  test("never includes another teacher's students", async () => {
    const roster = await request(app).get(`/api/admin/teachers/${PRIYA}/students`).set(auth(ADMIN));
    expect(roster.body.students.map((s) => s.name).sort()).toEqual(["Priya S30", "Priya S31"]);
  });

  test("zero-student teacher → 200 with total 0 and empty list", async () => {
    const res = await request(app).get(`/api/admin/teachers/${KUMAR}/students`).set(auth(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 0, students: [] });
    expect(res.body.teacher.name).toBe("Kumar");
  });

  test("400 for a malformed id; 404 for a non-teacher or unknown id", async () => {
    const bad = await request(app).get("/api/admin/teachers/not-an-id/students").set(auth(ADMIN));
    const student = await request(app).get(`/api/admin/teachers/${STUDENT_USER}/students`).set(auth(ADMIN));
    const unknown = await request(app).get(`/api/admin/teachers/${oid(777)}/students`).set(auth(ADMIN));
    expect(bad.status).toBe(400);
    expect(student.status).toBe(404);
    expect(unknown.status).toBe(404);
  });
});

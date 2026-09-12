// NOTE: like every other file in this directory, these tests use
// mongodb-memory-server, which downloads a real MongoDB binary on
// first run. That download is blocked in the sandbox this file was
// written in (fastdl.mongodb.org is not reachable there) — these
// tests were written and statically reviewed but NOT executed. Run
// with: npx jest tests/integration/teacherAuth.test.js in an
// environment with real internet access, and treat this as
// unverified until that run comes back green.

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const crypto = require("crypto");

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

describe("Teacher self-signup (pending approval)", () => {
  test("registering with role: teacher creates a pending account, not an active one", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Ms. Rao",
      email: "rao@test.com",
      password: "password123",
      role: "teacher",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("teacher");
    expect(res.body.user.status).toBe("pending");
    // Teachers don't have a grade — this must not have been forced to
    // some default, and must not have thrown a required-field error.
    expect(res.body.user.grade).toBeFalsy();
  });

  test("a pending teacher cannot access a requireTeacher-protected route", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Ms. Rao",
      email: "rao2@test.com",
      password: "password123",
      role: "teacher",
    });
    const token = registerRes.body.token;

    const res = await request(app)
      .get("/api/teacher/overview")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("TEACHER_PENDING");
  });

  test("role: admin in the request body is ignored — never self-assignable", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Sneaky",
      email: "sneaky@test.com",
      password: "password123",
      // A grade is required for the student path this request falls
      // back to (see "student registration still requires a valid
      // grade" below) -- unrelated to the role-stripping property
      // this test actually verifies, so it's supplied here just to
      // reach that assertion.
      grade: 6,
      role: "admin",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("student");
  });

  test("admin setting a teacher's role approves them (status -> active)", async () => {
    // Seed an admin directly (public signup can never create one).
    const admin = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password_hash: "irrelevant-not-used-for-this-request",
      role: "admin",
      status: "active",
    });
    const jwt = require("jsonwebtoken");
    const adminToken = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Mr. Iyer",
      email: "iyer@test.com",
      password: "password123",
      role: "teacher",
    });
    const teacherId = registerRes.body.user.id;

    const approveRes = await request(app)
      .patch(`/api/admin/users/${teacherId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "teacher" });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe("active");

    const teacherLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "iyer@test.com", password: "password123" });
    const teacherToken = teacherLogin.body.token;

    const teacherRes = await request(app)
      .get("/api/teacher/overview")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(teacherRes.status).not.toBe(403);
  });

  test("student registration still requires a valid grade (unchanged behavior)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Student",
      email: "student1@test.com",
      password: "password123",
      // grade omitted
    });

    expect(res.status).toBe(400);
  });
});

describe("Forgot / reset password", () => {
  test("forgot-password always returns the same generic message, registered or not", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Real User",
      email: "real@test.com",
      password: "password123",
      grade: 8,
    });

    const resKnown = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "real@test.com" });
    const resUnknown = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@test.com" });

    expect(resKnown.status).toBe(200);
    expect(resUnknown.status).toBe(200);
    expect(resKnown.body.message).toBe(resUnknown.body.message);
  });

  test("a token from forgot-password can reset the password exactly once", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Real User",
      email: "reset-me@test.com",
      password: "password123",
      grade: 8,
    });

    // The raw token is only ever logged (see utils/mailer.js), never
    // returned in the HTTP response — read it back out of the DB the
    // same way, by re-deriving the hash the controller stored.
    const userBefore = await User.findOne({ email: "reset-me@test.com" }).select(
      "+reset_password_token_hash +reset_password_expires",
    );
    expect(userBefore.reset_password_token_hash).toBeNull();

    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "reset-me@test.com" });

    const userAfter = await User.findOne({ email: "reset-me@test.com" }).select(
      "+reset_password_token_hash +reset_password_expires",
    );
    expect(userAfter.reset_password_token_hash).toBeTruthy();
    expect(userAfter.reset_password_expires.getTime()).toBeGreaterThan(Date.now());

    // Simulate having the raw token from the email link: the test
    // can't recover the raw token from its stored hash (that's the
    // point), so it exercises the full flow by minting its own raw
    // token and writing its hash directly, matching exactly what
    // forgotPassword does internally.
    const rawToken = "test-raw-token-value";
    userAfter.reset_password_token_hash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    await userAfter.save();

    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "newpassword123" });
    expect(resetRes.status).toBe(200);

    const loginOld = await request(app)
      .post("/api/auth/login")
      .send({ email: "reset-me@test.com", password: "password123" });
    expect(loginOld.status).toBe(400);

    const loginNew = await request(app)
      .post("/api/auth/login")
      .send({ email: "reset-me@test.com", password: "newpassword123" });
    expect(loginNew.status).toBe(200);

    // Reusing the same token a second time must fail — it was cleared
    // on first use.
    const reuseRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "anotherpassword123" });
    expect(reuseRes.status).toBe(400);
  });

  test("an expired token is rejected", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Real User",
      email: "expired@test.com",
      password: "password123",
      grade: 8,
    });
    const user = await User.findOne({ email: "expired@test.com" });
    const rawToken = "expired-raw-token";
    user.reset_password_token_hash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    user.reset_password_expires = new Date(Date.now() - 1000); // already expired
    await user.save();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, password: "newpassword123" });
    expect(res.status).toBe(400);
  });
});

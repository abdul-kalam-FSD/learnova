// Regression coverage for ISSUE-1: the shared `requireCronSecret` guard
// in maintenanceroutes.js and notificationroutes.js used to fail OPEN
// when CRON_SECRET was unset on the server — `undefined !== undefined`
// is false, so a request with no header at all would be let through
// whenever the server forgot to configure the secret. This file locks
// in the fail-closed contract for both cron-guarded routes:
//   missing server secret  -> reject
//   missing request header -> reject
//   incorrect header       -> reject
//   correct header + configured secret -> allow
//
// Same mongodb-memory-server sandbox limitation as the rest of this
// suite — see security.test.js's header. Run with:
// npx jest tests/integration/cronSecretAuth.test.js

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
  process.env.CRON_SECRET = "test-cron-secret";
  app = require("../../src/app");
  await mongoose.connection.asPromise();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// requireCronSecret reads process.env.CRON_SECRET fresh on every
// request (not captured at module-load time), so tests can safely
// flip it per-test and restore it afterwards.
const ORIGINAL_CRON_SECRET = "test-cron-secret";
afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
});

describe.each([
  { name: "maintenance cleanup-guests", path: "/api/maintenance/cleanup-guests" },
  { name: "notifications trigger-streak-reminders", path: "/api/notifications/trigger-streak-reminders" },
])("cron secret guard — $name", ({ path }) => {
  test("rejects when the server has no CRON_SECRET configured, even with a header sent", async () => {
    delete process.env.CRON_SECRET;

    const res = await request(app)
      .post(path)
      .set("x-cron-secret", "anything")
      .send();

    expect(res.status).toBe(401);
  });

  test("rejects when the server has no CRON_SECRET configured and no header is sent either", async () => {
    delete process.env.CRON_SECRET;

    const res = await request(app).post(path).send();

    expect(res.status).toBe(401);
  });

  test("rejects when no request header is sent (server secret is configured)", async () => {
    const res = await request(app).post(path).send();

    expect(res.status).toBe(401);
  });

  test("rejects an incorrect header value (server secret is configured)", async () => {
    const res = await request(app).post(path).set("x-cron-secret", "wrong-secret").send();

    expect(res.status).toBe(401);
  });

  test("allows a correct header value when the server secret is configured", async () => {
    const res = await request(app).post(path).set("x-cron-secret", ORIGINAL_CRON_SECRET).send();

    expect(res.status).not.toBe(401);
  });
});

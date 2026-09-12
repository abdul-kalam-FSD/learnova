// Regression test for the full-project-audit boot-crash fix:
// webpush.setVapidDetails used to run unconditionally at module load,
// and web-push throws synchronously if either key is missing/empty —
// so requiring notificationControllers.js (and therefore app.js,
// which requires it transitively) used to crash the entire backend
// on any environment without VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY set.
//
// jest.resetModules() + re-require per test because pushEnabled is
// computed once at module load — each test needs a fresh module
// instance to see a different env var state.

describe("notificationControllers — VAPID boot-crash fix", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  test("requiring the module does not throw when VAPID keys are missing", () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    jest.resetModules();

    expect(() => require("../../src/controllers/notificationControllers")).not.toThrow();
  });

  test("requiring the module does not throw when VAPID keys are empty strings", () => {
    process.env.VAPID_PUBLIC_KEY = "";
    process.env.VAPID_PRIVATE_KEY = "";
    jest.resetModules();

    expect(() => require("../../src/controllers/notificationControllers")).not.toThrow();
  });

  test("requiring app.js (the real crash site) does not throw when VAPID keys are missing", () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    process.env.MONGO_URI = "mongodb://localhost:27017/test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:5173";
    jest.resetModules();

    // Isolate this test to the VAPID fix — connectDB() reaching a real
    // Mongo is a separate, legitimate concern (and correctly fatal if
    // it fails); mock it out so this test only exercises the
    // require-time chain the VAPID bug used to crash.
    jest.doMock("../../src/config/db", () => jest.fn());

    expect(() => require("../../src/app")).not.toThrow();
  });

  test("requiring the module does not throw when VAPID keys are present but malformed (e.g. .env.example placeholder text left in place)", () => {
    // Distinct bug from "missing/empty": these are non-empty strings so
    // the Boolean(...) presence check passes, but they aren't valid
    // VAPID key material, so web-push's setVapidDetails throws
    // synchronously on the decoded byte length. This is exactly what
    // happens if someone copies .env.example and forgets to replace
    // VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.
    process.env.VAPID_PUBLIC_KEY = "your_vapid_public_key";
    process.env.VAPID_PRIVATE_KEY = "your_vapid_private_key";
    jest.resetModules();

    expect(() => require("../../src/controllers/notificationControllers")).not.toThrow();
  });

  test("requiring app.js (the real crash site) does not throw when VAPID keys are present but malformed", () => {
    process.env.VAPID_PUBLIC_KEY = "your_vapid_public_key";
    process.env.VAPID_PRIVATE_KEY = "your_vapid_private_key";
    process.env.MONGO_URI = "mongodb://localhost:27017/test";
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:5173";
    jest.resetModules();

    jest.doMock("../../src/config/db", () => jest.fn());

    expect(() => require("../../src/app")).not.toThrow();
  });

  test("triggerStreakReminders degrades to a safe no-op when VAPID keys are malformed, not just when missing", async () => {
    process.env.VAPID_PUBLIC_KEY = "your_vapid_public_key";
    process.env.VAPID_PRIVATE_KEY = "your_vapid_private_key";
    jest.resetModules();

    jest.doMock("../../src/models/PushSubscription", () => ({
      find: jest.fn().mockResolvedValue([{ endpoint: "e1", keys: {} }]),
    }));
    jest.doMock("../../src/models/User", () => ({
      find: jest.fn().mockResolvedValue([
        {
          _id: "u1",
          last_active_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          streak_count: 3,
        },
      ]),
    }));

    const { triggerStreakReminders } = require("../../src/controllers/notificationControllers");

    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await triggerStreakReminders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Streak reminders processed",
      usersNotified: 0,
    });
  });

  test("still configures webpush normally when both VAPID keys are present", () => {
    const webpush = require("web-push");
    const { publicKey, privateKey } = webpush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = publicKey;
    process.env.VAPID_PRIVATE_KEY = privateKey;
    jest.resetModules();

    const freshWebpush = require("web-push");
    const spy = jest.spyOn(freshWebpush, "setVapidDetails");

    require("../../src/controllers/notificationControllers");

    expect(spy).toHaveBeenCalledWith("mailto:admin@leveled.app", publicKey, privateKey);
    spy.mockRestore();
  });

  test("sendNotificationToUser degrades to a safe no-op (0 sent) instead of throwing when push is disabled", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    jest.resetModules();

    jest.doMock("../../src/models/PushSubscription", () => ({
      find: jest.fn().mockResolvedValue([{ endpoint: "e1", keys: {} }]),
    }));
    jest.doMock("../../src/models/User", () => ({
      find: jest.fn().mockResolvedValue([
        {
          _id: "u1",
          last_active_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          streak_count: 3,
        },
      ]),
    }));

    const { triggerStreakReminders } = require("../../src/controllers/notificationControllers");

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await triggerStreakReminders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Streak reminders processed",
      usersNotified: 0,
    });
  });
});

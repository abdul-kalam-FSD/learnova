// NOTE: same mongodb-memory-server sandbox limitation as the rest of
// this suite — see security.test.js's header. Run with:
// npx jest tests/integration/guestCleanup.test.js

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

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const User = require("../../src/models/User");
const QuizSession = require("../../src/models/QuizzSession");
const UserConceptMastery = require("../../src/models/UserConceptMastery");
const PushSubscription = require("../../src/models/PushSubscription");
const { GUEST_RETENTION_DAYS } = require("../../src/controllers/maintenanceControllers");

// createdAt is set by Mongoose on create() and normally can't be
// backdated through the schema — this goes around the model with a
// raw collection update, which is the only honest way to simulate
// "a guest account created 31 days ago" in a test.
async function backdateCreatedAt(userId, daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  // User.collection is the native MongoDB driver, not the Mongoose
  // model -- it does NOT auto-cast a string _id to ObjectId the way
  // Mongoose queries do, so the raw string userId here previously
  // matched zero documents and silently no-op'd this "backdate".
  await User.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    { $set: { createdAt: date } },
  );
}

async function createGuest(grade = 6) {
  const res = await request(app).post("/api/auth/guest").send({ grade });
  return res.body.user.id;
}

function callCleanup(secret = "test-cron-secret") {
  return request(app)
    .post("/api/maintenance/cleanup-guests")
    .set("x-cron-secret", secret)
    .send();
}

describe("POST /api/maintenance/cleanup-guests", () => {
  test("rejects requests without the correct cron secret", async () => {
    const res = await callCleanup("wrong-secret");
    expect(res.status).toBe(401);
  });

  test("rejects requests with no cron secret header at all", async () => {
    const res = await request(app).post("/api/maintenance/cleanup-guests").send();
    expect(res.status).toBe(401);
  });

  test("does nothing when there are no stale guests", async () => {
    const freshGuestId = await createGuest();

    const res = await callCleanup();

    expect(res.status).toBe(200);
    expect(res.body.guestsRemoved).toBe(0);
    expect(await User.findById(freshGuestId)).not.toBeNull();
  });

  test("removes a guest older than the retention window, and leaves recent guests alone", async () => {
    const staleGuestId = await createGuest();
    await backdateCreatedAt(staleGuestId, GUEST_RETENTION_DAYS + 1);

    const freshGuestId = await createGuest();

    const res = await callCleanup();

    expect(res.status).toBe(200);
    expect(res.body.guestsRemoved).toBe(1);
    expect(await User.findById(staleGuestId)).toBeNull();
    expect(await User.findById(freshGuestId)).not.toBeNull();
  });

  test("does not remove a real (non-guest) account, even if very old", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Old Real User",
      email: `old-${Date.now()}@test.com`,
      password: "password123",
      grade: 6,
    });
    const realUserId = registerRes.body.user.id;
    await backdateCreatedAt(realUserId, GUEST_RETENTION_DAYS + 100);

    const res = await callCleanup();

    expect(res.body.guestsRemoved).toBe(0);
    expect(await User.findById(realUserId)).not.toBeNull();
  });

  test("does not remove a guest who upgraded to a real account before going stale", async () => {
    const guestRes = await request(app).post("/api/auth/guest").send({ grade: 6 });
    const { token, user } = guestRes.body;

    await request(app)
      .post("/api/auth/upgrade-guest")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Upgraded",
        email: `upgraded-${Date.now()}@test.com`,
        password: "password123",
      });

    await backdateCreatedAt(user.id, GUEST_RETENTION_DAYS + 1);

    const res = await callCleanup();

    expect(res.body.guestsRemoved).toBe(0);
    expect(await User.findById(user.id)).not.toBeNull();
  });

  test("cascades deletion to the guest's sessions, mastery records, and push subscriptions", async () => {
    const staleGuestId = await createGuest();
    await backdateCreatedAt(staleGuestId, GUEST_RETENTION_DAYS + 1);

    await QuizSession.create({
      user_id: staleGuestId,
      session_type: "game-session",
      game_type: "MATH_FRACTION_BUILDER",
      content_id: new mongoose.Types.ObjectId(),
    });
    await UserConceptMastery.create({
      user_id: staleGuestId,
      concept_id: new mongoose.Types.ObjectId(),
      state: "weak",
    });
    await PushSubscription.create({
      user_id: staleGuestId,
      endpoint: "https://example.com/push/test",
      keys: { p256dh: "key", auth: "auth" },
    });

    const res = await callCleanup();

    expect(res.status).toBe(200);
    expect(res.body.sessionsRemoved).toBe(1);
    expect(res.body.masteryRecordsRemoved).toBe(1);
    expect(res.body.pushSubscriptionsRemoved).toBe(1);

    expect(await QuizSession.countDocuments({ user_id: staleGuestId })).toBe(0);
    expect(await UserConceptMastery.countDocuments({ user_id: staleGuestId })).toBe(0);
    expect(await PushSubscription.countDocuments({ user_id: staleGuestId })).toBe(0);
  });

  test("a stale guest's XP does not exempt it from cleanup", async () => {
    // Confirms the deliberate design choice noted in
    // maintenanceControllers.js: retention is keyed on age, not on
    // xp_total, since even a guest with real progress is equally
    // unreachable once its token has expired.
    const staleGuestId = await createGuest();
    await User.findByIdAndUpdate(staleGuestId, { xp_total: 500, streak_count: 4 });
    await backdateCreatedAt(staleGuestId, GUEST_RETENTION_DAYS + 1);

    const res = await callCleanup();

    expect(res.body.guestsRemoved).toBe(1);
    expect(await User.findById(staleGuestId)).toBeNull();
  });
});

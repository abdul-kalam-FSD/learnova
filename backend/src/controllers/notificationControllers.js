const { sendError } = require("../utils/sendError");
const PushSubscription = require("../models/PushSubscription");

const subscribe = async (req, res) => {
  try {
    const userId = req.userId;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ message: "Invalid subscription object" });
    }

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user_id: userId, endpoint, keys },
      { upsert: true, new: true },
    );

    res
      .status(201)
      .json({ message: "Subscribed successfully", id: subscription._id });
  } catch (err) {
    sendError(res, err);
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ message: "endpoint is required" });
    }

    await PushSubscription.deleteOne({ endpoint, user_id: req.userId });

    res.status(200).json({ message: "Unsubscribed successfully" });
  } catch (err) {
    sendError(res, err);
  }
};
const webpush = require("web-push");
const User = require("../models/User");

// NOTE: placeholder domain — swap for a real support/admin mailbox
// you control before shipping push notifications to production; the
// VAPID "subject" is what push services use to contact you if your
// server is misbehaving.
//
// BUGFIX (full-project audit): web-push throws synchronously inside
// setVapidDetails if either key is missing/empty, and this call used
// to run unconditionally at module load — since app.js requires this
// file transitively, a missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY
// crashed the ENTIRE backend on startup, not just push notifications.
// That's real on any environment without those two optional-feature
// secrets set (a fresh clone, a new teammate's machine, CI without
// the secret configured) — .env.example documents them, but nothing
// enforced they be present before the rest of the app could boot.
// Now: missing/empty keys just disable push sending (logged once,
// not per-call) and sendNotificationToUser/triggerStreakReminders
// degrade to a safe no-op instead of taking the process down.
// BUGFIX (follow-up): the missing-key guard above only covered the
// "unset" case. A *present but malformed* key — e.g. someone copies
// .env.example verbatim and leaves the literal placeholder strings
// "your_vapid_public_key" / "your_vapid_private_key" in place, or a
// truncated/corrupted key — still passes the Boolean(...) check above
// (the strings are non-empty) and web-push's setVapidDetails validates
// the key's decoded byte length *synchronously*, throwing and crashing
// the whole process on require. Wrapping in try/catch so a bad key
// value degrades push the same way a missing one does, instead of
// taking down every route in the app.
let pushEnabled = Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
);

if (pushEnabled) {
  try {
    webpush.setVapidDetails(
      "mailto:admin@leveled.app",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  } catch (err) {
    pushEnabled = false;
    console.warn(
      `[notifications] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are set but invalid (${err.message}) — push notifications are disabled for this run.`,
    );
  }
} else {
  console.warn(
    "[notifications] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — push notifications are disabled for this run.",
  );
}

const sendNotificationToUser = async (userId, payload) => {
  if (!pushEnabled) return 0;

  const subscriptions = await PushSubscription.find({ user_id: userId });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload),
      ),
    ),
  );

  for (let i = 0; i < results.length; i++) {
    if (
      results[i].status === "rejected" &&
      results[i].reason.statusCode === 410
    ) {
      await PushSubscription.deleteOne({ _id: subscriptions[i]._id });
    }
  }

  return results.filter((r) => r.status === "fulfilled").length;
};

const triggerStreakReminders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await User.find({});

    let notifiedCount = 0;

    for (const user of users) {
      if (!user.last_active_date) continue;

      const lastActive = new Date(user.last_active_date);
      lastActive.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - lastActive) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        const sent = await sendNotificationToUser(user._id, {
          title: "Don't lose your streak! 🔥",
          body: `Your ${user.streak_count}-day streak is about to end. Complete a quick quiz today!`,
        });
        if (sent > 0) notifiedCount++;
      }
    }

    res.status(200).json({
      message: "Streak reminders processed",
      usersNotified: notifiedCount,
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { subscribe, unsubscribe, triggerStreakReminders };

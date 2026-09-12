const { sendError } = require("../utils/sendError");
const User = require("../models/User");
const QuizSession = require("../models/QuizzSession");
const UserConceptMastery = require("../models/UserConceptMastery");
const PushSubscription = require("../models/PushSubscription");

// A guest User document (is_guest: true) is only ever reachable
// through the JWT it was issued at creation — there's no password,
// no email, nothing to log back in with. That JWT is signed with the
// same 30-day expiresIn as every other token (see authControllers.js
// generateToken), and upgrade-guest itself requires `protect`, i.e.
// that same still-valid token. So once a guest's token has expired,
// its User document is *permanently* unreachable by anyone —
// upgrading, playing, or even reading it back via /auth/me are all
// impossible from that point on, regardless of how much XP it has.
//
// That's deliberately what this threshold is keyed on — not
// xp_total, not last_active_date. A guest who played for an hour and
// earned XP is exactly as unreachable after 30 days as one who
// created a session and never touched a game: keeping either around
// only holds DB weight, never usefulness. Tying the cutoff to
// anything else (e.g. "only delete guests with xp_total: 0") would
// leave behind a growing pile of equally-dead, equally-unreachable
// documents for no benefit.
const GUEST_RETENTION_DAYS = 30;

// POST /api/maintenance/cleanup-guests — intended to be hit by an
// external scheduler (same shape as
// POST /api/notifications/trigger-streak-reminders), not called from
// the app itself. Deletes every is_guest User document older than
// the retention window, plus its QuizSession/UserConceptMastery/
// PushSubscription rows — those otherwise become permanently orphaned
// debris the moment the parent User is gone, silently inflating
// collection sizes and (for QuizSession/UserConceptMastery) skewing
// any future aggregate analytics that don't explicitly filter out
// dangling user_ids.
//
// Bulk deleteMany on collected ids rather than a per-user loop (unlike
// triggerStreakReminders, which has to loop because each user gets an
// individually-addressed push notification) — there's no per-document
// side effect here, so there's nothing a loop buys over one query per
// collection.
const cleanupOrphanedGuests = async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - GUEST_RETENTION_DAYS);

    const staleGuests = await User.find({
      is_guest: true,
      createdAt: { $lt: cutoff },
    }).select("_id");
    const guestIds = staleGuests.map((u) => u._id);

    if (guestIds.length === 0) {
      return res.status(200).json({
        message: "No orphaned guest accounts to clean up",
        guestsRemoved: 0,
      });
    }

    const [sessionResult, masteryResult, subscriptionResult] = await Promise.all([
      QuizSession.deleteMany({ user_id: { $in: guestIds } }),
      UserConceptMastery.deleteMany({ user_id: { $in: guestIds } }),
      PushSubscription.deleteMany({ user_id: { $in: guestIds } }),
    ]);
    await User.deleteMany({ _id: { $in: guestIds } });

    res.status(200).json({
      message: "Orphaned guest accounts cleaned up",
      guestsRemoved: guestIds.length,
      sessionsRemoved: sessionResult.deletedCount,
      masteryRecordsRemoved: masteryResult.deletedCount,
      pushSubscriptionsRemoved: subscriptionResult.deletedCount,
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { cleanupOrphanedGuests, GUEST_RETENTION_DAYS };

const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const QuizSession = require("../models/QuizzSession");

const TOP_LIMIT = 20;

function getStartDate(period) {
  const now = new Date();
  const start = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    start.setDate(start.getDate() - 7);
  } else if (period === "monthly") {
    start.setDate(start.getDate() - 30);
  } else {
    return null; // "overall" (or anything unrecognized) -> no date filter
  }
  return start;
}

const getLeaderboard = async (req, res) => {
  try {
    const period = req.query.period || "weekly";
    const validPeriods = ["today", "weekly", "monthly", "overall"];

    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        message: "period must be one of: today, weekly, monthly, overall",
      });
    }

    const userId = req.userId;
    const startDate = getStartDate(period);

    // Built explicitly rather than passing `$gte: startDate` with a
    // possibly-null startDate — relying on how MongoDB compares dates
    // to null is fragile; omitting $gte entirely for "overall" is clear.
    const completedAtMatch = { $ne: null };
    if (startDate) completedAtMatch.$gte = startDate;

    // Guests are anonymous "Guest" accounts minted on the fly by the
    // public play-without-login flow (see authControllers.guestLogin)
    // — every one of them shares the exact same display name, so
    // without this exclusion a busy day of guest traffic can flood
    // the competitive leaderboard with duplicate "Guest" entries,
    // potentially crowding out real students at the top. A
    // leaderboard is meaningless for a session nobody can identify
    // across visits, so guests are excluded from ranking entirely
    // (they still play, earn XP, and build mastery normally — this
    // only affects this competitive view).
    const excludeGuests = [
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "sessionUser",
        },
      },
      { $unwind: "$sessionUser" },
      { $match: { "sessionUser.is_guest": { $ne: true } } },
    ];

    const rankings = await QuizSession.aggregate([
      {
        $match: {
          completed_at: completedAtMatch,
        },
      },
      ...excludeGuests,
      {
        $group: {
          _id: "$user_id",
          totalXp: { $sum: "$xp_awarded" },
        },
      },
      { $sort: { totalXp: -1 } },
      { $limit: TOP_LIMIT },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$user.name",
          totalXp: 1,
        },
      },
    ]);

    const leaderboard = rankings.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      name: entry.name,
      xp: entry.totalXp,
      isCurrentUser: entry.userId.toString() === userId,
    }));

    // If the current user isn't in the top list, compute their own rank separately
    // so the UI can still show "You are #N" below the list. If the current user is
    // themself a guest, they were excluded above and simply won't get a rank here —
    // that's intentional, not a bug (see comment above excludeGuests).
    let currentUserEntry = leaderboard.find((e) => e.isCurrentUser) || null;

    if (!currentUserEntry) {
      const allRanked = await QuizSession.aggregate([
        { $match: { completed_at: completedAtMatch } },
        ...excludeGuests,
        { $group: { _id: "$user_id", totalXp: { $sum: "$xp_awarded" } } },
        { $sort: { totalXp: -1 } },
      ]);

      const idx = allRanked.findIndex(
        (e) => e._id.toString() === userId,
      );

      if (idx !== -1) {
        const me = await mongoose
          .model("User")
          .findById(userId)
          .select("name");
        currentUserEntry = {
          rank: idx + 1,
          userId,
          name: me?.name,
          xp: allRanked[idx].totalXp,
          isCurrentUser: true,
        };
      }
    }

    res.status(200).json({
      period,
      leaderboard,
      currentUser: currentUserEntry,
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { getLeaderboard };
const QuizSession = require("../models/QuizzSession");

// Product decision (confirmed): a student can replay the same
// case/game as many times as they want for practice, but only the
// first few completions of a given content item per day award XP —
// otherwise nothing stops infinite same-content replay for XP.
// Mastery/streak still update normally past the cap; only XP is
// zeroed, so it never feels like a punishment, just no extra reward.
const DAILY_XP_CAP_PER_CONTENT = 3;

// Counts how many times this user has already completed this specific
// content item (matchField/matchValue — e.g. case_id or content_id)
// since local midnight. Pass the active transaction session so the
// count is consistent with the completion currently being processed.
const countCompletionsToday = async (userId, matchField, matchValue, dbSession) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return QuizSession.countDocuments({
    user_id: userId,
    [matchField]: matchValue,
    completed_at: { $gte: startOfDay },
  }).session(dbSession);
};

module.exports = { DAILY_XP_CAP_PER_CONTENT, countCompletionsToday };

const QuizSession = require("../models/QuizzSession");

const SESSION_TYPE_LABELS = {
  "weak-concept-targeted": "Weak Concept Practice",
  "quick-5min": "Quick Practice",
  "chapter-review": "Chapter Review",
  "case-investigation": "Case Investigation",
};

const RECENT_LIMIT = 10;

// Scores a single completed session as { correct, total }.
//
// Quiz/case-investigation sessions (session_type !== "game-session")
// store per-question correctness in `questions`, so we read that
// directly.
//
// Game-mechanic sessions (session_type === "game-session") never
// populate `questions` — completeGame (gameControllers.js) stores
// correctness on `game_payload` instead. This mirrors that function's
// own fallback exactly, so accuracy here can never drift from the
// correctness that actually earned the session's XP:
//   - multi-question games (Speed/Boss Challenge) set
//     game_payload.correct_count/total_count directly.
//   - older, pre-multi-question sessions only set game_payload.is_correct,
//     which we expand to the 1-question shape (1/1 or 0/1).
//   - a session with no game_payload at all (attempt never submitted)
//     scores 0/1 rather than throwing.
function scoreSession(session) {
  if (session.session_type === "game-session") {
    const payload = session.game_payload;
    if (!payload) {
      return { correct: 0, total: 1 };
    }
    const isCorrect = payload.is_correct;
    const correct = payload.correct_count ?? (isCorrect ? 1 : 0);
    const total = payload.total_count ?? 1;
    return { correct, total };
  }

  const questions = session.questions || [];
  return {
    correct: questions.filter((q) => q.is_correct).length,
    total: questions.length,
  };
}

// Computes the same {quizzesPlayed, accuracy, recentQuizzes} shape for
// any user — used both for a student's own profile and for an admin
// looking up a specific student, so the two views can never drift.
async function computeUserQuizStats(userId, { recentLimit = RECENT_LIMIT } = {}) {
  const completedSessions = await QuizSession.find({
    user_id: userId,
    completed_at: { $ne: null },
  })
    .sort({ completed_at: -1 })
    .populate("case_id", "title");

  const quizzesPlayed = completedSessions.length;

  let totalCorrect = 0;
  let totalAnswered = 0;
  for (const session of completedSessions) {
    const { correct, total } = scoreSession(session);
    totalAnswered += total;
    totalCorrect += correct;
  }

  const accuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const recentQuizzes = completedSessions.slice(0, recentLimit).map((session) => {
    const { correct: correctCount, total: totalQuestions } = scoreSession(session);
    const sessionAccuracy =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const title =
      session.case_id?.title ||
      SESSION_TYPE_LABELS[session.session_type] ||
      "Practice Session";

    return {
      sessionId: session._id,
      title,
      date: session.completed_at,
      accuracy: sessionAccuracy,
      correctCount,
      totalQuestions,
      xpAwarded: session.xp_awarded,
      // Phase 7 (Student Dashboard "Recently Played"): exposes the
      // game_type already stored on every game-session document so a
      // caller can deep-link back into GAME_TYPE_TO_ROUTE without a
      // second lookup. null for non-game sessions (case investigations,
      // weak-concept practice, etc.), which have no single game route.
      gameType: session.game_type || null,
    };
  });

  return { quizzesPlayed, accuracy, totalCorrect, totalAnswered, recentQuizzes };
}

module.exports = { computeUserQuizStats, scoreSession, SESSION_TYPE_LABELS };

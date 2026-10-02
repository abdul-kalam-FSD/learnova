const mongoose = require("mongoose");

const answeredQuestionSchema = new mongoose.Schema(
  {
    question_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    concept_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Concept",
      required: true,
    },
    selected_option_id: { type: String, required: true },
    is_correct: { type: Boolean, required: true },
    answered_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const quizSessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  case_id: { type: mongoose.Schema.Types.ObjectId, ref: "Case" },
  session_type: {
    type: String,
    enum: [
      "weak-concept-targeted",
      "quick-5min",
      "chapter-review",
      "case-investigation",
      "game-session",
    ],
    required: true,
  },
  // Only set when session_type === "game-session". Identifies which
  // subject-specific game mechanic this session belongs to, e.g.
  // "MATH_FRACTION_BUILDER". Existing quiz/case sessions leave this unset.
  game_type: { type: String },
  // Only set when session_type === "game-session". Points at the
  // GameContent document (challenge/level) this session was playing.
  content_id: { type: mongoose.Schema.Types.ObjectId, ref: "GameContent" },
  // OPTIONAL. Set ONLY by startGame, and only after the server has
  // validated a teacher-created contest (published, student's grade,
  // inside its time window, and content_id is one of its challenges).
  // There is deliberately no other code path that writes it, so a
  // finished practice session can never be attached to a contest
  // afterwards. Normal practice sessions leave it unset. This session
  // IS the student's participation record for that contest challenge:
  // its game_payload (is_correct/correct_count/total_count), xp_awarded,
  // started_at and completed_at are the contest result data.
  contest_id: { type: mongoose.Schema.Types.ObjectId, ref: "Contest" },
  // Contest sessions only: how many times the student submitted an
  // answer in this session (the existing hint-and-retry mechanic lets a
  // session take several submissions). Kept for future tie-breaks; not
  // used for any scoring today.
  attempt_count: { type: Number, default: 0 },
  // Free-form result payload for non-MCQ game mechanics (e.g. which
  // pieces the student placed, final built fraction, attempts per
  // step). Existing quiz/case sessions leave this unset and keep using
  // the `questions` array below as before.
  game_payload: { type: mongoose.Schema.Types.Mixed },
  // SECURITY: the authoritative set of question IDs this session is
  // allowed to answer, fixed at startQuiz/startCase time. submitAnswer
  // rejects any questionId not in this list — previously it trusted
  // whatever questionId the client sent, letting a student answer
  // questions outside this session's scope (or the same one twice) to
  // farm XP/mastery. Only set for session_type in
  // ["weak-concept-targeted", "case-investigation"] (question-based
  // sessions); "game-session" uses content_id instead.
  eligible_question_ids: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Question",
    default: undefined,
  },
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  xp_awarded: { type: Number, default: 0 },
  streak_counted: { type: Boolean, default: false },
  questions: { type: [answeredQuestionSchema], default: [] },
  // Automatic Excel/Sheet synchronization status (Section 31-36 of the
  // project brief). "pending" until a sync has been attempted at
  // least once; a completed session that's still "pending" means the
  // sync call genuinely never ran (e.g. server restarted mid-flight)
  // rather than that it failed — the retry endpoint handles both the
  // same way.
  sync_status: {
    type: String,
    enum: ["pending", "synced", "failed"],
    default: "pending",
  },
  synced_at: { type: Date },
  sync_error: { type: String },
});

// PERFORMANCE: getHome/getProgress query sessions by user_id +
// completed_at, and the daily-cap check (Phase 4) will too.
quizSessionSchema.index({ user_id: 1, completed_at: 1 });

// Contest participation rule, enforced by the database so it holds even
// under concurrent requests: at most ONE session per student per contest
// challenge. Partial, so it only applies to contest sessions and never
// affects normal practice (which may replay the same content freely).
// Leading with contest_id also serves the future "all sessions in this
// contest" results query.
quizSessionSchema.index(
  { contest_id: 1, user_id: 1, content_id: 1 },
  { unique: true, partialFilterExpression: { contest_id: { $type: "objectId" } } },
);

module.exports = mongoose.model("QuizSession", quizSessionSchema);

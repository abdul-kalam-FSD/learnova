const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const QuizSession = require("../models/QuizzSession");
const UserConceptMastery = require("../models/UserConceptMastery");
const Question = require("../models/Question");
const Concept = require("../models/Concept");
const Assignment = require("../models/Assignment");
const { syncSessionToExcel } = require("../utils/performanceSync");
const startQuiz = async (req, res) => {
  try {
    const { sessionType } = req.body;
    const userId = req.userId;
    if (!sessionType) {
      return res.status(400).json({ message: "sessionType is required" });
    }

    let conceptIds = [];

    if (sessionType === "weak-concept-targeted") {
      const weakMasteries = await UserConceptMastery.find({
        user_id: userId,
        state: "weak",
      }).select("concept_id");
      conceptIds = weakMasteries.map((m) => m.concept_id);

      if (conceptIds.length === 0) {
        return res.status(404).json({
          message: "No weak concepts found. Try a different session type.",
        });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Unsupported sessionType for now" });
    }

    const questions = await Question.find({
      concept_id: { $in: conceptIds },
    }).limit(10);

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ message: "No questions available for these concepts" });
    }

    const session = await QuizSession.create({
      user_id: userId,
      session_type: sessionType,
      started_at: new Date(),
      eligible_question_ids: questions.map((q) => q._id),
      questions: [],
    });

    const firstQuestion = questions[0];

    res.status(201).json({
      sessionId: session._id,
      totalQuestions: questions.length,
      question: {
        id: firstQuestion._id,
        concept_id: firstQuestion.concept_id,
        question_text: firstQuestion.question_text,
        options: firstQuestion.options,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
};
const submitAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, selectedOptionId } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session id" });
    }
    if (!questionId || !selectedOptionId) {
      return res
        .status(400)
        .json({ message: "questionId and selectedOptionId are required" });
    }

    const session = await QuizSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.user_id.toString() !== userId) {
      return res.status(403).json({ message: "Not your session" });
    }

    if (session.completed_at) {
      return res
        .status(400)
        .json({ message: "This session is already completed" });
    }

    // SECURITY: previously any valid questionId in the whole database
    // was accepted here, regardless of whether it belonged to this
    // session — letting a student answer out-of-scope questions, or
    // the same question repeatedly, to farm XP/mastery. Now enforced
    // against the set fixed at session-start time.
    if (
      session.eligible_question_ids &&
      !session.eligible_question_ids.some((id) => id.toString() === questionId)
    ) {
      return res
        .status(403)
        .json({ message: "This question is not part of your current session" });
    }
    if (session.questions.some((q) => q.question_id.toString() === questionId)) {
      return res
        .status(400)
        .json({ message: "You've already answered this question in this session" });
    }

    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const isCorrect = question.correct_option_id === selectedOptionId;

    session.questions.push({
      question_id: question._id,
      concept_id: question.concept_id,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect,
      answered_at: new Date(),
    });

    await session.save();

    res.status(200).json({
      isCorrect,
      correctOptionId: question.correct_option_id,
      explanation: question.explanation_text,
      funFact: question.fun_fact || null,
      answeredCount: session.questions.length,
    });
  } catch (err) {
    sendError(res, err);
  }
};
const User = require("../models/User");
const { computeUserQuizStats } = require("../utils/quizStats");
const { DAILY_XP_CAP_PER_CONTENT, countCompletionsToday } = require("../utils/dailyCap");

const XP_PER_CORRECT = 10;
const PERFECT_QUIZ_BONUS = 20;

// XP depth: base XP + perfect-quiz bonus, then streak multiplier applied on top
const calculateXP = (correctCount, totalQuestions, currentStreak) => {
  let baseXP = correctCount * XP_PER_CORRECT;

  const isPerfect = totalQuestions > 0 && correctCount === totalQuestions;
  if (isPerfect) {
    baseXP += PERFECT_QUIZ_BONUS;
  }

  let multiplier = 1;
  if (currentStreak >= 7) {
    multiplier = 2;
  } else if (currentStreak >= 3) {
    multiplier = 1.5;
  }

  const finalXP = Math.floor(baseXP * multiplier);

  return { finalXP, isPerfect, multiplier };
};

const applyMasteryTransition = (currentState, isCorrect, currentStreak) => {
  if (isCorrect) {
    const newStreak = currentStreak + 1;
    if (currentState === "weak" && newStreak >= 2) {
      return { state: "learning", correct_streak: 0 };
    }
    if (currentState === "learning" && newStreak >= 2) {
      return { state: "strong", correct_streak: 0 };
    }
    return { state: currentState, correct_streak: newStreak };
  } else {
    if (currentState === "learning") {
      return { state: "weak", correct_streak: 0 };
    }
    if (currentState === "strong") {
      return { state: "learning", correct_streak: 0 };
    }
    return { state: "weak", correct_streak: 0 };
  }
};

// Mirrors gameControllers.buildAlreadyCompletedResponse, adapted for a
// multi-question quiz session's response shape (masteryUpdates is an
// array here, not a single masteryUpdate object). Reconstructs the
// stored result of a completion that already happened — never
// re-awards XP, never re-runs a mastery transition.
const buildAlreadyCompletedQuizResponse = async (session, userId) => {
  const conceptGroups = {};
  for (const q of session.questions) {
    const key = q.concept_id.toString();
    if (!conceptGroups[key]) conceptGroups[key] = [];
    conceptGroups[key].push(q);
  }

  const conceptIds = Object.keys(conceptGroups);
  const masteries = await UserConceptMastery.find({
    user_id: userId,
    concept_id: { $in: conceptIds },
  }).select("concept_id state");
  const masteryStateByConceptId = {};
  for (const m of masteries) {
    masteryStateByConceptId[m.concept_id.toString()] = m.state;
  }
  // A duplicate/losing request never applies its own transition, so
  // there's nothing case-specific to report here beyond the concept's
  // current stored state — same "no re-computation" rule as
  // buildAlreadyCompletedResponse's masteryUpdate.
  const masteryUpdates = conceptIds.map((conceptId) => ({
    concept_id: conceptId,
    new_state: masteryStateByConceptId[conceptId] ?? "weak",
  }));

  const correctCount = session.questions.filter((q) => q.is_correct).length;
  const totalQuestions = session.questions.length;

  const user = await User.findById(userId).select("streak_count");

  return {
    totalQuestions,
    correctCount,
    xpAwarded: session.xp_awarded || 0,
    // The daily cap (case-investigation only) was already correctly
    // applied — or not — on the request that actually completed the
    // session; a duplicate never re-checks it and never re-awards XP.
    xpCapped: false,
    isPerfectQuiz: totalQuestions > 0 && correctCount === totalQuestions,
    streakMultiplier: 1,
    newStreak: user?.streak_count ?? 0,
    masteryUpdates,
    performanceSync: session.sync_status,
    // Additive-only, same as gameControllers' equivalent flag — lets a
    // caller that cares distinguish this from a fresh completion
    // without changing what existing callers already read.
    alreadyCompleted: true,
  };
};

const completeQuiz = async (req, res) => {
  const { sessionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ message: "Invalid session id" });
  }

  const dbSession = await mongoose.startSession();
  const userId = req.userId;
  // Bounded retry count for the transient-write-conflict case handled
  // in the catch block below (Task 1A) — deliberately small since a
  // real conflict only needs one retry to resolve (the other request
  // will have finished by then); this just guards against looping
  // forever if something is genuinely, persistently wrong.
  const MAX_COMPLETE_QUIZ_ATTEMPTS = 5;

  try {
    for (let attempt = 1; attempt <= MAX_COMPLETE_QUIZ_ATTEMPTS; attempt++) {
    try {
      dbSession.startTransaction();

      const session = await QuizSession.findById(sessionId).session(dbSession);

      if (!session) {
        await dbSession.abortTransaction();
        return res.status(404).json({ message: "Session not found" });
      }

    if (session.user_id.toString() !== userId) {
      await dbSession.abortTransaction();
      return res.status(403).json({ message: "Not your session" });
    }

    if (session.completed_at) {
      // Plain duplicate request arriving after the session was
      // genuinely already completed (client retry, or the student
      // re-opening an already-finished session) — reuse the stored
      // result instead of a confusing 400. Mirrors
      // gameControllers.completeGame's identical duplicate-handling
      // path; see buildAlreadyCompletedQuizResponse above. Built
      // before aborting so a read error here still lands in the catch
      // block below with a transaction that's still abortable.
      const alreadyCompleted = await buildAlreadyCompletedQuizResponse(session, userId);
      await dbSession.abortTransaction();
      return res.status(200).json(alreadyCompleted);
    }

    if (session.questions.length === 0) {
      await dbSession.abortTransaction();
      return res.status(400).json({ message: "No answers submitted yet" });
    }

    // BUGFIX (idempotency parity with gameControllers.completeGame):
    // two near-simultaneous completion requests for the same session
    // (client retry after a slow/lost response, a double-tap on
    // "Submit Quiz") could both pass the plain `if (session.completed_at)`
    // check above if they read the session at nearly the same instant,
    // before either had written completed_at back — previously this
    // controller had no protection against that at all. This atomic
    // conditional update — flipping completed_at from null to now in
    // the same operation that requires it still be null — closes that
    // window exactly like completeGame's claim: MongoDB guarantees at
    // most one such update can succeed for a given document, so at
    // most one request can ever proceed past this point.
    const completionTimestamp = new Date();
    const claim = await QuizSession.updateOne(
      { _id: sessionId, completed_at: null },
      { $set: { completed_at: completionTimestamp } },
      { session: dbSession },
    );
    if (claim.modifiedCount === 0) {
      // Lost the race — another request completed this session
      // between our read above and this claim. Fetch it fresh
      // (outside this transaction) and reuse its stored result
      // exactly like the plain duplicate path above.
      const winningSession = await QuizSession.findById(sessionId);
      const alreadyCompleted = await buildAlreadyCompletedQuizResponse(winningSession, userId);
      await dbSession.abortTransaction();
      return res.status(200).json(alreadyCompleted);
    }
    session.completed_at = completionTimestamp;

    const conceptGroups = {};
    for (const q of session.questions) {
      const key = q.concept_id.toString();
      if (!conceptGroups[key]) conceptGroups[key] = [];
      conceptGroups[key].push(q);
    }

    const masteryUpdates = [];

    for (const conceptId of Object.keys(conceptGroups)) {
      let mastery = await UserConceptMastery.findOne({
        user_id: userId,
        concept_id: conceptId,
      }).session(dbSession);

      if (!mastery) {
        mastery = new UserConceptMastery({
          user_id: userId,
          concept_id: conceptId,
          state: "weak",
          correct_streak: 0,
        });
      }

      for (const answer of conceptGroups[conceptId]) {
        const result = applyMasteryTransition(
          mastery.state,
          answer.is_correct,
          mastery.correct_streak,
        );
        mastery.state = result.state;
        mastery.correct_streak = result.correct_streak;
      }

      mastery.last_attempted_at = new Date();
      await mastery.save({ session: dbSession });

      masteryUpdates.push({
        concept_id: conceptId,
        new_state: mastery.state,
      });
    }

    const correctCount = session.questions.filter((q) => q.is_correct).length;
    const totalQuestions = session.questions.length;

    const user = await User.findById(userId).session(dbSession);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streakCounted = false;

    if (!user.last_active_date) {
      user.streak_count = 1;
      streakCounted = true;
    } else {
      const lastActive = new Date(user.last_active_date);
      lastActive.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - lastActive) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        user.streak_count += 1;
        streakCounted = true;
      } else if (diffDays === 0) {
      } else if (diffDays > 1) {
        user.streak_count = 1;
        streakCounted = true;
      }
    }

    const { finalXP: rawXP, isPerfect, multiplier } = calculateXP(
      correctCount,
      totalQuestions,
      user.streak_count,
    );

    // Daily XP cap — only applies to case-investigation sessions
    // (repeating the same case indefinitely for XP). Weak-concept
    // practice quizzes aren't tied to one repeatable content item, so
    // they're out of scope for this cap.
    let xpCapped = false;
    let finalXP = rawXP;
    if (session.session_type === "case-investigation" && session.case_id) {
      const completionsToday = await countCompletionsToday(
        userId,
        "case_id",
        session.case_id,
        dbSession,
      );
      if (completionsToday >= DAILY_XP_CAP_PER_CONTENT) {
        finalXP = 0;
        xpCapped = true;
      }
    }
    const xpAwarded = finalXP;

    user.last_active_date = today;
    user.xp_total += xpAwarded;
    await user.save({ session: dbSession });

    // completed_at was already set atomically by the claim above — not
    // reassigned here, so the timestamp reflects the moment this
    // request won the race, not whenever this later save happens to run.
    session.xp_awarded = xpAwarded;
    session.streak_counted = streakCounted;
    await session.save({ session: dbSession });

    // Teacher assignments (Section 26): same rule gameControllers
    // applies for a game-session completion — assignments are
    // concept-level, not content-level, so a correct answer for the
    // assigned concept satisfies it regardless of which mechanism
    // (game or quiz/case) produced it.
    //
    // BUGFIX (full-project audit): this quiz path never touched
    // Assignment at all, so a student who satisfied an assigned
    // concept via weak-concept practice or a case investigation —
    // rather than the specific game the teacher happened to assign —
    // had that assignment stay "pending" forever, with no way for
    // either the student or teacher to see it as done. Mirrors
    // gameControllers' arrayFilters pattern; only concepts with at
    // least one correct answer in this session qualify.
    const correctlyAnsweredConceptIds = Object.keys(conceptGroups).filter((conceptId) =>
      conceptGroups[conceptId].some((q) => q.is_correct),
    );
    if (correctlyAnsweredConceptIds.length > 0) {
      await Assignment.updateMany(
        {
          concept_id: { $in: correctlyAnsweredConceptIds },
          students: { $elemMatch: { student_id: userId, status: "pending" } },
        },
        {
          $set: {
            "students.$[elem].status": "completed",
            "students.$[elem].completed_at": new Date(),
          },
        },
        {
          arrayFilters: [{ "elem.student_id": new mongoose.Types.ObjectId(userId), "elem.status": "pending" }],
          session: dbSession,
        },
      );
    }

    await dbSession.commitTransaction();

    // Automatic performance -> Excel sync (Section 31-36). Runs after
    // the transaction has already committed, so a sync failure here
    // can never roll back or block the student's actual result —
    // syncSessionToExcel catches its own errors and just marks the
    // session sync_status: "failed" for an admin to retry.
    //
    // BUGFIX (full-project audit): this call was previously missing
    // from completeQuiz entirely — only gameControllers.completeGame
    // triggered it. Every quiz/case-investigation completion (as
    // opposed to a game-session completion) was silently never synced:
    // sync_status stayed unset forever, GET /admin/results reported it
    // as "Pending" (adminControllers.js falls back to "pending" when
    // sync_status is unset), and the Admin UI only renders a Retry
    // button for "failed" rows, not "pending" ones — so there was no
    // way, automatic or manual, for a completed quiz's result to ever
    // reach the performance workbook. Mirrors the exact pattern used
    // in gameControllers.completeGame.
    const syncResult = await syncSessionToExcel(session._id);

    // Explicit return: this function now retries on a transient
    // transaction error (see the catch block below), so falling
    // through without returning here would let the retry loop
    // re-execute the whole transaction a second time after a
    // completion that already succeeded and was already sent to the
    // client.
    return res.status(200).json({
      totalQuestions: session.questions.length,
      correctCount,
      xpAwarded,
      xpCapped,
      isPerfectQuiz: isPerfect,
      streakMultiplier: multiplier,
      newStreak: user.streak_count,
      masteryUpdates,
      performanceSync: syncResult.status,
    });
  } catch (err) {
    // BUGFIX (Task 1A — concurrent completion failure): two genuinely
    // simultaneous completion requests for the same session don't
    // just race on the atomic claim's `modifiedCount`. MongoDB's
    // WiredTiger storage engine takes a per-document write lock
    // inside a transaction, so when both transactions try to write to
    // this same QuizSession document at nearly the same instant, the
    // *second* one gets an immediate WriteConflict — MongoDB error
    // code 112, labeled "TransientTransactionError" — rather than
    // waiting and then cleanly seeing modifiedCount: 0. This is
    // documented, expected MongoDB behavior for concurrent
    // transactions on the same document, and the driver does NOT
    // retry it automatically for a manually-managed session (only the
    // higher-level session.withTransaction() helper does that, which
    // this controller doesn't use) — so this error previously escaped
    // straight to sendError as a raw 500.
    //
    // The fix follows MongoDB's own documented retry pattern: catch
    // specifically TransientTransactionError-labeled errors and retry
    // the whole transaction from scratch, bounded so a genuinely
    // stuck conflict can't loop forever. On retry, the fresh read of
    // the session will see completed_at already set by whichever
    // request actually won, and correctly fall into the existing
    // "already completed" replay path above — no new logic is needed
    // for that, just the chance to re-run it. Non-transient errors
    // (a real bug, a validation failure, etc.) are never retried —
    // they go straight to sendError exactly as before.
    if (dbSession.inTransaction()) {
      // Guard against calling abortTransaction on a transaction the
      // server may have already ended on its own after the conflict —
      // that would itself throw and mask the real error.
      await dbSession.abortTransaction().catch(() => {});
    }

    const isTransientConflict =
      typeof err.hasErrorLabel === "function" && err.hasErrorLabel("TransientTransactionError");

    if (isTransientConflict && attempt < MAX_COMPLETE_QUIZ_ATTEMPTS) {
      continue;
    }

    return sendError(res, err);
  }
  }
} finally {
  dbSession.endSession();
}
};

const getHome = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select(
      "name xp_total streak_count grade",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const weakMasteries = await UserConceptMastery.find({
      user_id: userId,
      state: "weak",
    })
      .populate("concept_id", "title")
      .limit(5);

    const weakConcepts = weakMasteries.map((m) => ({
      concept_id: m.concept_id._id,
      title: m.concept_id.title,
    }));

    // Phase 7 (Student Dashboard "Recently Played"): reuses the exact
    // same computeUserQuizStats() Profile already calls for this user,
    // just capped to the 4 most recent, so Home never invents or
    // duplicates data Profile already owns — one source of truth for
    // "what did I last play."
    const { recentQuizzes } = await computeUserQuizStats(userId, { recentLimit: 4 });

    res.status(200).json({
      name: user.name,
      xp_total: user.xp_total,
      streak_count: user.streak_count,
      grade: user.grade,
      weakConcepts,
      recentQuizzes,
    });
  } catch (err) {
    sendError(res, err);
  }
};
// Mistake Review V1 (quiz-type sessions only — weak-concept-targeted
// and case-investigation, both of which persist structured
// per-question data via answeredQuestionSchema; see QuizSession.js).
// Deliberately does NOT cover the 54 game-type mechanics — those
// store a free-form `game_payload` with no guaranteed per-question
// structure, so a review screen for them would need a new
// attempt-persistence design, not this endpoint. That's a future
// architectural question, not something this task expands into.
//
// A completed session's `questions[]` only ever contains what the
// student actually answered — `eligible_question_ids` (fixed at
// startQuiz/startCase time) can be a larger set than `questions[]` if
// the student completed the quiz without answering every eligible
// question (completeQuiz only requires at least one answer). That's
// expected, not a bug: there is nothing to review for a question that
// was never attempted, so this endpoint naturally only ever reports
// on what's in `questions[]`.
//
// Read-only: never mutates QuizSession or Question, never
// recalculates correctness (uses the persisted `is_correct` as-is).
const getQuizReview = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const session = await QuizSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.user_id.toString() !== userId) {
      return res.status(403).json({ message: "Not your session" });
    }

    // game-session sessions have no structured `questions` data to
    // review (see the file-level comment above) — a clear, honest
    // 400 rather than silently returning an empty review.
    if (session.session_type === "game-session") {
      return res
        .status(400)
        .json({ message: "Mistake review is not available for this session type yet" });
    }

    // V1 scope: only questions the student got wrong, in the order
    // they originally answered them.
    const mistakes = session.questions.filter((q) => !q.is_correct);

    if (mistakes.length === 0) {
      return res.status(200).json({ mistakes: [] });
    }

    const questionIds = mistakes.map((q) => q.question_id);
    const questions = await Question.find({ _id: { $in: questionIds } }).select(
      "question_text options correct_option_id explanation_text",
    );
    const questionById = {};
    for (const q of questions) {
      questionById[q._id.toString()] = q;
    }

    const conceptIds = [...new Set(mistakes.map((q) => q.concept_id.toString()))];
    const concepts = await Concept.find({ _id: { $in: conceptIds } }).select("title");
    const conceptById = {};
    for (const c of concepts) {
      conceptById[c._id.toString()] = c;
    }

    const result = mistakes.map((mistake) => {
      const question = questionById[mistake.question_id.toString()];
      const concept = conceptById[mistake.concept_id.toString()];
      const selectedOption = question?.options?.find(
        (o) => o.id === mistake.selected_option_id,
      );
      const correctOption = question?.options?.find(
        (o) => o.id === question.correct_option_id,
      );

      return {
        question_id: mistake.question_id,
        concept_id: mistake.concept_id,
        concept_title: concept?.title ?? null,
        // question may have been deleted/changed since the attempt —
        // don't let a missing lookup crash the response, just report
        // what's genuinely available.
        question_text: question?.question_text ?? null,
        selected_option: selectedOption
          ? { id: selectedOption.id, text: selectedOption.text }
          : { id: mistake.selected_option_id, text: null },
        correct_option: correctOption
          ? { id: correctOption.id, text: correctOption.text }
          : question
            ? { id: question.correct_option_id, text: null }
            : null,
        explanation: question?.explanation_text ?? null,
        answered_at: mistake.answered_at,
      };
    });

    res.status(200).json({ mistakes: result });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  startQuiz,
  submitAnswer,
  completeQuiz,
  getHome,
  getQuizReview,
  calculateXP,
  applyMasteryTransition,
  // Exposed so the Game Lobby (Phase 11) can show a real, honest XP
  // preview before a student starts a level — same numbers
  // calculateXP actually uses, not a made-up figure duplicated in the
  // frontend that could drift out of sync.
  XP_PER_CORRECT,
  PERFECT_QUIZ_BONUS,
};
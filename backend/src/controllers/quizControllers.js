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

const completeQuiz = async (req, res) => {
  const { sessionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ message: "Invalid session id" });
  }

  const dbSession = await mongoose.startSession();

  try {
    dbSession.startTransaction();

    const userId = req.userId;

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
      await dbSession.abortTransaction();
      return res
        .status(400)
        .json({ message: "This session is already completed" });
    }

    if (session.questions.length === 0) {
      await dbSession.abortTransaction();
      return res.status(400).json({ message: "No answers submitted yet" });
    }

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

    session.completed_at = new Date();
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

    res.status(200).json({
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
    await dbSession.abortTransaction();
    sendError(res, err);
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
module.exports = {
  startQuiz,
  submitAnswer,
  completeQuiz,
  getHome,
  calculateXP,
  applyMasteryTransition,
  // Exposed so the Game Lobby (Phase 11) can show a real, honest XP
  // preview before a student starts a level — same numbers
  // calculateXP actually uses, not a made-up figure duplicated in the
  // frontend that could drift out of sync.
  XP_PER_CORRECT,
  PERFECT_QUIZ_BONUS,
};
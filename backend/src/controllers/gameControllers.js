const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const QuizSession = require("../models/QuizzSession");
const Assignment = require("../models/Assignment");
const GameContent = require("../models/GameContent");
const UserConceptMastery = require("../models/UserConceptMastery");
const User = require("../models/User");
const { calculateXP, applyMasteryTransition, XP_PER_CORRECT, PERFECT_QUIZ_BONUS } = require("./quizControllers");
const { verifyGradeAccess, getGradeConceptIds } = require("../utils/gradeAccess");
const { DAILY_XP_CAP_PER_CONTENT, countCompletionsToday } = require("../utils/dailyCap");
const {
  GAME_TYPES,
  KNOWN_GAME_TYPES,
  GAME_TYPE_TO_SUBJECT,
  GAME_TYPE_TO_LABEL,
  GAME_TYPE_TO_TIER,
  MASTERY_STATE_TO_PREFERRED_TIER,
} = require("../utils/gameTypeRegistry");
const { getGradeBandConfig, applyTimePressure, capDistractors } = require("../utils/gradeBandConfig");
const { syncSessionToExcel } = require("../utils/performanceSync");

// Section 26 (grade-band complexity): which payload field holds a
// game type's authored tile/card pool, for the subset-sum "builder"
// family (student picks a subset of pieces that sum/match a target —
// see checkAttempt's shared MATH_FRACTION_BUILDER branch below). Only
// this family has genuine distractors (pool entries excluded from
// correct_piece_ids) safe to trim — the order-family builders hand
// the student every piece as the puzzle itself, with nothing spare.
const DISTRACTOR_POOL_FIELD = {
  MATH_FRACTION_BUILDER: "pieces",
  MATH_GEOMETRY_BUILDER: "pieces",
  CHEMISTRY_MOLECULE_BUILDER: "atom_pool",
  BIO_DIAGNOSIS: "evidence",
};

// Non-MCQ game mechanics (Fraction Builder now, more later) reuse the
// same QuizSession collection (session_type: "game-session") and the
// same XP/mastery engine as regular quizzes — see Section 2.1/2.5 of
// the game-engine plan. Only the "was it correct" check differs per
// game_type, since there's no single Question/options shape here.

// List playable challenges for a game type, e.g. GET
// /api/games/content?gameType=MATH_FRACTION_BUILDER
//
// SECURITY/UX: filtered to the requesting student's own grade, same
// as getCases/getRecommendedCase. Every game_type happened to map to
// exactly one grade until Chemistry got a second grade added, which
// would have silently mixed both grades' challenges into one list —
// startGame's verifyGradeAccess would still block playing the wrong
// one, but the student would see (and tap into a 403 on) content
// that was never meant for their grade.
const getGameContentList = async (req, res) => {
  try {
    const { gameType } = req.query;
    if (!gameType) {
      return res.status(400).json({ message: "gameType is required" });
    }

    const user = await User.findById(req.userId).select("grade");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const gradeConceptIds = await getGradeConceptIds(user.grade);

    // Phase 11 (Game Lobby): populate the concept's real title +
    // explanation_text so the lobby can show an honest "mission
    // objective" instead of inventing flavor text — this is the same
    // explanation_text already shown elsewhere in the app (chapter
    // pages), just surfaced one screen earlier.
    const rawContent = await GameContent.find({
      game_type: gameType,
      concept_id: { $in: gradeConceptIds },
    })
      .sort({ order_index: 1 })
      .select("title difficulty payload order_index concept_id")
      .populate("concept_id", "title explanation_text");

    // SECURITY: this list is fetched before the student ever presses
    // "Start Mission", so it must go through the exact same
    // sanitizePayloadForClient() gate as startGame — otherwise the
    // lobby response leaks each question's answer key/hint straight
    // into the network tab, before an attempt even begins.
    const bandConfig = getGradeBandConfig(user.grade);
    // BUGFIX (full-matrix runtime audit): every LevelSelectScreen keys its
    // level buttons on `level.id` and every game's startMission() sends
    // `contentId: level.id` to POST /games/start (see e.g.
    // games/history/TimelineBuilder.jsx). startGame's own response already
    // aliases `id: content._id` (line ~202 below) for exactly that reason,
    // but this list endpoint only returned `_id`, so `level.id` was
    // `undefined` for every level across all 54 game types. That produced
    // both known symptoms at once: React's "unique key" warning (every
    // button's key was the same `undefined`) and the `/api/games/start 400`
    // ("gameType and contentId are required") once JSON.stringify dropped
    // the undefined contentId. Keep `_id` for any existing caller that
    // still reads it; add `id` so the list matches startGame's contract.
    const content = rawContent.map((item) => ({
      id: item._id,
      _id: item._id,
      title: item.title,
      difficulty: item.difficulty,
      order_index: item.order_index,
      concept_id: item.concept_id,
      payload: sanitizePayloadForClient(gameType, item.payload, bandConfig),
    }));

    res.status(200).json({
      content,
      // Real XP numbers calculateXP actually uses, so the lobby's "+XP"
      // preview can never drift out of sync with what's actually
      // awarded on completeGame.
      xpInfo: { perCorrect: XP_PER_CORRECT, perfectBonus: PERFECT_QUIZ_BONUS },
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Multi-question game types (a batch of quick-fire questions scored
// together in one session) shape their payload/attempt differently
// from every other game_type, which is a single build/match/order
// check. Kept as its own short list rather than a game_type field
// flag so gameTypeRegistry.js stays a pure label/subject lookup.
const MULTI_QUESTION_GAME_TYPES = [
  "MATH_FRACTION_SPEED_CHALLENGE",
  "MATH_FRACTION_BOSS_CHALLENGE",
  "MATH_EQUATION_SPEED_CALCULATION",
  "MATH_ANGLE_SPEED_CHALLENGE",
  "MATH_GEOMETRY_BOSS_CHALLENGE",
  "MATH_EQUATION_BOSS_CHALLENGE",
  "MATH_PERMCOMB_SPEED_CHALLENGE",
  "MATH_AP_SPEED_CHALLENGE",
  "PHYSICS_OHMS_LAW_SPEED_CHALLENGE",
  "PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE",
  "PHYSICS_CAPACITANCE_SPEED_CHALLENGE",
];

// SECURITY: strips whatever this game_type's answer-key field is (and the
// hint, which should only be revealed after a wrong attempt via
// submitGameAttempt) before the payload is ever sent to the browser.
// The server is the only place that ever sees the unsanitized payload.
const sanitizePayloadForClient = (gameType, payload, bandConfig) => {
  if (MULTI_QUESTION_GAME_TYPES.includes(gameType)) {
    // Answer key lives per-question here, not as one top-level field —
    // strip it from every question in the batch. Two possible shapes:
    // `correct_option_id` (MCQ-style, Fraction Speed/Boss Challenge)
    // or `correct_answer` (typed-number-style, Equation Speed
    // Calculation) — a question only ever has one of the two.
    const { hint, questions, time_limit_seconds, ...safe } = payload;
    return {
      ...safe,
      // Section 26 (grade-band complexity): the timer itself is the
      // one honest, measurable "time pressure" knob these rounds
      // have, so it's the only property scaled here — everything
      // else about the round (question count, content) is untouched.
      time_limit_seconds: bandConfig
        ? applyTimePressure(time_limit_seconds, bandConfig)
        : time_limit_seconds,
      questions: (questions || []).map(({ correct_option_id, correct_answer, ...q }) => q),
    };
  }
  const { correct_piece_ids, correct_hotspot_id, correct_order, correct_mapping, correct_answer, hint, diagnosis, explanation, ...safe } = payload;

  // Section 26 (grade-band complexity): trim the pool's distractors
  // (never a correct piece — capDistractors always keeps every id in
  // correct_piece_ids) down to what this student's band allows.
  const poolField = DISTRACTOR_POOL_FIELD[gameType];
  if (poolField && Array.isArray(safe[poolField]) && bandConfig) {
    safe[poolField] = capDistractors(safe[poolField], correct_piece_ids, bandConfig.maxDistractors);
  }

  return safe;
};

const startGame = async (req, res) => {
  try {
    const { gameType, contentId } = req.body;
    const userId = req.userId;

    if (!gameType || !contentId) {
      return res
        .status(400)
        .json({ message: "gameType and contentId are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ message: "Invalid contentId" });
    }

    const content = await GameContent.findOne({ _id: contentId, game_type: gameType });
    if (!content) {
      return res.status(404).json({ message: "Game content not found" });
    }

    // SECURITY: same cross-grade IDOR class as startCase — verify the
    // requesting student's grade actually covers this content's concept.
    const { allowed, userGrade } = await verifyGradeAccess(userId, content.concept_id);
    if (!allowed) {
      return res.status(403).json({ message: "This content is not available for your grade" });
    }

    // Section 26 (grade-band complexity): reuses the grade
    // verifyGradeAccess already fetched, no extra query.
    const bandConfig = getGradeBandConfig(userGrade);

    const session = await QuizSession.create({
      user_id: userId,
      session_type: "game-session",
      game_type: gameType,
      content_id: content._id,
      started_at: new Date(),
    });

    res.status(201).json({
      sessionId: session._id,
      content: {
        id: content._id,
        title: content.title,
        difficulty: content.difficulty,
        payload: sanitizePayloadForClient(gameType, content.payload, bandConfig),
      },
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Checks the student's attempt against the content's correct answer.
// Correctness rule is per game_type since payload shape differs.
const checkAttempt = (gameType, payload, attempt) => {
  if (
    gameType === "MATH_FRACTION_BUILDER" ||
    gameType === "CHEMISTRY_MOLECULE_BUILDER" ||
    gameType === "MATH_GEOMETRY_BUILDER" ||
    gameType === "BIO_DIAGNOSIS"
  ) {
    // Same unordered-subset check for all four: Fraction Builder
    // picks pieces that sum to a target, Molecule Builder picks atom
    // tiles that make up a target molecule, Geometry Builder picks
    // side-length pieces that construct a target shape's perimeter,
    // and Diagnosis picks which inspected evidence cards actually
    // support the correct diagnosis (the rest are red-herring
    // symptoms) — none cares about pick order, all just need the
    // exact right multiset of tile/evidence IDs.
    const selected = [...(attempt.selectedPieceIds || [])].sort();
    const correct = [...(payload.correct_piece_ids || [])].sort();
    return (
      selected.length === correct.length &&
      selected.every((id, i) => id === correct[i])
    );
  }
  if (
    gameType === "BIO_VIRTUAL_LAB" ||
    gameType === "CS_DEBUGGING_LAB" ||
    gameType === "SOCIAL_SCIENCE_CIVIC_DECISION" ||
    gameType === "BIO_SPECIMEN_ANALYSIS"
  ) {
    // Single-choice check for all four: Virtual Lab taps the correct
    // microscope hotspot, Debugging Lab taps the one buggy code line,
    // Civic Decision picks the one most democratic/lawful response
    // to a scenario, and Specimen Analysis picks the one correct
    // classification for a specimen after inspecting its features —
    // same "did they pick the one right id" rule, just reusing the
    // hotspot field name for the classification choice.
    return attempt.selectedHotspotId === payload.correct_hotspot_id;
  }
  if (
    gameType === "MATH_EQUATION_BUILDER" ||
    gameType === "BIO_ECOSYSTEM_BALANCE" ||
    gameType === "HISTORY_TIMELINE_BUILDER" ||
    gameType === "GEOGRAPHY_ROUTE_BUILDER" ||
    gameType === "ENGLISH_WORD_FORGE" ||
    gameType === "ENGLISH_SENTENCE_BUILDER" ||
    gameType === "TAMIL_SENTENCE_BUILDER" ||
    gameType === "SOCIAL_SCIENCE_PROCESS_BUILDER" ||
    gameType === "COMMERCE_PROCESS_BUILDER" ||
    gameType === "CS_CODE_ORDER_BUILDER" ||
    gameType === "MATH_PASCAL_TRIANGLE_BUILD"
  ) {
    // Order-sensitive, unlike FRACTION_BUILDER's subset-sum check —
    // the student is arranging pieces into a sequence (an equation,
    // a cause-effect chain, a historical timeline, a route's stops,
    // a word's prefix/root/suffix morphemes, an English or Tamil
    // sentence's words in reading order, a civic or commerce
    // process's steps in the order they actually happen, scrambled
    // Python statements into correct execution order, or a Pascal's
    // Triangle row's coefficients left-to-right), not picking an
    // unordered subset.
    const placed = attempt.orderedPieceIds || [];
    const correct = payload.correct_order || [];
    return (
      placed.length === correct.length &&
      placed.every((id, i) => id === correct[i])
    );
  }
  if (
    gameType === "PHYSICS_CIRCUIT_BUILDER" ||
    gameType === "PHYSICS_MATCH" ||
    gameType === "CHEMISTRY_REACTION_LAB" ||
    gameType === "TAMIL_PROVERB_MATCH" ||
    gameType === "MATH_FRACTION_MATCH" ||
    gameType === "MATH_EQUATION_WORD_PROBLEM_MATCH" ||
    gameType === "MATH_SHAPE_MATCH" ||
    gameType === "BIO_GENETICS_SIMULATOR" ||
    gameType === "MATH_PLACE_VALUE_MATCH" ||
    gameType === "HISTORY_CAUSE_EFFECT_MATCH" ||
    gameType === "GEOGRAPHY_FEATURE_MATCH" ||
    gameType === "COMMERCE_CONCEPT_MATCH" ||
    gameType === "MATH_RATIO_MATCH" ||
    gameType === "CHEMISTRY_MATCH" ||
    gameType === "MATH_FUNCTION_MATCH" ||
    gameType === "MATH_TRIG_MATCH" ||
    gameType === "MATH_INEQUALITY_MATCH" ||
    gameType === "MATH_LINE_EQUATION_MATCH"
  ) {
    // Same mapping-equality check across all eighteen: Circuit Builder
    // assigns components to circuit slots, Magnetism Match assigns
    // each material/object card to how a magnet affects it, Reaction
    // Lab assigns predicted outcomes to reaction beakers, Proverb
    // Match assigns meanings to proverbs, Fraction Match assigns each
    // fraction card to its simplest-form/decimal equivalent, Word
    // Problem Match assigns each story scenario to the equation that
    // represents it, Shape Match assigns each shape to its matching
    // property, Genetics Simulator assigns a genotype tile to each of
    // the 4 Punnett-square grid cells, Place Value Match assigns each
    // highlighted digit to its correct place-value name, Cause &
    // Effect Match assigns each historical event to its correct
    // cause or consequence, Geography Feature Match assigns each
    // geographic fact or process to its correct description, Commerce
    // Concept Match assigns each accounting/business/economic term to
    // its correct definition, Ratio Match assigns each ratio card to
    // its simplified/equivalent form, Chemistry Match assigns each
    // material/property card to Metal or Non-Metal, Function Match
    // assigns each relation to its domain/range or function-type
    // classification, Trig Match assigns each angle to its correct
    // trig value or radian equivalent, Inequality Match assigns each
    // linear inequality to its correct solution interval, and Line
    // Equation Match assigns each line description (two points, or a
    // point plus a slope) to its correct equation — all "every slot
    // must match its correct counterpart exactly", just a different
    // fantasy each time.
    const mapping = attempt.mapping || {};
    const correct = payload.correct_mapping || {};
    const correctKeys = Object.keys(correct);
    return (
      correctKeys.length === Object.keys(mapping).length &&
      correctKeys.every((slotId) => mapping[slotId] === correct[slotId])
    );
  }
  if (gameType === "CHEMISTRY_EQUATION_BALANCER") {
    // No stored "correct answer" here, unlike every other game_type —
    // multiple scaled coefficient sets can validly balance the same
    // equation (e.g. 2:1:2 and 4:2:4), so the server computes real
    // atom-count totals per element on each side and checks equality,
    // the same way a chemistry teacher would check a student's work.
    const species = payload.species || [];
    const coefficients = attempt.coefficients || {};

    const allValid = species.every((s) => {
      const c = coefficients[s.id];
      return Number.isInteger(c) && c >= 1;
    });
    if (!allValid) return false;

    const totals = { reactant: {}, product: {} };
    for (const s of species) {
      const bucket = totals[s.side];
      if (!bucket) return false;
      const c = coefficients[s.id];
      for (const [element, count] of Object.entries(s.atoms || {})) {
        bucket[element] = (bucket[element] || 0) + count * c;
      }
    }
    const elements = new Set([
      ...Object.keys(totals.reactant),
      ...Object.keys(totals.product),
    ]);
    for (const el of elements) {
      if ((totals.reactant[el] || 0) !== (totals.product[el] || 0)) return false;
    }
    return true;
  }
  if (gameType === "MATH_FRACTION_STRATEGY_CHALLENGE") {
    // Like Equation Balancer, there's no single stored "correct"
    // answer — several different subsets of pieces can validly sum to
    // the target, so the server adds up the real fraction values of
    // whatever the student picked and checks the result against the
    // target, the same way a teacher would check the arithmetic. What
    // makes this "strategy" rather than another Fraction Builder is
    // the move budget: picking more pieces than max_moves fails the
    // attempt even if the sum is eventually right, so the student has
    // to plan which pieces get there in the fewest moves instead of
    // just throwing pieces at it until something sticks.
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const addFractions = (a, b) => {
      const numerator = a.numerator * b.denominator + b.numerator * a.denominator;
      const denominator = a.denominator * b.denominator;
      return { numerator, denominator };
    };
    const reduce = (f) => {
      if (f.numerator === 0) return { numerator: 0, denominator: 1 };
      const divisor = gcd(Math.abs(f.numerator), f.denominator);
      return { numerator: f.numerator / divisor, denominator: f.denominator / divisor };
    };

    const selectedIds = attempt.selectedPieceIds || [];
    if (selectedIds.length === 0 || selectedIds.length > payload.max_moves) {
      return false;
    }
    const pieceById = Object.fromEntries((payload.pieces || []).map((p) => [p.id, p]));
    if (!selectedIds.every((id) => pieceById[id])) return false;

    const sum = selectedIds.reduce(
      (acc, id) => addFractions(acc, pieceById[id]),
      { numerator: 0, denominator: 1 },
    );
    const reducedSum = reduce(sum);
    const reducedTarget = reduce(payload.target);
    return (
      reducedSum.numerator === reducedTarget.numerator &&
      reducedSum.denominator === reducedTarget.denominator
    );
  }
  if (gameType === "MATH_GEOMETRY_STRATEGY_CHALLENGE") {
    // Same "no single stored answer" shape as Fraction Strategy
    // Challenge, applied to Geometry Builder's domain instead of
    // fractions: several different subsets of side-length pieces can
    // validly sum to the target perimeter, so the server adds up the
    // real lengths of whatever the student picked and checks against
    // the target — the same way a teacher would check the arithmetic.
    // The max_moves budget is what makes this "strategy" rather than
    // a reskinned Geometry Builder: picking more pieces than the
    // budget fails the attempt even if the sum eventually lands
    // right, so the student has to plan the fewest-piece combo
    // instead of throwing pieces at it until something sticks.
    const selectedIds = attempt.selectedPieceIds || [];
    if (selectedIds.length === 0 || selectedIds.length > payload.max_moves) {
      return false;
    }
    const pieceById = Object.fromEntries((payload.pieces || []).map((p) => [p.id, p]));
    if (!selectedIds.every((id) => pieceById[id])) return false;

    const sum = selectedIds.reduce((acc, id) => acc + pieceById[id].length, 0);
    return Math.abs(sum - payload.target_perimeter) < 1e-9;
  }
  if (gameType === "MATH_NUMBER_MACHINE" || gameType === "PHYSICS_FORCE_SIMULATOR") {
    // Genuinely different check shape from every other game_type so
    // far: those all compare an id/mapping/sequence the student
    // picked against something structured. Both of these end in a
    // plain numeric answer instead — Number Machine's "x + 5 = 12"
    // dialed in as 7, and Force Simulator's F = ma prediction typed
    // in as an acceleration value after the student has explored the
    // force/mass sliders — so both get the same strict numeric
    // equality check. The interaction that gets the student to that
    // number (a dial vs. a parameter-exploration simulator) is what's
    // actually different, not the scoring.
    return Number(attempt.answer) === Number(payload.correct_answer);
  }
  if (gameType === "MATH_EQUATION_BALANCE_STRATEGY") {
    // Different from every other check so far in one important way:
    // there's no stored "correct answer" to compare against at all —
    // not an id, not a number. The server literally re-runs the
    // student's chosen operations on the starting equation (same
    // "do the same thing to both sides" rule taught in Number
    // Machine) and checks where they landed. Solved means the
    // equation reduced to "1x + 0 = c" — the student don't need to
    // know what c is, the arithmetic itself proves it. Same move-
    // budget spirit as Fraction Strategy Challenge, applied here to
    // equation-balancing instead of piece-picking.
    const opsById = Object.fromEntries((payload.available_ops || []).map((o) => [o.id, o]));
    const sequence = attempt.operationSequence || [];
    if (sequence.length === 0 || sequence.length > payload.max_moves) return false;
    if (!sequence.every((id) => opsById[id])) return false;

    let { a, b, c } = payload.initial_equation;
    for (const opId of sequence) {
      const { op, value } = opsById[opId];
      if (op === "add") {
        b += value;
        c += value;
      } else if (op === "subtract") {
        b -= value;
        c -= value;
      } else if (op === "multiply") {
        a *= value;
        b *= value;
        c *= value;
      } else if (op === "divide") {
        if (value === 0) return false;
        a /= value;
        b /= value;
        c /= value;
      } else {
        return false;
      }
    }
    return Math.abs(a - 1) < 1e-9 && Math.abs(b) < 1e-9;
  }
  return false;
};

// Scores a batch of quick-fire questions in one go — used only by
// MULTI_QUESTION_GAME_TYPES. Unlike checkAttempt (one build/match/order
// check -> one boolean), this returns partial credit so XP can scale
// with how many of the round's questions were answered correctly,
// same as a regular multi-question quiz.
const checkMultiQuestionAttempt = (payload, attempt) => {
  const questions = payload.questions || [];
  const answers = attempt.answers || [];
  const selectedByQuestionId = answers.reduce((acc, a) => {
    // Two submission shapes share this one path: `selectedOptionId`
    // for MCQ-style rounds (Fraction Speed/Boss Challenge), or
    // `answerValue` for typed-number rounds (Equation Speed
    // Calculation) — each question below only ever compares against
    // whichever answer-key field it actually has.
    acc[a.questionId] = a.selectedOptionId !== undefined ? a.selectedOptionId : a.answerValue;
    return acc;
  }, {});

  let correctCount = 0;
  for (const q of questions) {
    const submitted = selectedByQuestionId[q.id];
    const isRight =
      q.correct_option_id !== undefined
        ? submitted === q.correct_option_id
        : q.correct_answer !== undefined
          ? Number(submitted) === Number(q.correct_answer)
          : false;
    if (isRight) correctCount += 1;
  }
  const totalCount = questions.length;

  return {
    isCorrect: totalCount > 0 && correctCount === totalCount,
    correctCount,
    totalCount,
  };
};

// Records one attempt on the current (still-open) game session. A
// student can retry before completing — only the latest attempt is
// used for XP/mastery when completeGame is called.
const submitGameAttempt = async (req, res) => {
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
    if (session.completed_at) {
      return res
        .status(400)
        .json({ message: "This session is already completed" });
    }

    const content = await GameContent.findById(session.content_id);
    if (!content) {
      return res.status(404).json({ message: "Game content not found" });
    }

    const scoreResult = MULTI_QUESTION_GAME_TYPES.includes(session.game_type)
      ? checkMultiQuestionAttempt(content.payload, req.body)
      : (() => {
          const isCorrect = checkAttempt(session.game_type, content.payload, req.body);
          return { isCorrect, correctCount: isCorrect ? 1 : 0, totalCount: 1 };
        })();

    session.game_payload = {
      ...req.body,
      is_correct: scoreResult.isCorrect,
      correct_count: scoreResult.correctCount,
      total_count: scoreResult.totalCount,
      attempted_at: new Date(),
    };
    await session.save();

    // Section 26 (grade-band complexity): hint reveal on a wrong
    // attempt is gated per band (EXPERT gets none) rather than always
    // shown just because the content happens to have one authored.
    const user = await User.findById(userId).select("grade");
    const bandConfig = getGradeBandConfig(user?.grade);
    const hintAllowed = !scoreResult.isCorrect && bandConfig.hintsEnabled;

    res.status(200).json({
      isCorrect: scoreResult.isCorrect,
      correctCount: scoreResult.correctCount,
      totalCount: scoreResult.totalCount,
      hint: hintAllowed ? content.payload.hint || null : null,
      // Reveal-on-correct fields. `diagnosis` is BIO_DIAGNOSIS-only.
      // `explanation` is shared by BIO_DIAGNOSIS (diagnosis reasoning)
      // and BIO_SPECIMEN_ANALYSIS (why the chosen classification is
      // correct, the "explain reasoning" payoff at the end of its
      // inspect -> observe -> identify -> classify loop) — every
      // other game_type's payload has neither field, so this stays a
      // no-op (both null) for every other existing game. Unlike the
      // hint above, these are never gated by grade band — they're the
      // payoff for a *correct* answer, not a crutch for a wrong one,
      // so EXPERT-band students still get the full explanation.
      diagnosis: scoreResult.isCorrect ? content.payload.diagnosis || null : null,
      explanation: scoreResult.isCorrect ? content.payload.explanation || null : null,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// BUGFIX (production bug 1 - "This session is already completed" shown
// as a fatal error): a session's *first* completeGame call already
// wrote everything a caller needs onto the session itself
// (xp_awarded, streak_counted, sync_status) plus the mastery doc it
// updated. A second/duplicate completion request for the same
// session (fast double-click on "Claim Reward", a client retry after
// a slow-but-successful first response, etc.) reuses that stored
// result instead of recomputing or re-awarding anything — XP and
// mastery are only ever written once, on the request that actually
// wins the atomic claim in completeGame below.
const buildAlreadyCompletedResponse = async (session, userId) => {
  const content = session.content_id
    ? await GameContent.findById(session.content_id).select("concept_id")
    : null;
  const mastery = content
    ? await UserConceptMastery.findOne({
        user_id: userId,
        concept_id: content.concept_id,
      }).select("concept_id state")
    : null;
  const user = await User.findById(userId).select("streak_count");
  const isCorrect = Boolean(session.game_payload?.is_correct);
  const correctCount = session.game_payload?.correct_count ?? (isCorrect ? 1 : 0);
  const totalCount = session.game_payload?.total_count ?? 1;

  return {
    isCorrect,
    xpAwarded: session.xp_awarded || 0,
    // The daily cap was already correctly applied (or not) on the
    // request that actually completed the session; a duplicate never
    // re-checks it and never re-awards XP either way.
    xpCapped: false,
    isPerfectQuiz: totalCount > 0 && correctCount === totalCount,
    streakMultiplier: 1,
    newStreak: user?.streak_count ?? 0,
    masteryUpdate: mastery
      ? {
          concept_id: mastery.concept_id,
          new_state: mastery.state,
          previous_state: mastery.state,
          changed: false,
        }
      : null,
    performanceSync: session.sync_status,
    // Additive-only: existing callers only read the fields above and
    // keep working unchanged; a caller that wants to know this wasn't
    // a fresh completion can check this flag.
    alreadyCompleted: true,
  };
};

// Mirrors quizControllers.completeQuiz's XP + mastery flow, but for a
// single-concept game session instead of a multi-question quiz.
const completeGame = async (req, res) => {
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
      // Plain duplicate request arriving after the session was
      // genuinely already completed (e.g. a client retry, or a
      // student re-opening an already-finished session) — reuse the
      // stored result instead of a fatal error. See
      // buildAlreadyCompletedResponse above; this never re-awards
      // XP/mastery. Built before aborting the transaction so a read
      // error here still lands in the catch block below with a
      // transaction that's still in a normal abortable state.
      const alreadyCompleted = await buildAlreadyCompletedResponse(session, userId);
      await dbSession.abortTransaction();
      return res.status(200).json(alreadyCompleted);
    }
    if (!session.game_payload || session.game_payload.is_correct === undefined) {
      await dbSession.abortTransaction();
      return res.status(400).json({ message: "No attempt submitted yet" });
    }

    // BUGFIX (production bug 1 - duplicate completion race): two
    // near-simultaneous completion requests for the same session
    // (fast double-click on "Claim Reward", a slow first response
    // that the client retries, etc.) can both pass the plain
    // `if (session.completed_at)` check above if they read the
    // session at nearly the same instant, before either has written
    // completed_at back. This atomic conditional update — flipping
    // completed_at from null to now in the same operation that
    // requires it still be null — closes that window: MongoDB
    // guarantees at most one such update can succeed for a given
    // document, so at most one request can ever proceed past this
    // point for a given session, regardless of timing.
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
      // exactly like the plain duplicate path above. Built before
      // aborting, for the same reason as above.
      const winningSession = await QuizSession.findById(sessionId);
      const alreadyCompleted = await buildAlreadyCompletedResponse(winningSession, userId);
      await dbSession.abortTransaction();
      return res.status(200).json(alreadyCompleted);
    }
    session.completed_at = completionTimestamp;

    const content = await GameContent.findById(session.content_id).session(dbSession);
    const isCorrect = session.game_payload.is_correct;
    // Older sessions (pre-multi-question) never set these — default to
    // the 1-question shape so calculateXP below stays correct for
    // every existing game_type without a special case.
    const correctCount = session.game_payload.correct_count ?? (isCorrect ? 1 : 0);
    const totalCount = session.game_payload.total_count ?? 1;

    let mastery = await UserConceptMastery.findOne({
      user_id: userId,
      concept_id: content.concept_id,
    }).session(dbSession);

    if (!mastery) {
      mastery = new UserConceptMastery({
        user_id: userId,
        concept_id: content.concept_id,
        state: "weak",
        correct_streak: 0,
      });
    }

    // Phase 6B (P1-3): captured before applyMasteryTransition overwrites
    // mastery.state below, purely so the response can tell the truth
    // about whether this attempt actually changed anything — the
    // transition algorithm itself (thresholds, weak/learning/strong
    // logic) is untouched.
    const previousMasteryState = mastery.state;
    const result = applyMasteryTransition(mastery.state, isCorrect, mastery.correct_streak);
    mastery.state = result.state;
    mastery.correct_streak = result.correct_streak;
    mastery.last_attempted_at = new Date();
    await mastery.save({ session: dbSession });

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
      } else if (diffDays > 1) {
        user.streak_count = 1;
        streakCounted = true;
      }
    }

    // For single-check game_types this is still effectively a
    // 1-question "quiz" (correctCount/totalCount default to 1/1
    // above). For multi-question game_types (Speed Challenge), this
    // now scales XP with how many of the round's questions were
    // right — same formula, just real counts instead of 0-or-1.
    const { finalXP: rawXP, isPerfect, multiplier } = calculateXP(
      correctCount,
      totalCount,
      user.streak_count,
    );

    // Daily XP cap — same rationale as the case-investigation cap in
    // quizControllers.js: unlimited replay for practice is fine,
    // unlimited XP from replaying the same challenge is not.
    let xpCapped = false;
    let finalXP = rawXP;
    const completionsToday = await countCompletionsToday(
      userId,
      "content_id",
      session.content_id,
      dbSession,
    );
    if (completionsToday >= DAILY_XP_CAP_PER_CONTENT) {
      finalXP = 0;
      xpCapped = true;
    }

    user.last_active_date = today;
    user.xp_total += finalXP;
    await user.save({ session: dbSession });

    // completed_at was already set atomically by the claim above —
    // not reassigned here, so the timestamp reflects the moment this
    // request won the race, not whenever this later save happens to run.
    session.xp_awarded = finalXP;
    session.streak_counted = streakCounted;
    await session.save({ session: dbSession });

    // Teacher assignments (Section 26): a correct completion of ANY
    // playable content for the assigned concept satisfies the
    // assignment — not just the specific GameContent doc the teacher
    // happened to see when assigning — since assignments are
    // concept-level, not content-level (see Assignment.js). Only
    // flips pending -> completed on a genuinely correct attempt, same
    // bar as earning mastery credit/XP for it; a wrong attempt still
    // leaves the assignment open so the student can try again.
    if (isCorrect) {
      await Assignment.updateMany(
        {
          concept_id: content.concept_id,
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
    const syncResult = await syncSessionToExcel(session._id);

    res.status(200).json({
      isCorrect,
      xpAwarded: finalXP,
      xpCapped,
      isPerfectQuiz: isPerfect,
      streakMultiplier: multiplier,
      newStreak: user.streak_count,
      // previous_state/changed are additive (Phase 6B, P1-3) — concept_id
      // and new_state are unchanged from before, so any existing caller
      // reading only those two fields keeps working exactly as it did.
      masteryUpdate: {
        concept_id: content.concept_id,
        new_state: mastery.state,
        previous_state: previousMasteryState,
        changed: previousMasteryState !== mastery.state,
      },
      performanceSync: syncResult.status,
    });
  } catch (err) {
    await dbSession.abortTransaction();
    sendError(res, err);
  } finally {
    dbSession.endSession();
  }
};

// ---------- Game Selection Engine (Section 17/18) ----------
// The 14 game_types are scattered across subjects/grades one-to-many
// with GameContent (grade access already resolved via
// getGradeConceptIds, same walk getRecommendedCase uses for Case).
// These two endpoints turn that raw content into "what should this
// student see/play next" without any subject having to special-case
// itself — the registry (gameTypeRegistry.js) is the only place that
// knows which game_type belongs to which subject.

// GET /api/games/catalog — every game_type the student's grade has
// real content for, grouped by subject in registry order, so Home.jsx
// can render "browse all games" without any hardcoded per-grade list.
const getGameCatalog = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("grade");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const gradeConceptIds = await getGradeConceptIds(user.grade);

    const counts = await GameContent.aggregate([
      { $match: { concept_id: { $in: gradeConceptIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: "$game_type", count: { $sum: 1 }, firstAddedAt: { $min: "$createdAt" } } },
    ]);
    const countByType = counts.reduce((acc, c) => {
      acc[c._id] = c.count;
      return acc;
    }, {});
    // Phase 7 ("New Games"): a game_type counts as new if its earliest
    // GameContent doc for this grade was created in the last 14 days —
    // a real timestamp already on every doc, not an invented flag, so
    // this can never drift into permanently-new or fake badges.
    const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const firstAddedByType = counts.reduce((acc, c) => {
      acc[c._id] = c.firstAddedAt;
      return acc;
    }, {});

    // GAME_TYPES (registry order) filtered down to only what this
    // grade actually has content for, then grouped by subject —
    // avoids showing a Home card for a game_type with zero levels.
    const bySubject = {};
    for (const { game_type, subject, label } of GAME_TYPES) {
      const count = countByType[game_type];
      if (!count) continue;
      if (!bySubject[subject]) bySubject[subject] = [];
      const firstAddedAt = firstAddedByType[game_type];
      const isNew = firstAddedAt ? now - new Date(firstAddedAt).getTime() < NEW_WINDOW_MS : false;
      bySubject[subject].push({ game_type, label, count, isNew });
    }

    const catalog = Object.entries(bySubject).map(([subject, gameTypes]) => ({
      subject,
      gameTypes,
    }));

    res.status(200).json({ catalog });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/games/recommended — mirrors caseControllers.getRecommendedCase's
// weak -> learning -> fallback mastery walk, but across every
// game_type's GameContent instead of just Case, so "what should I play
// next" isn't limited to Biology.
const getRecommendedGame = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("grade");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const gradeConceptIds = await getGradeConceptIds(user.grade);

    const masteries = await UserConceptMastery.find({
      user_id: req.userId,
      concept_id: { $in: gradeConceptIds },
    }).select("concept_id state");

    const weakConceptIds = masteries.filter((m) => m.state === "weak").map((m) => m.concept_id);
    const learningConceptIds = masteries
      .filter((m) => m.state === "learning")
      .map((m) => m.concept_id);
    const strongConceptIds = masteries.filter((m) => m.state === "strong").map((m) => m.concept_id);

    // Every query is scoped to KNOWN_GAME_TYPES so a stale/unregistered
    // game_type left behind in the DB (e.g. a retired mechanic) can
    // never be recommended, even if a GameContent doc for it still
    // exists.
    //
    // Within a mastery bucket, adaptive mechanic selection (doc
    // Section 3/4) tries the tier that matches the student's mastery
    // state first (weak->GUIDED, learning->PRACTICE, strong->ADVANCED),
    // then falls back to *any* registered mechanic for that bucket's
    // concepts so a missing preferred tier never results in no
    // recommendation or a jump to an unrelated concept.
    const findBestContent = async (conceptIds, preferredTier) => {
      if (!conceptIds || !conceptIds.length) return null;

      if (preferredTier) {
        const tierGameTypes = KNOWN_GAME_TYPES.filter((gt) => GAME_TYPE_TO_TIER[gt] === preferredTier);
        const tiered = await GameContent.findOne({
          concept_id: { $in: conceptIds },
          game_type: { $in: tierGameTypes },
        })
          .sort({ createdAt: -1 })
          .select("game_type title difficulty concept_id");
        if (tiered) return tiered;
      }

      return GameContent.findOne({
        concept_id: { $in: conceptIds },
        game_type: { $in: KNOWN_GAME_TYPES },
      })
        .sort({ createdAt: -1 })
        .select("game_type title difficulty concept_id");
    };

    let content = await findBestContent(weakConceptIds, MASTERY_STATE_TO_PREFERRED_TIER.weak);
    let reason = "weak-concept";

    if (!content) {
      content = await findBestContent(learningConceptIds, MASTERY_STATE_TO_PREFERRED_TIER.learning);
      reason = "learning-concept";
    }

    if (!content) {
      content = await findBestContent(strongConceptIds, MASTERY_STATE_TO_PREFERRED_TIER.strong);
      reason = "strong-concept";
    }

    if (!content) {
      content = await GameContent.findOne({
        concept_id: { $in: gradeConceptIds },
        game_type: { $in: KNOWN_GAME_TYPES },
      })
        .sort({ createdAt: -1 })
        .select("game_type title difficulty concept_id");
      reason = "fallback-any-content";
    }

    if (!content) {
      return res.status(404).json({ message: "No games available yet" });
    }

    // Phase 6C-C: this recommendation can legitimately point at content the
    // student already played (see the "reason" comment above — this is a
    // personalized pick, not a guaranteed-new curriculum-next item).
    // Completion is tracked precisely at the GameContent-doc level via
    // QuizSession (session_type: "game-session", content_id, completed_at)
    // — the same fields startGame/completeGame already write — so this is
    // the exact, existing source of truth rather than a new signal.
    // Deliberately NOT derived from mastery state: mastery can be "strong"
    // for a concept the student has never actually played this specific
    // content for, and the ticket's truth rule forbids using mastery as a
    // stand-in for completion.
    const alreadyCompleted = await QuizSession.exists({
      user_id: req.userId,
      session_type: "game-session",
      content_id: content._id,
      completed_at: { $ne: null },
    });

    res.status(200).json({
      gameType: content.game_type,
      subject: GAME_TYPE_TO_SUBJECT[content.game_type] || null,
      label: GAME_TYPE_TO_LABEL[content.game_type] || content.game_type,
      mechanicTier: GAME_TYPE_TO_TIER[content.game_type] || null,
      title: content.title,
      difficulty: content.difficulty,
      reason,
      contentId: content._id,
      alreadyCompleted: Boolean(alreadyCompleted),
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  getGameContentList,
  startGame,
  submitGameAttempt,
  completeGame,
  getGameCatalog,
  getRecommendedGame,
};
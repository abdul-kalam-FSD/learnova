const { scoreSession } = require("../../src/utils/quizStats");

describe("scoreSession", () => {
  test("scores a quiz/case session from its questions array", () => {
    const session = {
      session_type: "case-investigation",
      questions: [{ is_correct: true }, { is_correct: false }, { is_correct: true }],
    };
    expect(scoreSession(session)).toEqual({ correct: 2, total: 3 });
  });

  test("an empty quiz/case session scores 0/0", () => {
    const session = { session_type: "quick-5min", questions: [] };
    expect(scoreSession(session)).toEqual({ correct: 0, total: 0 });
  });

  test("scores a single-check game session (e.g. BIO_DIAGNOSIS) from game_payload, not questions", () => {
    // Regression test: single-check game types never populate
    // `questions` — completeGame stores correctness on game_payload
    // instead (see gameControllers.js). Reading `session.questions`
    // here previously always returned 0/0 for every game session,
    // silently zeroing out accuracy for all 54 registered game_types
    // and making the "Sharp Shooter" achievement unearnable for any
    // student who only plays games.
    const session = {
      session_type: "game-session",
      game_type: "BIO_DIAGNOSIS",
      questions: [], // always empty for game sessions — must be ignored
      game_payload: { is_correct: true },
    };
    expect(scoreSession(session)).toEqual({ correct: 1, total: 1 });
  });

  test("scores an incorrect single-check game session as 0/1, not 0/0", () => {
    const session = {
      session_type: "game-session",
      game_type: "MATH_FRACTION_BUILDER",
      questions: [],
      game_payload: { is_correct: false },
    };
    expect(scoreSession(session)).toEqual({ correct: 0, total: 1 });
  });

  test("scores a multi-question game session (Speed/Boss Challenge) from correct_count/total_count", () => {
    const session = {
      session_type: "game-session",
      game_type: "MATH_FRACTION_SPEED_CHALLENGE",
      questions: [],
      game_payload: { is_correct: false, correct_count: 3, total_count: 5 },
    };
    expect(scoreSession(session)).toEqual({ correct: 3, total: 5 });
  });

  test("falls back to the 1-question shape for an older game session missing correct_count/total_count", () => {
    // Mirrors completeGame's own fallback for pre-multi-question
    // sessions — must never drift from how XP was actually awarded.
    const session = {
      session_type: "game-session",
      game_type: "BIO_SPECIMEN_ANALYSIS",
      questions: [],
      game_payload: { is_correct: true },
    };
    expect(scoreSession(session)).toEqual({ correct: 1, total: 1 });
  });

  test("a game session with no game_payload at all scores 0/1 rather than throwing", () => {
    const session = {
      session_type: "game-session",
      game_type: "BIO_VIRTUAL_LAB",
      questions: [],
      game_payload: undefined,
    };
    expect(scoreSession(session)).toEqual({ correct: 0, total: 1 });
  });
});

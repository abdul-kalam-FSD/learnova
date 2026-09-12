const { projectResultRow } = require("../../src/controllers/adminControllers");

// Regression test for a real bug found during audit: Admin Results /
// Excel export computed accuracy from `session.questions`, which is
// ALWAYS an empty array for session_type "game-session" (games store
// their outcome in game_payload instead — see QuizzSession.js). Every
// completed game therefore reported 0/0 correct and 0% accuracy in
// the admin dashboard and the Excel export, and Subject/Chapter/Game
// were missing entirely despite being required fields.

function baseUser() {
  return { name: "Asha K", email: "asha@example.com", grade: 8 };
}

describe("projectResultRow — game-session rows", () => {
  test("reads accuracy from game_payload, not the empty questions array", () => {
    const session = {
      _id: "sess1",
      session_type: "game-session",
      game_type: "MATH_FRACTION_BUILDER",
      questions: [], // always empty for game sessions
      game_payload: { is_correct: true, correct_count: 1, total_count: 1 },
      completed_at: new Date("2026-09-01"),
      xp_awarded: 30,
      user: baseUser(),
      gameContent: { title: "Fraction Builder — Level 3" },
      gameSubject: { name: "Mathematics" },
      gameChapter: { title: "Fractions" },
    };

    const row = projectResultRow(session);

    expect(row.correctCount).toBe(1);
    expect(row.totalQuestions).toBe(1);
    expect(row.accuracy).toBe(100);
    expect(row.subject).toBe("Mathematics");
    expect(row.chapter).toBe("Fractions");
    expect(row.gameTitle).toBe("Fraction Builder — Level 3");
    expect(row.gameType).toBe("MATH_FRACTION_BUILDER");
  });

  test("multi-question game (Speed Challenge) scales accuracy correctly", () => {
    const session = {
      _id: "sess2",
      session_type: "game-session",
      game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE",
      questions: [],
      game_payload: { is_correct: false, correct_count: 1, total_count: 2 },
      completed_at: new Date("2026-09-01"),
      xp_awarded: 10,
      user: baseUser(),
      gameContent: { title: "Ohm's Law Speed Challenge" },
      gameSubject: { name: "Physics" },
      gameChapter: { title: "Current Electricity" },
    };

    const row = projectResultRow(session);

    expect(row.correctCount).toBe(1);
    expect(row.totalQuestions).toBe(2);
    expect(row.accuracy).toBe(50);
  });

  test("falls back to 0/0 (not a crash) when game_payload is missing", () => {
    const session = {
      _id: "sess3",
      session_type: "game-session",
      game_type: "MATH_FRACTION_BUILDER",
      questions: [],
      game_payload: undefined,
      completed_at: new Date(),
      xp_awarded: 0,
      user: baseUser(),
    };

    const row = projectResultRow(session);

    expect(row.totalQuestions).toBe(1);
    expect(row.correctCount).toBe(0);
    expect(row.accuracy).toBe(0);
    expect(row.subject).toBeNull();
  });
});

describe("projectResultRow — quiz/case rows (unchanged behavior)", () => {
  test("still computes accuracy from the questions array", () => {
    const session = {
      _id: "sess4",
      session_type: "weak-concept-targeted",
      questions: [
        { is_correct: true },
        { is_correct: true },
        { is_correct: false },
      ],
      completed_at: new Date(),
      xp_awarded: 20,
      user: baseUser(),
    };

    const row = projectResultRow(session);

    expect(row.totalQuestions).toBe(3);
    expect(row.correctCount).toBe(2);
    expect(row.accuracy).toBe(67);
    // Quiz/case sessions span multiple concepts — no single
    // subject/chapter is attributed to them (documented limitation).
    expect(row.subject).toBeNull();
    expect(row.chapter).toBeNull();
  });

  test("case-investigation sessions still label from the case title", () => {
    const session = {
      _id: "sess5",
      session_type: "case-investigation",
      questions: [{ is_correct: true }],
      case: { title: "The Case of the Wilting Plant" },
      completed_at: new Date(),
      xp_awarded: 15,
      user: baseUser(),
    };

    const row = projectResultRow(session);

    expect(row.sessionTypeLabel).toBe("The Case of the Wilting Plant");
    expect(row.gameTitle).toBeNull();
  });
});

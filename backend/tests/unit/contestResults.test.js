// Pure unit tests for contest result rows + ranking. No database.
jest.mock("../../src/models/QuizzSession");
jest.mock("../../src/models/User");
jest.mock("../../src/models/Subject");
jest.mock("../../src/models/Chapter");
jest.mock("../../src/models/GameContent");

const { buildRow, rankParticipants, summarize, RANKING_RULE } = require("../../src/utils/contestResults");

const START = new Date("2030-01-01T10:00:00.000Z");
const at = (minutes) => new Date(START.getTime() + minutes * 60 * 1000);
const ctx = { challengeCount: 3, contestStart: START };

// A per-student aggregate exactly as the pipeline's $group produces it.
const group = (id, o = {}) => ({
  _id: id, started: 0, completed: 0, solved: 0, correctAnswers: 0, totalAnswers: 0, xp: 0, attempts: 0,
  firstStartedAt: at(1), lastCompletedAt: null, lastSolvedAt: null, ...o,
});
const row = (id, name, o = {}) => ({ ...buildRow(group(id, o), ctx), name });

describe("buildRow", () => {
  test("derives counts, accuracy, completion %, elapsed time and XP from the aggregate", () => {
    const r = buildRow(group("s1", { started: 3, completed: 3, solved: 2, correctAnswers: 7, totalAnswers: 9, xp: 55, attempts: 5, lastCompletedAt: at(40), lastSolvedAt: at(30) }), ctx);
    expect(r).toMatchObject({
      studentId: "s1", status: "COMPLETED", challengeCount: 3, challengesStarted: 3, challengesCompleted: 3,
      challengesSolved: 2, correctAnswers: 7, totalAnswers: 9, accuracy: 77.8, completionPercent: 100,
      xpEarned: 55, attempts: 5, elapsedSeconds: 30 * 60,
    });
    expect(r.rank).toBeNull();
  });

  test("status: nothing finished = IN_PROGRESS, some = PARTIAL, all = COMPLETED", () => {
    expect(buildRow(group("a", { started: 1 }), ctx).status).toBe("IN_PROGRESS");
    expect(buildRow(group("b", { started: 2, completed: 1 }), ctx).status).toBe("PARTIAL");
    expect(buildRow(group("c", { started: 3, completed: 3 }), ctx).status).toBe("COMPLETED");
  });

  test("zero XP (e.g. the existing daily cap) is preserved as 0, not treated as missing", () => {
    expect(buildRow(group("a", { started: 1, completed: 1, solved: 1, xp: 0, lastSolvedAt: at(5) }), ctx).xpEarned).toBe(0);
  });

  test("no solved game -> no elapsed time; no answers -> accuracy is null (never NaN)", () => {
    const r = buildRow(group("a", { started: 1 }), ctx);
    expect(r.elapsedSeconds).toBeNull();
    expect(r.accuracy).toBeNull();
    expect(Number.isNaN(r.completionPercent)).toBe(false);
  });

  test("elapsed time never goes negative (clock skew / bad data)", () => {
    expect(buildRow(group("a", { solved: 1, lastSolvedAt: at(-5) }), ctx).elapsedSeconds).toBe(0);
  });

  test("a contest with no challenges can't divide by zero", () => {
    const r = buildRow(group("a", { started: 1 }), { challengeCount: 0, contestStart: START });
    expect(r.completionPercent).toBe(0);
  });
});

describe("rankParticipants — the documented rule", () => {
  test("rule metadata matches what is implemented", () => {
    expect(RANKING_RULE.order.map((o) => `${o.field}:${o.direction}`)).toEqual([
      "challengesSolved:desc", "correctAnswers:desc", "elapsedSeconds:asc",
    ]);
  });

  test("more games solved ranks higher, regardless of speed or XP", () => {
    const rows = rankParticipants([
      row("fast", "Fast", { started: 1, completed: 1, solved: 1, correctAnswers: 1, totalAnswers: 1, xp: 999, lastSolvedAt: at(1) }),
      row("two", "Two", { started: 2, completed: 2, solved: 2, correctAnswers: 2, totalAnswers: 2, xp: 0, lastSolvedAt: at(50) }),
    ]);
    expect(rows.map((r) => [r.studentId, r.rank])).toEqual([["two", 1], ["fast", 2]]);
  });

  test("equal solved: more correct answers wins (partial credit on multi-question games)", () => {
    const rows = rankParticipants([
      row("a", "A", { started: 2, completed: 2, solved: 1, correctAnswers: 2, totalAnswers: 6, lastSolvedAt: at(5) }),
      row("b", "B", { started: 2, completed: 2, solved: 1, correctAnswers: 5, totalAnswers: 6, lastSolvedAt: at(50) }),
    ]);
    expect(rows.map((r) => r.studentId)).toEqual(["b", "a"]);
  });

  test("equal solved and answers: the sooner finisher wins", () => {
    const rows = rankParticipants([
      row("slow", "Slow", { solved: 2, completed: 2, started: 2, correctAnswers: 2, lastSolvedAt: at(40) }),
      row("quick", "Quick", { solved: 2, completed: 2, started: 2, correctAnswers: 2, lastSolvedAt: at(10) }),
    ]);
    expect(rows.map((r) => [r.studentId, r.rank])).toEqual([["quick", 1], ["slow", 2]]);
  });

  test("ties share a rank and the next rank skips (1, 2, 2, 4)", () => {
    const same = { solved: 2, completed: 2, started: 2, correctAnswers: 2, lastSolvedAt: at(20) };
    const rows = rankParticipants([
      row("top", "Top", { solved: 3, completed: 3, started: 3, correctAnswers: 3, lastSolvedAt: at(30) }),
      row("t1", "Tie One", same),
      row("t2", "Tie Two", same),
      row("last", "Last", { solved: 1, completed: 1, started: 1, correctAnswers: 1, lastSolvedAt: at(5) }),
    ]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  test("tied students are listed in a stable order (name, then id)", () => {
    const same = { solved: 1, completed: 1, started: 1, correctAnswers: 1, lastSolvedAt: at(9) };
    const rows = rankParticipants([row("z", "Zed", same), row("b2", "bob", same), row("b1", "Bob", same), row("a", "Amy", same)]);
    expect(rows.map((r) => r.studentId)).toEqual(["a", "b1", "b2", "z"]);
    expect(new Set(rows.map((r) => r.rank))).toEqual(new Set([1]));
  });

  test("the result is identical whatever order the rows arrive in", () => {
    const base = [
      row("a", "Ann", { solved: 3, completed: 3, started: 3, correctAnswers: 3, lastSolvedAt: at(30) }),
      row("b", "Ben", { solved: 3, completed: 3, started: 3, correctAnswers: 3, lastSolvedAt: at(20) }),
      row("c", "Cat", { solved: 1, completed: 1, started: 1, correctAnswers: 1, lastSolvedAt: at(5) }),
      row("d", "Dan", { solved: 1, completed: 1, started: 1, correctAnswers: 1, lastSolvedAt: at(5) }),
      row("e", "Eve", { started: 1 }),
      row("f", "Fay", { started: 2, completed: 2, correctAnswers: 1, totalAnswers: 2 }),
    ];
    const expected = JSON.stringify(rankParticipants(base));
    for (let i = 0; i < 20; i++) {
      const shuffled = [...base].sort(() => Math.random() - 0.5);
      expect(JSON.stringify(rankParticipants(shuffled))).toBe(expected);
    }
  });

  test("students with no solved game are listed AFTER ranked students and get no rank", () => {
    const rows = rankParticipants([
      row("started", "Started", { started: 1 }),
      row("wrong", "Wrong", { started: 3, completed: 3, solved: 0, correctAnswers: 1, totalAnswers: 3 }),
      row("solver", "Solver", { started: 1, completed: 1, solved: 1, correctAnswers: 1, lastSolvedAt: at(9) }),
    ]);
    expect(rows.map((r) => [r.studentId, r.rank])).toEqual([["solver", 1], ["wrong", null], ["started", null]]);
  });

  test("zero XP does not affect ranking", () => {
    const rows = rankParticipants([
      row("capped", "Capped", { started: 1, completed: 1, solved: 1, correctAnswers: 1, xp: 0, lastSolvedAt: at(5) }),
      row("rich", "Rich", { started: 1, completed: 1, solved: 1, correctAnswers: 1, xp: 500, lastSolvedAt: at(9) }),
    ]);
    expect(rows.map((r) => r.studentId)).toEqual(["capped", "rich"]);
  });

  test("does not mutate its input; empty input is fine", () => {
    const input = [row("a", "A", { solved: 1, started: 1, completed: 1, lastSolvedAt: at(1) })];
    const copy = JSON.stringify(input);
    rankParticipants(input);
    expect(JSON.stringify(input)).toBe(copy);
    expect(rankParticipants([])).toEqual([]);
  });
});

describe("summarize", () => {
  test("counts participation states and ranked students", () => {
    const rows = rankParticipants([
      row("a", "A", { started: 3, completed: 3, solved: 3, correctAnswers: 3, lastSolvedAt: at(9) }),
      row("b", "B", { started: 2, completed: 1, solved: 0 }),
      row("c", "C", { started: 1 }),
    ]);
    expect(summarize(rows, 3)).toEqual({ challengeCount: 3, participantCount: 3, completedCount: 1, partialCount: 1, inProgressCount: 1, rankedCount: 1 });
  });

  test("zero participants", () => {
    expect(summarize([], 3)).toEqual({ challengeCount: 3, participantCount: 0, completedCount: 0, partialCount: 0, inProgressCount: 0, rankedCount: 0 });
  });
});

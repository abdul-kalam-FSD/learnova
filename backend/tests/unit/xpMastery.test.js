const { calculateXP, applyMasteryTransition } = require("../../src/controllers/quizControllers");

describe("calculateXP", () => {
  test("base XP: 10 per correct answer", () => {
    const { finalXP } = calculateXP(3, 5, 0);
    expect(finalXP).toBe(30);
  });

  test("perfect quiz bonus applied when correctCount === totalQuestions", () => {
    const { finalXP, isPerfect } = calculateXP(5, 5, 0);
    expect(isPerfect).toBe(true);
    expect(finalXP).toBe(5 * 10 + 20);
  });

  test("no perfect bonus on an imperfect quiz", () => {
    const { finalXP, isPerfect } = calculateXP(4, 5, 0);
    expect(isPerfect).toBe(false);
    expect(finalXP).toBe(40);
  });

  test("1.5x multiplier at streak >= 3", () => {
    const { finalXP, multiplier } = calculateXP(2, 2, 3);
    expect(multiplier).toBe(1.5);
    // (2*10 + 20 perfect bonus) * 1.5 = 60
    expect(finalXP).toBe(60);
  });

  test("2x multiplier at streak >= 7", () => {
    const { finalXP, multiplier } = calculateXP(1, 2, 7);
    expect(multiplier).toBe(2);
    expect(finalXP).toBe(20);
  });

  test("zero correct answers still returns 0 XP, not NaN/negative", () => {
    const { finalXP } = calculateXP(0, 5, 10);
    expect(finalXP).toBe(0);
  });
});

describe("applyMasteryTransition", () => {
  test("weak -> learning after 2 correct in a row", () => {
    const step1 = applyMasteryTransition("weak", true, 0);
    expect(step1).toEqual({ state: "weak", correct_streak: 1 });

    const step2 = applyMasteryTransition("weak", true, 1);
    expect(step2).toEqual({ state: "learning", correct_streak: 0 });
  });

  test("learning -> strong after 2 correct in a row", () => {
    const step1 = applyMasteryTransition("learning", true, 0);
    expect(step1).toEqual({ state: "learning", correct_streak: 1 });

    const step2 = applyMasteryTransition("learning", true, 1);
    expect(step2).toEqual({ state: "strong", correct_streak: 0 });
  });

  test("a single wrong answer drops learning -> weak immediately", () => {
    const result = applyMasteryTransition("learning", false, 5);
    expect(result).toEqual({ state: "weak", correct_streak: 0 });
  });

  test("a single wrong answer drops strong -> learning immediately", () => {
    const result = applyMasteryTransition("strong", false, 5);
    expect(result).toEqual({ state: "learning", correct_streak: 0 });
  });

  test("wrong answer while already weak stays weak", () => {
    const result = applyMasteryTransition("weak", false, 0);
    expect(result).toEqual({ state: "weak", correct_streak: 0 });
  });

  test("a single correct answer does not skip weak -> strong", () => {
    const result = applyMasteryTransition("weak", true, 0);
    expect(result.state).toBe("weak");
  });
});

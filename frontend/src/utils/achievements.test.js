import { describe, test, expect } from "vitest";
import { getAchievements } from "./achievements";

// Phase 8: achievements.js previously had no test coverage at all
// (see PHASE_8_PROFILE_PROGRESS_AUDIT.md, issue #3). Covers the real
// thresholds this purely frontend-derived system uses, and locks in
// the Phase 8 wording fix (issue #2: "Cases" → "Games").

function byId(achievements, id) {
  return achievements.find((a) => a.id === id);
}

describe("getAchievements", () => {
  test("nothing is earned with no activity", () => {
    const achievements = getAchievements({
      user: { xp_total: 0, streak_count: 0 },
      stats: { quizzesPlayed: 0, accuracy: 0 },
      progress: { chapters: [] },
    });
    expect(achievements.every((a) => !a.earned)).toBe(true);
  });

  test("uses 'Games Completed' wording, not the legacy 'Cases Solved'", () => {
    const achievements = getAchievements({
      user: { xp_total: 0, streak_count: 0 },
      stats: { quizzesPlayed: 5, accuracy: 0 },
      progress: { chapters: [] },
    });
    expect(byId(achievements, "first-case").title).toBe("First Game Completed");
    expect(byId(achievements, "five-cases").title).toBe("5 Games Completed");
    expect(achievements.some((a) => a.title.includes("Case"))).toBe(false);
  });

  test("streak achievements are earned at their exact thresholds", () => {
    const at3 = getAchievements({
      user: { xp_total: 0, streak_count: 3 },
      stats: { quizzesPlayed: 0, accuracy: 0 },
      progress: { chapters: [] },
    });
    expect(byId(at3, "streak-3").earned).toBe(true);
    expect(byId(at3, "streak-7").earned).toBe(false);
  });

  test("Sharp Shooter requires both a completed game and 80%+ accuracy", () => {
    const noGamesYet = getAchievements({
      user: { xp_total: 0, streak_count: 0 },
      stats: { quizzesPlayed: 0, accuracy: 100 },
      progress: { chapters: [] },
    });
    expect(byId(noGamesYet, "sharp-shooter").earned).toBe(false);

    const qualifies = getAchievements({
      user: { xp_total: 0, streak_count: 0 },
      stats: { quizzesPlayed: 1, accuracy: 80 },
      progress: { chapters: [] },
    });
    expect(byId(qualifies, "sharp-shooter").earned).toBe(true);
  });

  test("Chapter Mastered requires every concept in a chapter to be strong", () => {
    const partial = getAchievements({
      user: { xp_total: 0, streak_count: 0 },
      stats: { quizzesPlayed: 0, accuracy: 0 },
      progress: {
        chapters: [
          { total_concepts: 4, breakdown: { weak: 1, learning: 0, strong: 3 } },
        ],
      },
    });
    expect(byId(partial, "chapter-mastered").earned).toBe(false);

    const full = getAchievements({
      user: { xp_total: 0, streak_count: 0 },
      stats: { quizzesPlayed: 0, accuracy: 0 },
      progress: {
        chapters: [
          { total_concepts: 4, breakdown: { weak: 0, learning: 0, strong: 4 } },
        ],
      },
    });
    expect(byId(full, "chapter-mastered").earned).toBe(true);
  });

  test("500 XP milestone is earned at the threshold", () => {
    const achievements = getAchievements({
      user: { xp_total: 500, streak_count: 0 },
      stats: { quizzesPlayed: 0, accuracy: 0 },
      progress: { chapters: [] },
    });
    expect(byId(achievements, "rising-scholar").earned).toBe(true);
  });
});

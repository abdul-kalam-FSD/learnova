import { describe, test, expect } from "vitest";
import { formatDuration, formatPercent, contestPlace, contestPhaseNotice, contestPlayHint, formatContestTime } from "./contestDisplay";

describe("formatDuration", () => {
  test.each([
    [0, "0s"], [45, "45s"], [59.4, "59s"], [60, "1m 0s"], [725, "12m 5s"], [3599, "59m 59s"], [3600, "1h 0m"], [7800, "2h 10m"],
  ])("%s seconds -> %s", (input, expected) => expect(formatDuration(input)).toBe(expected));

  test("missing or invalid -> an em dash; negatives clamp to 0", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
    expect(formatDuration(NaN)).toBe("—");
    expect(formatDuration(-5)).toBe("0s");
  });
});

describe("formatPercent / contestPlace", () => {
  test("percent keeps 0 but shows a dash for null", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(77.8)).toBe("77.8%");
    expect(formatPercent(null)).toBe("—");
  });
  test("place falls back to 'All chapters'", () => {
    expect(contestPlace({ subject: "Maths", chapterTitle: null })).toBe("Maths · All chapters");
    expect(contestPlace({ subject: "Maths", chapterTitle: "Fractions" })).toBe("Maths · Fractions");
  });
});

describe("grade-aware contest wording", () => {
  const start = "2030-01-01T10:00:00.000Z";
  const end = "2030-01-02T10:00:00.000Z";
  const ORIGINAL = {
    UPCOMING: `This contest starts ${formatContestTime(start)}. You can look around now — the games unlock when it begins.`,
    ACTIVE: `Live now — ends ${formatContestTime(end)}. Each game counts once, so give it your best try.`,
    ENDED: `This contest ended ${formatContestTime(end)}. You can no longer start games for it.`,
  };
  const ORIGINAL_HINT =
    "Tapping Play opens the game and shows only this contest's levels. XP, mastery and streaks work exactly like normal practice.";

  test("Grades 7-12, missing and unknown grades keep the original sentences exactly", () => {
    for (const g of [7, 8, 9, 10, 11, 12, null, undefined, 2]) {
      for (const phase of ["UPCOMING", "ACTIVE", "ENDED"]) expect(contestPhaseNotice(phase, g, start, end)).toBe(ORIGINAL[phase]);
      expect(contestPlayHint(g)).toBe(ORIGINAL_HINT);
    }
  });

  test("Grade 4 gets the shortest wording and still carries the end time", () => {
    for (const phase of ["UPCOMING", "ACTIVE", "ENDED"]) {
      expect(contestPhaseNotice(phase, 4, start, end).length).toBeLessThan(ORIGINAL[phase].length);
    }
    expect(contestPhaseNotice("ACTIVE", 4, start, end)).toContain(formatContestTime(end));
    expect(contestPhaseNotice("UPCOMING", 4, start, end)).toContain(formatContestTime(start));
    expect(contestPlayHint(4).length).toBeLessThan(contestPlayHint(5).length);
  });

  test("Grades 5 and 6 are simplified, but less than Grade 4", () => {
    for (const g of [5, 6]) {
      expect(contestPhaseNotice("ACTIVE", g, start, end)).toBe(contestPhaseNotice("ACTIVE", 5, start, end));
      expect(contestPhaseNotice("ACTIVE", g, start, end).length).toBeLessThan(ORIGINAL.ACTIVE.length);
      expect(contestPhaseNotice("ACTIVE", g, start, end).length).toBeGreaterThan(contestPhaseNotice("ACTIVE", 4, start, end).length);
      expect(contestPlayHint(g).length).toBeLessThan(ORIGINAL_HINT.length);
    }
  });
});

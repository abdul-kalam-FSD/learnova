import { describe, test, expect } from "vitest";
import { formatDuration, formatPercent, contestPlace } from "./contestDisplay";

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

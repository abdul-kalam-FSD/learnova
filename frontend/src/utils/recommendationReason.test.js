import { describe, test, expect } from "vitest";
import { getRecommendationReasonText, RECOMMENDATION_REASON_COPY } from "./recommendationReason";

describe("getRecommendationReasonText", () => {
  test("returns the existing copy for each known backend reason value", () => {
    expect(getRecommendationReasonText("weak-concept")).toBe(
      "You're still building this up — a quick round will help.",
    );
    expect(getRecommendationReasonText("learning-concept")).toBe(
      "You're on your way — keep this one warm.",
    );
    expect(getRecommendationReasonText("strong-concept")).toBe(
      "You've got this down — a quick review keeps it sharp.",
    );
    expect(getRecommendationReasonText("fallback-any-content")).toBe("Something new to try.");
  });

  test("returns null (never invented text) for an unrecognized or missing reason", () => {
    expect(getRecommendationReasonText("some-future-reason")).toBeNull();
    expect(getRecommendationReasonText(undefined)).toBeNull();
    expect(getRecommendationReasonText(null)).toBeNull();
  });

  test("exposes exactly the four known reason keys — no invented reasons added", () => {
    expect(Object.keys(RECOMMENDATION_REASON_COPY).sort()).toEqual(
      ["fallback-any-content", "learning-concept", "strong-concept", "weak-concept"].sort(),
    );
  });
});

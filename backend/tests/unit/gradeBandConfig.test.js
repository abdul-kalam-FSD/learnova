const { getGradeBandConfig, applyTimePressure, capDistractors } = require("../../src/utils/gradeBandConfig");

describe("getGradeBandConfig", () => {
  test("grades 1-5 map to the SIMPLE tier with hints and extra time", () => {
    const config = getGradeBandConfig(5);
    expect(config.tier).toBe("SIMPLE");
    expect(config.hintsEnabled).toBe(true);
    expect(config.timePressureMultiplier).toBeGreaterThan(1);
  });

  test("grades 6-8 map to the INTERMEDIATE tier (matches original un-band-aware defaults)", () => {
    const config = getGradeBandConfig(7);
    expect(config.tier).toBe("INTERMEDIATE");
    expect(config.hintsEnabled).toBe(true);
    expect(config.timePressureMultiplier).toBe(1);
  });

  test("grades 9-10 map to the ADVANCED tier", () => {
    const config = getGradeBandConfig(9);
    expect(config.tier).toBe("ADVANCED");
    expect(config.maxDistractors).toBeNull();
  });

  test("grades 11-12 map to the EXPERT tier with hints disabled and less time", () => {
    const config = getGradeBandConfig(12);
    expect(config.tier).toBe("EXPERT");
    expect(config.hintsEnabled).toBe(false);
    expect(config.timePressureMultiplier).toBeLessThan(1);
    expect(config.maxDistractors).toBeNull();
  });

  test("SIMPLE and INTERMEDIATE tiers cap distractors; ADVANCED/EXPERT stay uncapped", () => {
    expect(getGradeBandConfig(4).maxDistractors).toBe(1);
    expect(getGradeBandConfig(7).maxDistractors).toBe(2);
  });

  test("an out-of-range or missing grade falls back to INTERMEDIATE defaults (no regression)", () => {
    expect(getGradeBandConfig(null).tier).toBe("INTERMEDIATE");
    expect(getGradeBandConfig(undefined).tier).toBe("INTERMEDIATE");
    expect(getGradeBandConfig(99).tier).toBe("INTERMEDIATE");
  });
});

describe("applyTimePressure", () => {
  test("scales a time limit by the band's multiplier", () => {
    const simple = getGradeBandConfig(4);
    expect(applyTimePressure(20, simple)).toBe(Math.round(20 * simple.timePressureMultiplier));
  });

  test("INTERMEDIATE multiplier of 1 leaves the original value unchanged", () => {
    const intermediate = getGradeBandConfig(6);
    expect(applyTimePressure(30, intermediate)).toBe(30);
  });

  test("never scales a timer below the playable floor even with an aggressive multiplier", () => {
    const expert = getGradeBandConfig(11);
    expect(applyTimePressure(5, expert)).toBeGreaterThanOrEqual(5);
  });

  test("passes through non-numeric input unchanged instead of throwing", () => {
    const config = getGradeBandConfig(6);
    expect(applyTimePressure(undefined, config)).toBeUndefined();
  });
});

describe("capDistractors", () => {
  const pool = [
    { id: "p1", label: "correct-1" },
    { id: "p2", label: "distractor-1" },
    { id: "p3", label: "correct-2" },
    { id: "p4", label: "distractor-2" },
    { id: "p5", label: "distractor-3" },
  ];
  const correctIds = ["p1", "p3"];

  test("null maxDistractors (ADVANCED/EXPERT) returns the pool unchanged", () => {
    expect(capDistractors(pool, correctIds, null)).toEqual(pool);
  });

  test("keeps every correct piece plus up to maxDistractors incorrect ones", () => {
    const trimmed = capDistractors(pool, correctIds, 1);
    expect(trimmed.map((p) => p.id)).toEqual(expect.arrayContaining(["p1", "p3"]));
    const distractorsKept = trimmed.filter((p) => !correctIds.includes(p.id));
    expect(distractorsKept).toHaveLength(1);
  });

  test("preserves the pool's original ordering rather than sorting correct pieces first", () => {
    const trimmed = capDistractors(pool, correctIds, 1);
    // p2 is the first distractor in original order, so it's the one kept.
    expect(trimmed.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  test("maxDistractors at or above the actual distractor count changes nothing", () => {
    expect(capDistractors(pool, correctIds, 3)).toEqual(pool);
    expect(capDistractors(pool, correctIds, 10)).toEqual(pool);
  });

  test("maxDistractors of 0 keeps only the correct pieces", () => {
    const trimmed = capDistractors(pool, correctIds, 0);
    expect(trimmed.map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  test("non-array pool passes through unchanged", () => {
    expect(capDistractors(undefined, correctIds, 1)).toBeUndefined();
  });
});

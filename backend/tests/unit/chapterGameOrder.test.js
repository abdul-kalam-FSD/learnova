const { sortGamesByRegistryOrder } = require("../../src/utils/chapterGameOrder");
const { KNOWN_GAME_TYPES } = require("../../src/utils/gameTypeRegistry");

// Phase 4D regression coverage for the deterministic (technical,
// non-curriculum) ordering applied to the games[] array returned by
// GET /api/chapters/:chapterId. See
// PHASE_4D_DETERMINISTIC_GAME_ORDER_REPORT.md for the product
// rationale. Pure-function tests only — no DB, mirrors the style of
// tests/unit/gradeBandConfig.test.js.

describe("sortGamesByRegistryOrder", () => {
  test("orders game_types to match their position in the registry array, regardless of input order", () => {
    // Pick three real, registered game types and deliberately pass
    // them in the reverse of their registry order.
    const [first, second, third] = KNOWN_GAME_TYPES;
    const shuffled = [
      { game_type: third, label: "Third", count: 1 },
      { game_type: first, label: "First", count: 2 },
      { game_type: second, label: "Second", count: 3 },
    ];

    const result = sortGamesByRegistryOrder(shuffled, KNOWN_GAME_TYPES);

    expect(result.map((g) => g.game_type)).toEqual([first, second, third]);
  });

  test("is deterministic and idempotent across repeated calls on the same input", () => {
    const [first, second, third] = KNOWN_GAME_TYPES;
    const input = [
      { game_type: third, label: "Third", count: 1 },
      { game_type: first, label: "First", count: 2 },
      { game_type: second, label: "Second", count: 3 },
    ];

    const runs = Array.from({ length: 5 }, () =>
      sortGamesByRegistryOrder(input, KNOWN_GAME_TYPES).map((g) => g.game_type),
    );

    for (const run of runs) {
      expect(run).toEqual(runs[0]);
    }
  });

  test("does not mutate the input array", () => {
    const [first, second] = KNOWN_GAME_TYPES;
    const input = [
      { game_type: second, label: "Second", count: 1 },
      { game_type: first, label: "First", count: 2 },
    ];
    const inputCopy = [...input];

    sortGamesByRegistryOrder(input, KNOWN_GAME_TYPES);

    expect(input).toEqual(inputCopy);
  });

  test("preserves every entry's fields (game_type/label/count) unchanged — shape is not altered", () => {
    const [first] = KNOWN_GAME_TYPES;
    const input = [{ game_type: first, label: "First Label", count: 7 }];

    const result = sortGamesByRegistryOrder(input, KNOWN_GAME_TYPES);

    expect(result).toEqual([{ game_type: first, label: "First Label", count: 7 }]);
  });

  test("preserves the full set and count of entries (no drops, no duplicates introduced)", () => {
    const sample = KNOWN_GAME_TYPES.slice(0, 6).map((gt, i) => ({
      game_type: gt,
      label: gt,
      count: i + 1,
    }));
    // Reverse the input order relative to the registry.
    const reversed = [...sample].reverse();

    const result = sortGamesByRegistryOrder(reversed, KNOWN_GAME_TYPES);

    expect(result).toHaveLength(sample.length);
    expect(result.map((g) => g.game_type).sort()).toEqual(
      sample.map((g) => g.game_type).sort(),
    );
    const uniqueTypes = new Set(result.map((g) => g.game_type));
    expect(uniqueTypes.size).toBe(result.length);
  });

  test("sorts an unregistered/stale game_type after every registered game_type", () => {
    const [first, second] = KNOWN_GAME_TYPES;
    const input = [
      { game_type: "MATH_RETIRED_MECHANIC", label: "Stale", count: 1 },
      { game_type: second, label: "Second", count: 1 },
      { game_type: first, label: "First", count: 1 },
    ];

    const result = sortGamesByRegistryOrder(input, KNOWN_GAME_TYPES);

    expect(result.map((g) => g.game_type)).toEqual([first, second, "MATH_RETIRED_MECHANIC"]);
  });

  test("breaks ties between two unregistered game_types deterministically by string compare", () => {
    const input = [
      { game_type: "ZZZ_STALE", label: "Z", count: 1 },
      { game_type: "AAA_STALE", label: "A", count: 1 },
    ];

    const result = sortGamesByRegistryOrder(input, KNOWN_GAME_TYPES);

    expect(result.map((g) => g.game_type)).toEqual(["AAA_STALE", "ZZZ_STALE"]);
  });

  test("handles an empty input array", () => {
    expect(sortGamesByRegistryOrder([], KNOWN_GAME_TYPES)).toEqual([]);
  });

  test("handles a single-entry input array", () => {
    const [first] = KNOWN_GAME_TYPES;
    const input = [{ game_type: first, label: "Only", count: 1 }];

    expect(sortGamesByRegistryOrder(input, KNOWN_GAME_TYPES)).toEqual(input);
  });
});

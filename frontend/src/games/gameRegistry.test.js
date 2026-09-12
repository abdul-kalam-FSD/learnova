import { describe, test, expect } from "vitest";
import { GAME_TYPES, GAME_TYPE_TO_ROUTE, GAME_TYPE_TO_ICON, GAME_TYPE_TO_ACTION } from "./gameRegistry";

describe("gameRegistry", () => {
  test("every entry has a unique game_type", () => {
    const gameTypes = GAME_TYPES.map((g) => g.game_type);
    expect(new Set(gameTypes).size).toBe(gameTypes.length);
  });

  test("every entry has a non-empty route and icon", () => {
    for (const g of GAME_TYPES) {
      expect(g.route).toBeTruthy();
      expect(g.route.startsWith("/games/")).toBe(true);
      expect(g.icon).toBeTruthy();
    }
  });

  test("a known game_type resolves to its route", () => {
    expect(GAME_TYPE_TO_ROUTE["MATH_FRACTION_BUILDER"]).toBe("/games/fraction-builder");
  });

  test("a known game_type resolves to its icon", () => {
    expect(GAME_TYPE_TO_ICON["MATH_FRACTION_BUILDER"]).toBe("🧮");
  });

  test("an invalid/unknown game_type resolves to undefined, not a crash or a wrong route", () => {
    expect(GAME_TYPE_TO_ROUTE["NOT_A_REAL_GAME_TYPE"]).toBeUndefined();
    expect(GAME_TYPE_TO_ICON["NOT_A_REAL_GAME_TYPE"]).toBeUndefined();
  });

  test("GAME_TYPE_TO_ROUTE and GAME_TYPE_TO_ICON cover exactly the same set of game_types as GAME_TYPES", () => {
    const fromList = new Set(GAME_TYPES.map((g) => g.game_type));
    expect(new Set(Object.keys(GAME_TYPE_TO_ROUTE))).toEqual(fromList);
    expect(new Set(Object.keys(GAME_TYPE_TO_ICON))).toEqual(fromList);
  });

  test("routes are unique — no two game_types silently point at the same screen", () => {
    const routes = GAME_TYPES.map((g) => g.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  // Phase 0B (Subject/Chapter World): every mechanic needs its own
  // real action phrase, not the generic fallback — otherwise the
  // "different mechanics feel different" goal silently regresses to
  // "every card says Play the mission" the next time a game_type is
  // added without updating GAME_TYPE_ACTIONS.
  test("every game_type has a specific action phrase, not the generic fallback", () => {
    for (const g of GAME_TYPES) {
      expect(GAME_TYPE_TO_ACTION[g.game_type]).toBeTruthy();
      expect(GAME_TYPE_TO_ACTION[g.game_type]).not.toBe("Play the mission");
    }
  });

  test("GAME_TYPE_TO_ACTION covers exactly the same set of game_types as GAME_TYPES", () => {
    const fromList = new Set(GAME_TYPES.map((g) => g.game_type));
    expect(new Set(Object.keys(GAME_TYPE_TO_ACTION))).toEqual(fromList);
  });
});

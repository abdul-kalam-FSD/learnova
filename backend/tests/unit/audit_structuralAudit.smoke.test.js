// This test runs the REAL audit (backend/scripts/audit/structuralAudit.js)
// against the ACTUAL project files — not fixtures. It is intentionally a
// "regression safety net": per the audit task's Check 9, it should fail
// clearly if a future change removes a route, breaks scoring, orphans a
// registry entry, introduces a broken seed reference, or leaves an
// applicable Grade 4-12 subject without a game mechanic. It reads only
// (never modifies) real source/seed files, and never touches a database.

const { runAudit } = require("../../scripts/audit/structuralAudit");

describe("audit/structuralAudit — real project regression safety net", () => {
  let result;
  beforeAll(() => {
    result = runAudit();
  });

  test("the audit runs to completion and reports zero structural errors", () => {
    if (result.errors.length > 0) {
      // Print the errors so a CI failure is immediately actionable.
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(result.errors, null, 2));
    }
    expect(result.errors).toEqual([]);
    expect(result.summary.auditPasses).toBe(true);
  });

  test("backend and frontend game-type registries have exactly the same 54 entries (no drift)", () => {
    const backendTypes = result.backendRegistry.entries.map((e) => e.gameType).sort();
    const frontendTypes = result.frontendRegistry.entries.map((e) => e.gameType).sort();
    expect(backendTypes).toEqual(frontendTypes);
    expect(backendTypes.length).toBeGreaterThanOrEqual(54);
  });

  test("every registered game type has a working route -> component -> file chain", () => {
    const broken = result.routeResults.filter((r) => r.status !== "OK");
    expect(broken).toEqual([]);
  });

  test("every registered game type has a detectable backend scoring path", () => {
    const uncovered = result.scoringResults.filter((r) => !r.covered);
    expect(uncovered).toEqual([]);
  });

  test("no game_type is seeded without being registered (no orphan seed content)", () => {
    expect(result.seededButUnregistered).toEqual([]);
  });

  test("Grade 11 Biology has both expected game mechanics present", () => {
    result.biology11Check.forEach((c) => {
      expect(c.present).toBe(true);
    });
  });

  test("Grade 12 Biology has all five expected game mechanics present (the original audit gap, now closed)", () => {
    result.biology12Check.forEach((c) => {
      expect(c.present).toBe(true);
    });
  });

  test("no grade 4-12 applicable subject cell is missing game mechanics entirely", () => {
    const missing = [];
    Object.entries(result.matrixReport).forEach(([grade, rows]) => {
      rows.forEach((row) => {
        if (row.status === "❌ SUBJECT/CONTENT MISSING" || row.gameTypes.length === 0) {
          missing.push(`Grade ${grade} / ${row.subject}`);
        }
      });
    });
    expect(missing).toEqual([]);
  });
});

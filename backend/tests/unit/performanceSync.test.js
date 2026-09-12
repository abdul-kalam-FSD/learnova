const fs = require("fs");
const os = require("os");
const path = require("path");
const ExcelJS = require("exceljs");

const { buildPerformanceRow, upsertRow } = require("../../src/utils/performanceSync");

function gameSession(overrides = {}) {
  return {
    _id: "sess-1",
    session_type: "game-session",
    game_type: "MATH_FRACTION_BUILDER",
    game_payload: { is_correct: true, correct_count: 1, total_count: 1 },
    questions: [],
    xp_awarded: 30,
    completed_at: new Date("2026-09-01T10:00:00.000Z"),
    user_id: { _id: "user-1", name: "Asha K", grade: 8 },
    ...overrides,
  };
}

describe("buildPerformanceRow", () => {
  test("builds a full row for a completed game session", () => {
    const row = buildPerformanceRow(
      gameSession(),
      { subject: "Mathematics", chapter: "Fractions", gameTitle: "Fraction Builder — Level 3" },
    );

    expect(row).toMatchObject({
      resultId: "sess-1",
      studentId: "user-1",
      studentName: "Asha K",
      grade: 8,
      subject: "Mathematics",
      chapter: "Fractions",
      game: "Fraction Builder — Level 3",
      score: "1/1",
      accuracy: 100,
      xp: 30,
      status: "Completed",
    });
    expect(row.date).toBe("2026-09-01T10:00:00.000Z");
  });

  test("scales score/accuracy correctly for a multi-question game", () => {
    const row = buildPerformanceRow(
      gameSession({
        game_payload: { is_correct: false, correct_count: 1, total_count: 2 },
      }),
    );
    expect(row.score).toBe("1/2");
    expect(row.accuracy).toBe(50);
  });

  test("leaves subject/chapter/game blank for quiz sessions rather than guessing", () => {
    const row = buildPerformanceRow(
      gameSession({
        session_type: "weak-concept-targeted",
        game_type: undefined,
        questions: [{ is_correct: true }, { is_correct: false }],
      }),
    );
    expect(row.subject).toBe("");
    expect(row.chapter).toBe("");
    expect(row.game).toBe("");
    expect(row.score).toBe("1/2");
  });
});

describe("upsertRow — duplicate prevention", () => {
  let workbook, sheet;
  const COLUMNS = [
    { header: "Result ID", key: "resultId" },
    { header: "Student Name", key: "studentName" },
    { header: "Score", key: "score" },
  ];

  beforeEach(() => {
    workbook = new ExcelJS.Workbook();
    sheet = workbook.addWorksheet("Performance");
    sheet.columns = COLUMNS;
  });

  test("appends a new row for a new result id", () => {
    upsertRow(sheet, { resultId: "sess-1", studentName: "Asha K", score: "1/1" }, COLUMNS);
    expect(sheet.rowCount).toBe(2); // header + 1 data row
  });

  test("re-syncing the same result id updates in place instead of duplicating", () => {
    upsertRow(sheet, { resultId: "sess-1", studentName: "Asha K", score: "1/1" }, COLUMNS);
    upsertRow(sheet, { resultId: "sess-1", studentName: "Asha K", score: "2/2" }, COLUMNS);

    expect(sheet.rowCount).toBe(2); // still just header + 1 row — no duplicate
    expect(sheet.getRow(2).getCell(3).value).toBe("2/2");
  });

  test("a different result id gets its own row", () => {
    upsertRow(sheet, { resultId: "sess-1", studentName: "Asha K", score: "1/1" }, COLUMNS);
    upsertRow(sheet, { resultId: "sess-2", studentName: "Dev Raj", score: "0/1" }, COLUMNS);

    expect(sheet.rowCount).toBe(3);
  });
});

describe("workbook round-trip (real file I/O, no DB)", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "perf-sync-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("a workbook written, reopened, and upserted again keeps one row per session", async () => {
    const filePath = path.join(tmpDir, "student-performance.xlsx");
    const COLUMNS = [
      { header: "Result ID", key: "resultId" },
      { header: "Score", key: "score" },
    ];

    const wb1 = new ExcelJS.Workbook();
    const sheet1 = wb1.addWorksheet("Performance");
    sheet1.columns = COLUMNS;
    upsertRow(sheet1, { resultId: "sess-1", score: "1/1" }, COLUMNS);
    await wb1.xlsx.writeFile(filePath);

    // Simulate a second, later completion re-syncing on a freshly
    // reopened workbook (as syncSessionToExcel does on every call).
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(filePath);
    const sheet2 = wb2.getWorksheet("Performance");
    upsertRow(sheet2, { resultId: "sess-1", score: "1/1 (retry)" }, COLUMNS);
    upsertRow(sheet2, { resultId: "sess-2", score: "0/1" }, COLUMNS);
    await wb2.xlsx.writeFile(filePath);

    const wb3 = new ExcelJS.Workbook();
    await wb3.xlsx.readFile(filePath);
    const sheet3 = wb3.getWorksheet("Performance");
    expect(sheet3.rowCount).toBe(3); // header + 2 distinct results, sess-1 not duplicated
  });
});

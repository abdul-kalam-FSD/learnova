// Unit tests for the contest-results workbook builder. No database: the
// workbook is written to a real .xlsx buffer, read back with ExcelJS, and
// asserted cell by cell.
jest.mock("../../src/models/QuizzSession");
jest.mock("../../src/models/User");
jest.mock("../../src/models/Subject");
jest.mock("../../src/models/Chapter");
jest.mock("../../src/models/GameContent");

const ExcelJS = require("exceljs");
const { buildRow, rankParticipants, summarize, buildChallengeGrid, RANKING_RULE } = require("../../src/utils/contestResults");
const {
  SHEET_NAMES, RESULTS_COLUMNS, DETAIL_COLUMNS, buildContestResultsWorkbook, contestExportFilenames, contentDisposition,
} = require("../../src/utils/contestExcel");

const START = new Date("2030-01-01T10:00:00.000Z");
const at = (m) => new Date(START.getTime() + m * 60000);
const CHALLENGES = [
  { id: "g1", title: "Build 1/2", label: "Fraction Builder" },
  { id: "g2", title: "Match it", label: "Fraction Match" },
  { id: "g3", title: "Removed content", label: null },
];
const CONTEST = { id: "c1", title: "Weekly Fractions Blitz", grade: 6, subject: "Mathematics", chapterTitle: "Fractions", startAt: START, endAt: at(24 * 60) };

const grp = (id, o = {}) => ({ _id: id, started: 0, completed: 0, solved: 0, correctAnswers: 0, totalAnswers: 0, xp: 0, attempts: 0, firstStartedAt: at(1), lastCompletedAt: null, lastSolvedAt: null, ...o });
const mk = (id, name, email, o) => ({ ...buildRow(grp(id, o), { challengeCount: 3, contestStart: START }), name, email });

const sessionFor = (user, content, o = {}) => ({
  user_id: user, content_id: content, started_at: at(2), completed_at: o.endM != null ? at(o.endM) : undefined,
  xp_awarded: o.xp || 0, attempt_count: o.attempts ?? 1,
  game_payload: o.endM != null ? { is_correct: !!o.solved, correct_count: o.correct ?? (o.solved ? 1 : 0), total_count: o.total ?? 1 } : undefined,
});

const results = (rows, over = {}) => {
  const ranked = rankParticipants(rows);
  return { rankingRule: RANKING_RULE, final: false, phase: "ACTIVE", summary: summarize(ranked, 3), rows: ranked, ...over };
};

async function build(res, sessions = [], extra = {}) {
  const grid = buildChallengeGrid(res.rows, CHALLENGES, sessions);
  const wb = buildContestResultsWorkbook({ contest: CONTEST, teacherName: "Tina Teacher", results: res, grid, exportedAt: new Date("2030-01-03T09:30:00.000Z"), ...extra });
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buf);
  return { loaded, buf };
}

const headerOf = (sheet) => sheet.getRow(1).values.slice(1);
const rowsOf = (sheet) => { const out = []; sheet.eachRow((r, i) => { if (i > 1) out.push(r.values.slice(1)); }); return out; };
const summaryMap = (sheet) => { const m = {}; sheet.eachRow((r, i) => { if (i > 1) m[r.getCell(1).value] = r.getCell(2).value; }); return m; };
// ExcelJS may hand a [h]:mm:ss cell back as a Date; normalise either form to seconds.
const toSeconds = (v) => (v instanceof Date ? Math.round((v.getTime() - Date.UTC(1899, 11, 30)) / 1000) : Math.round(v * 86400));

const scenario = () => {
  const rows = [
    mk("s1", "Ann", "ann@x.com", { started: 3, completed: 3, solved: 3, correctAnswers: 3, totalAnswers: 3, xp: 90, attempts: 4, lastCompletedAt: at(30), lastSolvedAt: at(30) }),
    mk("s2", "Ben", null, { started: 2, completed: 1, solved: 0, correctAnswers: 3, totalAnswers: 5, xp: 10, attempts: 2, lastCompletedAt: at(9) }),
    mk("s3", "Cat", "cat@x.com", { started: 1 }),
  ];
  const sessions = [
    sessionFor("s1", "g1", { solved: true, endM: 10, xp: 30 }), sessionFor("s1", "g2", { solved: true, endM: 20, xp: 30, attempts: 2 }), sessionFor("s1", "g3", { solved: true, endM: 30, xp: 30 }),
    sessionFor("s2", "g1", { solved: false, correct: 3, total: 5, endM: 9, xp: 10, attempts: 2 }),
    sessionFor("s3", "g2", {}),
  ];
  return { res: results(rows), sessions };
};

describe("workbook structure", () => {
  test("has exactly the three sheets, in order, with the documented names", async () => {
    const { res, sessions } = scenario();
    const { loaded } = await build(res, sessions);
    expect(loaded.worksheets.map((w) => w.name)).toEqual(["Contest Summary", "Results", "Challenge Details"]);
    expect(SHEET_NAMES).toEqual({ summary: "Contest Summary", results: "Results", details: "Challenge Details" });
  });

  test("it is a real, valid .xlsx (a zip with the xlsx parts)", async () => {
    const { buf } = await build(scenario().res, scenario().sessions);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const zip = await require("jszip").loadAsync(buf);
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/worksheets/sheet3.xml"]));
  });
});

describe("Contest Summary sheet", () => {
  test("shows the contest metadata and the participation counts", async () => {
    const { res, sessions } = scenario();
    const { loaded } = await build(res, sessions);
    const m = summaryMap(loaded.getWorksheet("Contest Summary"));
    expect(m).toMatchObject({
      "Contest Name": "Weekly Fractions Blitz", Grade: 6, Subject: "Mathematics", Chapter: "Fractions", Teacher: "Tina Teacher",
      "Contest Phase": "Live (in progress)", "Results Status": "Live - standings can still change",
      "Games in Contest": 3, "Total Participants": 3, "Completed All Games": 1, "Partially Completed": 1, "Started (none finished)": 1, "Ranked Participants": 1,
    });
    expect(m["Start (UTC)"]).toEqual(START);
    expect(m["End (UTC)"]).toEqual(at(24 * 60));
    expect(m["Exported At (UTC)"]).toEqual(new Date("2030-01-03T09:30:00.000Z"));
    expect(m["Ranking Rule"]).toBe(RANKING_RULE.summary);
    expect(m["Ranking Order"]).toMatch(/1\) challengesSolved \(higher is better\)\s+2\) correctAnswers \(higher is better\)\s+3\) elapsedSeconds \(lower is better\)/);
    expect(m["Time Zone Note"]).toMatch(/UTC/);
  });

  test("an ended contest is labelled Final", async () => {
    const { res, sessions } = scenario();
    const { loaded } = await build({ ...res, final: true, phase: "ENDED" }, sessions);
    expect(summaryMap(loaded.getWorksheet("Contest Summary"))).toMatchObject({ "Contest Phase": "Ended", "Results Status": "Final" });
  });

  test("a contest with no chapter says 'All chapters'; a missing teacher is just blank", async () => {
    const wb = buildContestResultsWorkbook({ contest: { ...CONTEST, chapterTitle: null }, teacherName: null, results: results([]), grid: [] });
    const m = summaryMap(wb.getWorksheet("Contest Summary"));
    expect(m.Chapter).toBe("All chapters");
    expect(m.Teacher == null).toBe(true);
  });
});

describe("Results sheet", () => {
  test("columns are exactly the documented list, in order", async () => {
    const { loaded } = await build(scenario().res, scenario().sessions);
    expect(headerOf(loaded.getWorksheet("Results"))).toEqual([
      "Rank", "Student Name", "Student ID", "Email", "Status", "Challenges", "Started", "Completed", "Solved", "Correct Answers",
      "Total Answers", "Accuracy %", "Completion %", "XP Earned", "Attempts", "First Started", "Last Completed", "Last Solved", "Elapsed Time",
    ]);
    expect(RESULTS_COLUMNS.map((c) => c.header)).toEqual(headerOf(loaded.getWorksheet("Results")));
  });

  test("one row per participant in rank order, with the server's values", async () => {
    const { res, sessions } = scenario();
    const { loaded } = await build(res, sessions);
    const rows = rowsOf(loaded.getWorksheet("Results"));
    expect(rows).toHaveLength(3);
    const [ann, ben, cat] = rows;
    expect(ann.slice(0, 15)).toEqual([1, "Ann", "s1", "ann@x.com", "Completed all", 3, 3, 3, 3, 3, 3, 100, 100, 90, 4]);
    expect(ann[15]).toEqual(grp("x").firstStartedAt); // First Started
    expect(ann[16]).toEqual(at(30));
    expect(ann[17]).toEqual(at(30));
    expect(toSeconds(ann[18])).toBe(30 * 60);
    // Ben: finished one game, not solved -> unranked, no solved time, email withheld
    expect(ben[0] == null).toBe(true); // rank blank, not 0 and not "null"
    expect(ben[3] == null).toBe(true);
    expect(ben.slice(4, 15)).toEqual(["Partly done", 3, 2, 1, 0, 3, 5, 60, 33, 10, 2]);
    expect(ben[17] == null).toBe(true);
    expect(ben[18] == null).toBe(true);
    // Cat: started only
    expect(cat[4]).toBe("Started");
    expect(cat[0] == null && cat[16] == null && cat[17] == null && cat[18] == null).toBe(true);
  });

  test("numbers are numbers and dates are real date cells (sortable), elapsed is a duration", async () => {
    const { loaded } = await build(scenario().res, scenario().sessions);
    const sheet = loaded.getWorksheet("Results");
    expect(typeof sheet.getRow(2).getCell(1).value).toBe("number");
    expect(typeof sheet.getRow(2).getCell(14).value).toBe("number");
    expect(sheet.getRow(2).getCell(17).value).toBeInstanceOf(Date);
    expect(sheet.getRow(2).getCell(17).numFmt).toBe("yyyy-mm-dd hh:mm:ss");
    expect(sheet.getRow(2).getCell(19).numFmt).toBe("[h]:mm:ss");
  });

  test("has a bold frozen header and a filter over the data", async () => {
    const { loaded } = await build(scenario().res, scenario().sessions);
    const sheet = loaded.getWorksheet("Results");
    expect(sheet.getRow(1).font.bold).toBe(true);
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet.autoFilter).toBeTruthy();
  });

  test("zero participants still yields a valid workbook: header-only sheets and zero counts", async () => {
    const { loaded } = await build(results([]), []);
    expect(loaded.worksheets).toHaveLength(3);
    expect(rowsOf(loaded.getWorksheet("Results"))).toEqual([]);
    expect(rowsOf(loaded.getWorksheet("Challenge Details"))).toEqual([]);
    expect(headerOf(loaded.getWorksheet("Results"))).toHaveLength(19);
    expect(summaryMap(loaded.getWorksheet("Contest Summary"))).toMatchObject({ "Total Participants": 0, "Ranked Participants": 0 });
  });

  test("no ranked participants: everyone's Rank cell is blank", async () => {
    const res = results([mk("a", "Ann", null, { started: 1 }), mk("b", "Ben", null, { started: 2, completed: 1 })]);
    const { loaded } = await build(res, []);
    expect(rowsOf(loaded.getWorksheet("Results")).every((r) => r[0] == null)).toBe(true);
    expect(summaryMap(loaded.getWorksheet("Contest Summary"))["Ranked Participants"]).toBe(0);
  });

  test("a full upcoming contest is labelled", async () => {
    const { loaded } = await build(results([], { phase: "UPCOMING" }), []);
    expect(summaryMap(loaded.getWorksheet("Contest Summary"))).toMatchObject({ "Contest Phase": "Upcoming", "Results Status": "Not started yet" });
  });
});

describe("Challenge Details sheet", () => {
  test("columns are exactly the documented list", async () => {
    const { loaded } = await build(scenario().res, scenario().sessions);
    expect(headerOf(loaded.getWorksheet("Challenge Details"))).toEqual([
      "Student Name", "Student ID", "Rank", "Challenge / Game", "Game Type", "Status", "Solved", "Correct Answers", "Total Answers",
      "Accuracy %", "XP Earned", "Started At", "Completed At", "Attempts",
    ]);
    expect(DETAIL_COLUMNS.map((c) => c.header)).toEqual(headerOf(loaded.getWorksheet("Challenge Details")));
  });

  test("one row per participant x contest game, participants in rank order, games in contest order", async () => {
    const { res, sessions } = scenario();
    const { loaded } = await build(res, sessions);
    const rows = rowsOf(loaded.getWorksheet("Challenge Details"));
    expect(rows).toHaveLength(9);
    expect(rows.map((r) => [r[0], r[3]])).toEqual([
      ["Ann", "Build 1/2"], ["Ann", "Match it"], ["Ann", "Removed content"],
      ["Ben", "Build 1/2"], ["Ben", "Match it"], ["Ben", "Removed content"],
      ["Cat", "Build 1/2"], ["Cat", "Match it"], ["Cat", "Removed content"],
    ]);
  });

  test("shows correct/total/accuracy/XP/attempts/status per game, including not-started and in-progress", async () => {
    const { res, sessions } = scenario();
    const { loaded } = await build(res, sessions);
    const rows = rowsOf(loaded.getWorksheet("Challenge Details"));
    const byKey = (n, g) => rows.find((r) => r[0] === n && r[3] === g);
    expect(byKey("Ann", "Match it").slice(5, 11)).toEqual(["Completed", "Yes", 1, 1, 100, 30]);
    expect(byKey("Ann", "Match it")[13]).toBe(2);
    expect(byKey("Ben", "Build 1/2").slice(5, 11)).toEqual(["Completed", "No", 3, 5, 60, 10]);
    const notStarted = byKey("Ben", "Match it");
    expect(notStarted[5]).toBe("Not started");
    expect(notStarted.slice(6, 11).every((v) => v == null)).toBe(true); // solved/correct/total/accuracy/XP are blank
    expect(notStarted[13]).toBe(0); // attempts
    expect(byKey("Cat", "Match it")[5]).toBe("In progress");
    expect(byKey("Cat", "Match it")[6] == null).toBe(true);
    expect(byKey("Ann", "Removed content")[4] == null).toBe(true); // deleted game: no label
  });
});

describe("what is (not) written", () => {
  test("a field that is not in a column list can never reach the file", async () => {
    const { res, sessions } = scenario();
    res.rows[0].passwordHash = "$2b$HASH-SHOULD-NEVER-APPEAR";
    res.rows[0].token = "JWT-SHOULD-NEVER-APPEAR";
    res.rows[0].game_payload = { secret: "PAYLOAD-SHOULD-NEVER-APPEAR" };
    sessions[0].game_payload = { is_correct: true, correct_count: 1, total_count: 1, score: 99999, answerKey: "KEY-SHOULD-NEVER-APPEAR" };
    const { buf } = await build(res, sessions);
    const zip = await require("jszip").loadAsync(buf);
    let all = "";
    for (const name of Object.keys(zip.files)) if (name.endsWith(".xml")) all += await zip.files[name].async("string");
    for (const leak of ["HASH-SHOULD", "JWT-SHOULD", "PAYLOAD-SHOULD", "KEY-SHOULD", "99999", "passwordHash", "answerKey"]) expect(all).not.toContain(leak);
  });

  test("the only emails in the file are the ones the caller left on the rows", async () => {
    const { res, sessions } = scenario();
    const { loaded } = await build(res, sessions);
    const emails = rowsOf(loaded.getWorksheet("Results")).map((r) => r[3]).filter(Boolean);
    expect(emails.sort()).toEqual(["ann@x.com", "cat@x.com"]);
    // the details sheet never carries an email at all
    expect(JSON.stringify(rowsOf(loaded.getWorksheet("Challenge Details")))).not.toContain("@x.com");
  });

  test("formula-looking text (a name or contest title) is stored as plain TEXT, never as a formula", async () => {
    const evil = '=HYPERLINK("http://evil.example","click")';
    const rows = [mk("s1", evil, "+cmd@x.com", { started: 1, completed: 1, solved: 1, correctAnswers: 1, totalAnswers: 1, lastSolvedAt: at(5) })];
    const wb = buildContestResultsWorkbook({ contest: { ...CONTEST, title: "=1+1" }, teacherName: "@SUM(A1)", results: results(rows), grid: buildChallengeGrid(rankParticipants(rows), CHALLENGES, []) });
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(Buffer.from(await wb.xlsx.writeBuffer()));
    const name = loaded.getWorksheet("Results").getRow(2).getCell(2);
    expect(name.type).toBe(ExcelJS.ValueType.String);
    expect(name.value).toBe(evil);
    expect(loaded.getWorksheet("Results").getRow(2).getCell(4).type).toBe(ExcelJS.ValueType.String);
    const summary = loaded.getWorksheet("Contest Summary");
    expect(summary.getRow(2).getCell(2).type).toBe(ExcelJS.ValueType.String);
    expect(summary.getRow(2).getCell(2).value).toBe("=1+1");
  });

  test("missing optional values are empty cells, never 'null' / 'undefined' / NaN", async () => {
    const { buf } = await build(results([mk("s1", "Ann", null, { started: 1 })]), []);
    const zip = await require("jszip").loadAsync(buf);
    let all = "";
    for (const name of Object.keys(zip.files)) if (name.endsWith(".xml")) all += await zip.files[name].async("string");
    for (const bad of [">null<", ">undefined<", ">NaN<", ">Invalid Date<"]) expect(all).not.toContain(bad);
  });

  test("an invalid date becomes an empty cell rather than a corrupt value", async () => {
    const rows = [mk("s1", "Ann", null, { started: 1 })];
    rows[0].firstStartedAt = "not-a-date";
    const { loaded } = await build(results(rows), []);
    expect(loaded.getWorksheet("Results").getRow(2).getCell(16).value == null).toBe(true);
  });
});

describe("filename", () => {
  test("follows Learnova_Contest_<Name>_Results.xlsx", () => {
    expect(contestExportFilenames("Weekly Fractions Blitz")).toEqual({
      ascii: "Learnova_Contest_Weekly_Fractions_Blitz_Results.xlsx",
      utf8: "Learnova_Contest_Weekly_Fractions_Blitz_Results.xlsx",
    });
  });

  test("path, shell and reserved characters are removed", () => {
    const { ascii, utf8 } = contestExportFilenames('Maths: "Fractions" <1/2> | a\\b? *final* %20 #1 & more;');
    for (const name of [ascii, utf8]) expect(name).not.toMatch(/[\\/:*?"<>|%#&;]/);
    expect(ascii).toMatch(/^Learnova_Contest_.+_Results\.xlsx$/);
  });

  test("control characters and CR/LF (header injection) never survive", () => {
    const header = contentDisposition("Evil\r\nSet-Cookie: x=1\u0000\u0007 name");
    expect(header).not.toMatch(/[\r\n\u0000-\u001f]/);
    expect(header).not.toContain("Set-Cookie: x=1");
  });

  test("non-ASCII titles keep a readable UTF-8 name and a safe ASCII fallback", () => {
    const { ascii, utf8 } = contestExportFilenames("பின்னங்கள் போட்டி");
    expect(utf8).toBe("Learnova_Contest_பின்னங்கள்_போட்டி_Results.xlsx");
    expect(ascii).toBe("Learnova_Contest_Contest_Results.xlsx");
    const header = contentDisposition("பின்னங்கள் போட்டி");
    expect(header).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''[A-Za-z0-9%._-]+$/);
    expect(decodeURIComponent(header.split("filename*=UTF-8''")[1])).toBe(utf8);
  });

  test("empty, whitespace-only and very long titles are handled", () => {
    expect(contestExportFilenames("").ascii).toBe("Learnova_Contest_Contest_Results.xlsx");
    expect(contestExportFilenames("   ").utf8).toBe("Learnova_Contest_Contest_Results.xlsx");
    expect(contestExportFilenames(null).utf8).toBe("Learnova_Contest_Contest_Results.xlsx");
    const long = contestExportFilenames("x".repeat(500)).utf8;
    expect(long.length).toBeLessThan(100);
    // never cut an emoji / surrogate pair in half
    expect(contestExportFilenames("😀".repeat(100)).utf8).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
  });

  test("a database id is never part of the name", () => {
    expect(contestExportFilenames("Blitz").utf8).not.toMatch(/[a-f0-9]{24}/);
  });
});

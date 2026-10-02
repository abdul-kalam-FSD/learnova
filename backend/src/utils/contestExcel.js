const ExcelJS = require("exceljs");

// Builds the contest-results workbook from data the existing result service
// has ALREADY computed (utils/contestResults.js). Nothing here calculates a
// rank, score, XP or status — it only lays the server's results out in
// sheets. Pure: no database access, so it is unit-testable on its own.
//
// Privacy: only the explicit column lists below are ever written. Cell values
// are picked field-by-field from the already-sanitised rows (never spread
// from a document), so a stray field — a password hash, a token, anything in
// game_payload — cannot reach the file. The caller applies the viewer's email
// visibility BEFORE calling (rows arrive with email null where it must not be
// shown) and this module writes whatever email it is given.
//
// Sheets: "Contest Summary", "Results", "Challenge Details".
// Times are written as real Excel date/time cells in UTC (the server cannot
// know the reader's time zone); the Summary sheet says so.

const SHEET_NAMES = {
  summary: "Contest Summary",
  results: "Results",
  details: "Challenge Details",
};

const PARTICIPATION_LABELS = {
  COMPLETED: "Completed all",
  PARTIAL: "Partly done",
  IN_PROGRESS: "Started",
};

const CHALLENGE_STATUS_LABELS = {
  COMPLETED: "Completed",
  IN_PROGRESS: "In progress",
  NOT_STARTED: "Not started",
};

const PHASE_LABELS = {
  UPCOMING: "Upcoming",
  ACTIVE: "Live (in progress)",
  ENDED: "Ended",
};

const DATE_FORMAT = "yyyy-mm-dd hh:mm:ss";
const DURATION_FORMAT = "[h]:mm:ss";

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Elapsed seconds -> Excel duration (a fraction of a day) so it sorts and
// sums as a number but displays as h:mm:ss. null stays an empty cell.
const toDuration = (seconds) => (seconds == null || Number.isNaN(Number(seconds)) ? null : Number(seconds) / 86400);

const num = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));
const text = (v) => (v == null ? null : String(v));

// ---------- column definitions (the ONLY things ever exported) ----------

const RESULTS_COLUMNS = [
  { header: "Rank", width: 8, value: (r) => num(r.rank) },
  { header: "Student Name", width: 26, value: (r) => text(r.name) },
  { header: "Student ID", width: 26, value: (r) => text(r.studentId) },
  { header: "Email", width: 30, value: (r) => text(r.email) },
  { header: "Status", width: 16, value: (r) => PARTICIPATION_LABELS[r.status] || text(r.status) },
  { header: "Challenges", width: 11, value: (r) => num(r.challengeCount) },
  { header: "Started", width: 9, value: (r) => num(r.challengesStarted) },
  { header: "Completed", width: 11, value: (r) => num(r.challengesCompleted) },
  { header: "Solved", width: 8, value: (r) => num(r.challengesSolved) },
  { header: "Correct Answers", width: 15, value: (r) => num(r.correctAnswers) },
  { header: "Total Answers", width: 14, value: (r) => num(r.totalAnswers) },
  { header: "Accuracy %", width: 12, value: (r) => num(r.accuracy) },
  { header: "Completion %", width: 13, value: (r) => num(r.completionPercent) },
  { header: "XP Earned", width: 11, value: (r) => num(r.xpEarned) },
  { header: "Attempts", width: 10, value: (r) => num(r.attempts) },
  { header: "First Started", width: 20, format: DATE_FORMAT, value: (r) => toDate(r.firstStartedAt) },
  { header: "Last Completed", width: 20, format: DATE_FORMAT, value: (r) => toDate(r.lastCompletedAt) },
  { header: "Last Solved", width: 20, format: DATE_FORMAT, value: (r) => toDate(r.lastSolvedAt) },
  { header: "Elapsed Time", width: 13, format: DURATION_FORMAT, value: (r) => toDuration(r.elapsedSeconds) },
];

const challengeAccuracy = (c) =>
  c.status === "COMPLETED" && c.totalAnswers > 0 ? Math.round((c.correctAnswers / c.totalAnswers) * 1000) / 10 : null;

const DETAIL_COLUMNS = [
  { header: "Student Name", width: 26, value: (c) => text(c.studentName) },
  // Names are not unique, so the id lets a reader join this sheet to "Results".
  { header: "Student ID", width: 26, value: (c) => text(c.studentId) },
  { header: "Rank", width: 8, value: (c) => num(c.rank) },
  { header: "Challenge / Game", width: 28, value: (c) => text(c.title) },
  { header: "Game Type", width: 24, value: (c) => text(c.label) },
  { header: "Status", width: 14, value: (c) => CHALLENGE_STATUS_LABELS[c.status] || text(c.status) },
  { header: "Solved", width: 9, value: (c) => (c.status === "COMPLETED" ? (c.isCorrect ? "Yes" : "No") : null) },
  { header: "Correct Answers", width: 15, value: (c) => num(c.correctAnswers) },
  { header: "Total Answers", width: 14, value: (c) => num(c.totalAnswers) },
  { header: "Accuracy %", width: 12, value: challengeAccuracy },
  { header: "XP Earned", width: 11, value: (c) => num(c.xpAwarded) },
  { header: "Started At", width: 20, format: DATE_FORMAT, value: (c) => toDate(c.startedAt) },
  { header: "Completed At", width: 20, format: DATE_FORMAT, value: (c) => toDate(c.completedAt) },
  { header: "Attempts", width: 10, value: (c) => num(c.attempts) },
];

function addTableSheet(workbook, name, columns, records) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((col, i) => ({ header: col.header, key: `c${i}`, width: col.width }));

  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle", wrapText: true };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
  });

  for (const record of records) {
    const row = sheet.addRow(columns.map((col) => col.value(record)));
    columns.forEach((col, i) => {
      if (col.format) row.getCell(i + 1).numFmt = col.format;
    });
  }

  // A header-only sheet (an empty contest) is still a valid sheet; only add
  // the filter when there is something to filter.
  if (records.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1 + records.length, column: columns.length } };
  }
  return sheet;
}

// Everything the workbook is built from. `results.rows` must already have the
// viewer's email policy applied.
//   contest   describeContest() output
//   teacherName   creator's name (or null)
//   results   { rankingRule, final, phase, summary, rows }   (getContestResults)
//   grid      buildChallengeGrid() output
//   exportedAt   Date
function buildContestResultsWorkbook({ contest, teacherName, results, grid, exportedAt = new Date() }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Learnova";
  workbook.created = exportedAt;

  // --- Sheet 1: summary (two columns: field / value) ---
  const summarySheet = workbook.addWorksheet(SHEET_NAMES.summary);
  summarySheet.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 70 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
  });

  const s = results.summary;
  const rule = results.rankingRule;
  const ruleOrder = (rule.order || [])
    .map((o, i) => `${i + 1}) ${o.field} (${o.direction === "desc" ? "higher is better" : "lower is better"})`)
    .join("  ");

  const lines = [
    ["Contest Name", text(contest.title)],
    ["Grade", num(contest.grade)],
    ["Subject", text(contest.subject)],
    ["Chapter", text(contest.chapterTitle) || "All chapters"],
    ["Teacher", text(teacherName)],
    ["Start (UTC)", toDate(contest.startAt), DATE_FORMAT],
    ["End (UTC)", toDate(contest.endAt), DATE_FORMAT],
    ["Contest Phase", PHASE_LABELS[results.phase] || text(results.phase)],
    ["Results Status", results.final ? "Final" : results.phase === "UPCOMING" ? "Not started yet" : "Live - standings can still change"],
    ["Games in Contest", num(s.challengeCount)],
    ["Total Participants", num(s.participantCount)],
    ["Completed All Games", num(s.completedCount)],
    ["Partially Completed", num(s.partialCount)],
    ["Started (none finished)", num(s.inProgressCount)],
    ["Ranked Participants", num(s.rankedCount)],
    ["Ranking Rule", text(rule.summary)],
    ["Ranking Order", ruleOrder],
    ["Exported At (UTC)", exportedAt, DATE_FORMAT],
    ["Time Zone Note", "All dates and times in this workbook are in UTC."],
  ];
  for (const [field, value, format] of lines) {
    const row = summarySheet.addRow([field, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: "top", horizontal: "left" };
    if (format) row.getCell(2).numFmt = format;
  }

  // --- Sheet 2: one row per participant (complete result set, not a page) ---
  addTableSheet(workbook, SHEET_NAMES.results, RESULTS_COLUMNS, results.rows);

  // --- Sheet 3: one row per participant x contest game ---
  addTableSheet(workbook, SHEET_NAMES.details, DETAIL_COLUMNS, grid);

  return workbook;
}

// ---------- filename ----------

const MAX_NAME_CODE_POINTS = 60;

// Safe for every major OS and for the Content-Disposition header: control
// characters (incl. CR/LF — header injection) and path/shell/reserved
// characters are removed, whitespace collapses to "_", and the name is cut on
// a code-point boundary. Letters from any script are kept.
function safeNamePart(title) {
  const cleaned = String(title == null ? "" : title)
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\u202a-\u202e]/g, " ")
    .replace(/[\\/:*?"<>|%#&;'`{}[\]$!@^~=+,]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");
  const clipped = Array.from(cleaned).slice(0, MAX_NAME_CODE_POINTS).join("").replace(/[._-]+$/g, "");
  return clipped || "Contest";
}

// RFC 5987 percent-encoding for filename*.
const encodeRfc5987 = (value) =>
  encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

// "Learnova_Contest_<Name>_Results.xlsx": an ASCII `filename` fallback (non-
// ASCII letters become "_") plus a UTF-8 `filename*` so a Tamil or Hindi
// contest title still downloads with a readable name. No database id appears.
function contestExportFilenames(title) {
  const name = safeNamePart(title);
  const utf8 = `Learnova_Contest_${name}_Results.xlsx`;
  let asciiName = name.replace(/[^\x20-\x7e]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (!/[A-Za-z0-9]/.test(asciiName)) asciiName = "Contest";
  return { ascii: `Learnova_Contest_${asciiName}_Results.xlsx`, utf8 };
}

function contentDisposition(title) {
  const { ascii, utf8 } = contestExportFilenames(title);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(utf8)}`;
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

module.exports = {
  SHEET_NAMES,
  RESULTS_COLUMNS,
  DETAIL_COLUMNS,
  XLSX_MIME,
  buildContestResultsWorkbook,
  contestExportFilenames,
  contentDisposition,
};

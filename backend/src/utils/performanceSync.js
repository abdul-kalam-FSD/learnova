// Automatic Student Performance -> Excel synchronization.
//
// Design constraints this follows (see project brief, Sections 31-36):
//   - The database (QuizSession) remains the single source of truth.
//     This file never decides score/XP/completion — it only mirrors an
//     already-committed result into a reporting artifact.
//   - Sync happens automatically after every completed game — nobody
//     has to click "export" for the record to exist.
//   - A sync failure must NEVER fail the game completion request, and
//     must NEVER lose the underlying database result. Errors here are
//     caught and recorded on the session as sync_status: "failed" so
//     an admin can see and retry it — they are not rethrown.
//   - The same completed session is never written twice — rows are
//     upserted by session id (the "stable unique identifier" the
//     brief requires for duplicate prevention).
//
// There's no external Google Sheets credential configured for this
// project, so "Excel/Sheet synchronization" is implemented as an
// automatically-maintained .xlsx workbook on disk (using the
// exceljs dependency already in package.json) rather than a call to
// an external API this environment has no credentials for. If/when
// real Google Sheets credentials are added, swapping the "write a row
// to the workbook" step below for a Sheets API call is the only
// change needed — everything upstream of it (what triggers a sync,
// what a row contains, duplicate prevention, failure handling) stays
// the same.

const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const QuizSession = require("../models/QuizzSession");
const GameContent = require("../models/GameContent");
const Concept = require("../models/Concept");
const Chapter = require("../models/Chapter");
const Subject = require("../models/Subject");
const { GAME_TYPE_TO_LABEL } = require("./gameTypeRegistry");

const DATA_DIR = process.env.PERFORMANCE_SYNC_DIR || path.join(__dirname, "..", "..", "data");
const WORKBOOK_PATH = path.join(DATA_DIR, "student-performance.xlsx");
const SHEET_NAME = "Performance";

const COLUMNS = [
  { header: "Result ID", key: "resultId", width: 26 },
  { header: "Student ID", key: "studentId", width: 26 },
  { header: "Student Name", key: "studentName", width: 22 },
  { header: "Grade", key: "grade", width: 8 },
  { header: "Subject", key: "subject", width: 16 },
  { header: "Chapter", key: "chapter", width: 22 },
  { header: "Game", key: "game", width: 26 },
  { header: "Game Type", key: "gameType", width: 30 },
  { header: "Score", key: "score", width: 10 },
  { header: "Accuracy %", key: "accuracy", width: 12 },
  { header: "XP", key: "xp", width: 8 },
  { header: "Completion Status", key: "status", width: 16 },
  { header: "Date", key: "date", width: 22 },
];
const KEY_COLUMN = "resultId";

// ---------- pure helpers (unit-tested without any DB/file I/O) ----------

// Builds the flat row for one completed session. `related` carries
// whatever academic context was resolved for it (empty object for
// quiz/case sessions, which — same documented limitation as the admin
// Results screen — can't be attributed to one subject/chapter).
function buildPerformanceRow(session, related = {}) {
  const isGameSession = session.session_type === "game-session";
  const payload = session.game_payload || {};
  const correctCount = isGameSession
    ? payload.correct_count ?? (payload.is_correct ? 1 : 0)
    : session.questions.filter((q) => q.is_correct).length;
  const totalCount = isGameSession
    ? payload.total_count ?? 1
    : session.questions.length;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return {
    resultId: String(session._id),
    studentId: String(session.user_id?._id || session.user_id),
    studentName: related.studentName || session.user_id?.name || "",
    grade: related.grade ?? session.user_id?.grade ?? "",
    subject: related.subject || "",
    chapter: related.chapter || "",
    game: related.gameTitle || "",
    gameType: session.game_type ? GAME_TYPE_TO_LABEL[session.game_type] || session.game_type : "",
    score: `${correctCount}/${totalCount}`,
    accuracy,
    xp: session.xp_awarded || 0,
    status: session.completed_at ? "Completed" : "In Progress",
    date: session.completed_at ? new Date(session.completed_at).toISOString() : "",
  };
}

// Finds the row matching this result's id and overwrites it in place;
// appends a new row otherwise. This is the duplicate-prevention rule
// (Section 35): re-syncing the same session updates, never duplicates.
// `columns` defaults to the module's real layout but is accepted as a
// parameter so it isn't silently coupled to a global — this is also
// what lets unit tests exercise the upsert logic against a small
// worksheet without wiring up all 13 production columns.
function upsertRow(worksheet, row, columns = COLUMNS) {
  const keyColIndex = columns.findIndex((c) => c.key === KEY_COLUMN) + 1;
  let targetRow = null;

  worksheet.eachRow({ includeEmpty: false }, (r, rowNumber) => {
    if (rowNumber === 1) return; // header
    if (r.getCell(keyColIndex).value === row[KEY_COLUMN]) {
      targetRow = r;
    }
  });

  if (targetRow) {
    columns.forEach((c, i) => {
      targetRow.getCell(i + 1).value = row[c.key];
    });
  } else {
    worksheet.addRow(columns.map((c) => row[c.key]));
  }
}

async function loadOrCreateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(WORKBOOK_PATH)) {
    await workbook.xlsx.readFile(WORKBOOK_PATH);
  }
  let sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    sheet = workbook.addWorksheet(SHEET_NAME);
    sheet.columns = COLUMNS;
    sheet.getRow(1).font = { bold: true };
  }
  return { workbook, sheet };
}

// Resolves Subject/Chapter/Game name for a game-session row. Returns
// {} for anything else (documented limitation — see buildPerformanceRow).
async function resolveAcademicContext(session) {
  if (session.session_type !== "game-session" || !session.content_id) return {};
  const content = await GameContent.findById(session.content_id);
  if (!content) return {};
  const concept = await Concept.findById(content.concept_id);
  if (!concept) return { gameTitle: content.title };
  const chapter = await Chapter.findById(concept.chapter_id);
  if (!chapter) return { gameTitle: content.title };
  const subject = await Subject.findById(chapter.subject_id);
  return {
    gameTitle: content.title,
    chapter: chapter.title,
    subject: subject?.name || "",
  };
}

// Serializes writes so two completions finishing at the same moment
// (same Node process) can't race each other reading/overwriting the
// same workbook file. This is process-local — a multi-instance
// deployment would need a real lock (e.g. a DB-backed mutex or moving
// the write to a queue worker) instead; documented here rather than
// silently assumed to be safe at scale.
let writeQueue = Promise.resolve();
function enqueue(task) {
  const next = writeQueue.then(task, task);
  // Swallow so one failed task doesn't poison the rest of the queue.
  writeQueue = next.catch(() => {});
  return next;
}

// Main entry point — call after a session is committed as completed.
// Never throws: returns { status: "synced" | "failed", error? }, and
// also persists that status onto the session itself so
// GET /admin/results can show it and a retry endpoint can find
// failures to retry.
async function syncSessionToExcel(sessionId) {
  return enqueue(async () => {
    try {
      const session = await QuizSession.findById(sessionId).populate("user_id", "name grade");
      if (!session || !session.completed_at) {
        throw new Error("Session not found or not completed");
      }

      const related = await resolveAcademicContext(session);
      const row = buildPerformanceRow(session, related);

      fs.mkdirSync(DATA_DIR, { recursive: true });
      const { workbook, sheet } = await loadOrCreateWorkbook();
      upsertRow(sheet, row);
      await workbook.xlsx.writeFile(WORKBOOK_PATH);

      session.sync_status = "synced";
      session.synced_at = new Date();
      session.sync_error = undefined;
      await session.save();

      return { status: "synced" };
    } catch (err) {
      // The database result already committed before this function
      // was ever called (see gameControllers.completeGame) — a sync
      // failure here must not roll that back or surface as a game
      // error to the student.
      try {
        await QuizSession.findByIdAndUpdate(sessionId, {
          sync_status: "failed",
          sync_error: err.message,
        });
      } catch {
        // If even recording the failure fails (e.g. DB is down), there's
        // nothing more this function can safely do without risking the
        // caller's own transaction/response.
      }
      return { status: "failed", error: err.message };
    }
  });
}

module.exports = {
  WORKBOOK_PATH,
  buildPerformanceRow,
  upsertRow,
  syncSessionToExcel,
};

import { useEffect, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import AdminTabs from "../components/AdminTabs";
import "../Admin.css";

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const SESSION_TYPES = [
  { value: "", label: "All session types" },
  { value: "weak-concept-targeted", label: "Weak Concept Practice" },
  { value: "quick-5min", label: "Quick Practice" },
  { value: "chapter-review", label: "Chapter Review" },
  { value: "case-investigation", label: "Case Investigation" },
];

function AdminResults() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [downloadingSynced, setDownloadingSynced] = useState(false);
  // sessionId -> "retrying" | "error". Kept separate from the main
  // `data` state so a retry in flight never has to re-render the
  // whole table or clobber filters/pagination.
  const [retryState, setRetryState] = useState({});

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const buildParams = (includePagination) => {
    const params = {};
    if (search) params.search = search;
    if (grade) params.grade = grade;
    if (sessionType) params.sessionType = sessionType;
    if (from) params.from = from;
    if (to) params.to = to;
    if (includePagination) {
      params.page = page;
      params.limit = 20;
    }
    return params;
  };

  useEffect(() => {
    // react-hooks/set-state-in-effect flags this, but it's React's own
    // documented "fetching data in an Effect" pattern (react.dev's Effects
    // guide): resetting loading/error here shows a fresh loading state
    // immediately when a dependency changes, instead of stale data while
    // the new request is in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    api
      .get("/admin/results", { params: buildParams(true) })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, grade, sessionType, from, to, page]);

  const handleExport = () => {
    setExporting(true);
    api
      .get("/admin/results/export", {
        params: buildParams(false),
        responseType: "blob",
      })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "leveled-results.xlsx");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setExporting(false));
  };

  const handleDownloadSynced = () => {
    setDownloadingSynced(true);
    api
      .get("/admin/results/synced-file", { responseType: "blob" })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "student-performance-synced.xlsx");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setDownloadingSynced(false));
  };

  // Retries a failed sync for one row, then patches just that row's
  // syncStatus/syncedAt in place from the response — no full re-fetch,
  // so filters/pagination/scroll position are undisturbed.
  const handleRetrySync = (sessionId) => {
    setRetryState((s) => ({ ...s, [sessionId]: "retrying" }));
    api
      .post(`/admin/results/${sessionId}/retry-sync`)
      .then((res) => {
        setData((d) => ({
          ...d,
          results: d.results.map((r) =>
            r.sessionId === sessionId
              ? { ...r, syncStatus: res.data.status, syncedAt: new Date().toISOString() }
              : r,
          ),
        }));
        setRetryState((s) => {
          const next = { ...s };
          delete next[sessionId];
          return next;
        });
      })
      .catch(() => {
        setRetryState((s) => ({ ...s, [sessionId]: "error" }));
      });
  };

  return (
    <div className="admin-page p-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="admin-page__title">Results</h1>
        <div className="admin-page__header-actions">
          <button
            className={`admin-page__export-btn admin-page__export-btn--secondary${downloadingSynced ? " admin-page__export-btn--disabled" : ""}`}
            onClick={handleDownloadSynced}
            disabled={downloadingSynced}
          >
            {downloadingSynced ? "Downloading..." : "Download Synced Workbook"}
          </button>
          <button
            className={`admin-page__export-btn${exporting ? " admin-page__export-btn--disabled" : ""}`}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Export to Excel"}
          </button>
        </div>
      </div>
      <p className="admin-page__subtitle mb-4">
        {data ? `${data.total} result${data.total === 1 ? "" : "s"}` : "\u00A0"}
      </p>

      <AdminTabs />

      <div className="admin-page__toolbar mb-2">
        <input
          className="admin-page__search"
          type="text"
          placeholder="Search by student name or email"
          aria-label="Search by student name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="admin-page__select"
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All grades</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        <select
          className="admin-page__select"
          value={sessionType}
          onChange={(e) => {
            setSessionType(e.target.value);
            setPage(1);
          }}
        >
          {SESSION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-page__toolbar mb-4">
        <input
          className="admin-page__search"
          type="date"
          aria-label="From date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <input
          className="admin-page__search"
          type="date"
          aria-label="To date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading && <PageLoading label="Loading results..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && data && data.results.length === 0 && (
        <EmptyState
          icon="📊"
          title="No results found"
          subtitle="Try widening your filters."
        />
      )}

      {!loading && !error && data && data.results.length > 0 && (
        <>
          <div className="admin-table__wrapper mb-4">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-table__head-cell">Student</th>
                  <th className="admin-table__head-cell">Grade</th>
                  <th className="admin-table__head-cell">Session</th>
                  <th className="admin-table__head-cell">Game</th>
                  <th className="admin-table__head-cell">Completed</th>
                  <th className="admin-table__head-cell">Score</th>
                  <th className="admin-table__head-cell">Accuracy</th>
                  <th className="admin-table__head-cell">XP</th>
                  <th className="admin-table__head-cell">Sync Status</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.sessionId} className="admin-table__row">
                    <td className="admin-table__cell">
                      {r.studentName}
                      <br />
                      <span className="admin-page__subtitle">{r.studentEmail}</span>
                    </td>
                    <td className="admin-table__cell">{r.grade}</td>
                    <td className="admin-table__cell">{r.sessionTypeLabel}</td>
                    <td className="admin-table__cell">
                      {r.gameTitle ? (
                        <>
                          {r.gameTitle}
                          {(r.subject || r.chapter) && (
                            <>
                              <br />
                              <span className="admin-page__subtitle">
                                {[r.subject, r.chapter].filter(Boolean).join(" · ")}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="admin-page__subtitle">—</span>
                      )}
                    </td>
                    <td className="admin-table__cell">
                      {new Date(r.completedAt).toLocaleDateString()}
                    </td>
                    <td className="admin-table__cell">
                      {r.correctCount}/{r.totalQuestions}
                    </td>
                    <td className="admin-table__cell admin-table__accuracy">
                      {r.accuracy}%
                    </td>
                    <td className="admin-table__cell">+{r.xpAwarded}</td>
                    <td className="admin-table__cell">
                      <span
                        className={`sync-status-badge sync-status-badge--${r.syncStatus || "pending"}`}
                      >
                        {(r.syncStatus || "pending") === "synced"
                          ? "Synced"
                          : r.syncStatus === "failed"
                            ? "Failed"
                            : "Pending"}
                      </span>
                      {r.syncStatus === "failed" && (
                        <button
                          className="sync-retry-btn"
                          onClick={() => handleRetrySync(r.sessionId)}
                          disabled={retryState[r.sessionId] === "retrying"}
                        >
                          {retryState[r.sessionId] === "retrying" ? "Retrying..." : "Retry"}
                        </button>
                      )}
                      {retryState[r.sessionId] === "error" && (
                        <div className="sync-retry-error">Retry failed</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="admin-page__pagination">
              <button
                className={`admin-page__page-btn${page <= 1 ? " admin-page__page-btn--disabled" : ""}`}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Prev
              </button>
              <span className="admin-page__page-info">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                className={`admin-page__page-btn${page >= data.totalPages ? " admin-page__page-btn--disabled" : ""}`}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminResults;

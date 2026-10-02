import { useEffect, useState } from "react";
import EmptyState from "./EmptyState";
import ExportExcelButton from "./ExportExcelButton";
import Modal from "./Modal";
import PageLoading from "./PageLoading";
import {
  CHALLENGE_STATUS_LABELS,
  PARTICIPATION_LABELS,
  contestPlace,
  formatContestTime,
  formatDuration,
  formatPercent,
} from "../utils/contestDisplay";
import "../Contests.css";

const rankText = (row) => (row.rank == null ? "—" : `#${row.rank}`);

// One participant's per-game breakdown (opened from a table row).
function ParticipantModal({ row, loadParticipant, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadParticipant(row.studentId)
      .then((res) => setDetail(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.studentId]);

  return (
    <Modal title={row.name} onClose={onClose}>
      <p className="contest-results__sub" style={{ marginBottom: 8 }}>
        {row.email ? `${row.email} · ` : ""}
        {row.rank == null ? "Not ranked" : `Rank #${row.rank}`} · {row.challengesSolved} of {row.challengeCount} solved ·{" "}
        {row.xpEarned} XP
      </p>
      {error && <p className="contest-results__error">{error}</p>}
      {!detail && !error && <PageLoading label="Loading details..." />}
      {detail && (
        <div className="contest-results__table-wrap">
          <table className="contest-results__table" style={{ minWidth: 0 }}>
            <thead>
              <tr>
                <th>Game</th>
                <th>Status</th>
                <th>Answers</th>
                <th>XP</th>
                <th>Tries</th>
              </tr>
            </thead>
            <tbody>
              {detail.challenges.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.title}
                    {c.label ? <span className="contest-results__sub">{c.label}</span> : null}
                  </td>
                  <td>
                    {CHALLENGE_STATUS_LABELS[c.status]}
                    {c.status === "COMPLETED" ? (
                      <span className="contest-results__sub">{c.isCorrect ? "Solved" : "Not solved"}</span>
                    ) : null}
                  </td>
                  <td>{c.status === "COMPLETED" ? `${c.correctAnswers}/${c.totalAnswers}` : "—"}</td>
                  <td>{c.xpAwarded ?? "—"}</td>
                  <td>{c.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

// Shared by the teacher and admin result pages. It only DISPLAYS what the
// server computed — rank, counts, XP and times all come from the API; nothing
// here calculates or can alter a result.
//
//   loadResults(page)       -> axios promise for the paginated results
//   loadParticipant(id)     -> axios promise for one student's breakdown
//   exportUrl               when given, an "Export Excel" button is shown — but
//                           only once the server has authorised and returned
//                           the results (a failed/forbidden load shows none)
//   exportButtonClassName   lets each portal use its own button style
function ContestResultsView({ loadResults, loadParticipant, exportUrl, exportButtonClassName = "contest-results__btn" }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadResults(page)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (error) return <p className="contest-results__error">{error}</p>;
  if (!data) return <PageLoading label="Loading results..." />;

  const { contest, summary, rows } = data;

  return (
    <div>
      <p className="contest-results__sub">
        {contest.title} · Grade {contest.grade} · {contestPlace(contest)}
      </p>
      <p className="contest-results__sub">
        {formatContestTime(contest.startAt)} → {formatContestTime(contest.endAt)} ·{" "}
        {data.final ? "Final results" : data.phase === "UPCOMING" ? "Not started yet" : "Live standings"}
      </p>

      {exportUrl && (
        <div className="contest-results__actions">
          <ExportExcelButton url={exportUrl} className={exportButtonClassName} />
        </div>
      )}

      <div className="contest-results__summary">
        {[
          ["Participants", summary.participantCount],
          ["Completed all", summary.completedCount],
          ["Partly done", summary.partialCount],
          ["Just started", summary.inProgressCount],
          ["Ranked", summary.rankedCount],
        ].map(([label, value]) => (
          <div key={label} className="contest-results__stat">
            <p className="contest-results__stat-value">{value}</p>
            <p className="contest-results__stat-label">{label}</p>
          </div>
        ))}
      </div>
      <p className="contest-results__rule">{data.rankingRule.summary}</p>

      {rows.length === 0 && data.total === 0 ? (
        <EmptyState
          icon="🏆"
          title="No one has played yet"
          subtitle={
            data.phase === "UPCOMING"
              ? "Results will appear here once the contest starts and students play."
              : "Results will appear here as students take part."
          }
        />
      ) : (
        <>
          <div className="contest-results__table-wrap">
            <table className="contest-results__table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Solved</th>
                  <th>Correct</th>
                  <th>Accuracy</th>
                  <th>XP</th>
                  <th>Finish time</th>
                  <th>Last played</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId}>
                    <td className="contest-results__rank">{rankText(r)}</td>
                    <td>
                      {r.name}
                      {r.email ? <span className="contest-results__sub">{r.email}</span> : null}
                    </td>
                    <td>{PARTICIPATION_LABELS[r.status]}</td>
                    <td>
                      {r.challengesSolved}/{r.challengeCount}
                    </td>
                    <td>
                      {r.correctAnswers}/{r.totalAnswers}
                    </td>
                    <td>{formatPercent(r.accuracy)}</td>
                    <td>{r.xpEarned}</td>
                    <td>{formatDuration(r.elapsedSeconds)}</td>
                    <td>{formatContestTime(r.lastCompletedAt || r.firstStartedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="contest-results__btn"
                        onClick={() => setSelected(r)}
                        aria-label={`Details for ${r.name}`}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="contest-results__pager">
              <button type="button" className="contest-results__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                className="contest-results__btn"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selected && <ParticipantModal row={selected} loadParticipant={loadParticipant} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default ContestResultsView;

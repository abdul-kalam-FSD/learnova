import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import {
  CHALLENGE_STATUS_LABELS,
  PARTICIPATION_LABELS,
  contestPlace,
  formatDuration,
  formatPercent,
} from "../utils/contestDisplay";
import "../Home.css";
import "../Contests.css";

function LeaderboardRow({ row }) {
  return (
    <div className={`contest-leaderboard__row${row.isCurrentUser ? " contest-leaderboard__row--me" : ""}`}>
      <span className="contest-leaderboard__rank">{row.rank == null ? "—" : row.rank}</span>
      <div>
        <p className="contest-leaderboard__name">
          {row.name}
          {row.isCurrentUser ? " (you)" : ""}
        </p>
        <p className="contest-leaderboard__meta">
          {row.challengesSolved} solved · {row.correctAnswers}/{row.totalAnswers} correct
        </p>
      </div>
      <span className="contest-leaderboard__score">{formatDuration(row.elapsedSeconds)}</span>
    </div>
  );
}

// A student's own contest result plus the public standings. Everything shown
// (rank, counts, XP, times) is computed by the server from stored game
// sessions; this page only displays it. Other students appear on the
// leaderboard by name, rank and outcome only.
function ContestResult() {
  const { contestId } = useParams();
  const [mine, setMine] = useState(null);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/student/contests/${contestId}/result`),
      api.get(`/student/contests/${contestId}/leaderboard`),
    ])
      .then(([r, l]) => {
        setMine(r.data);
        setBoard(l.data);
      })
      .catch((err) => {
        if (err.response?.status === 404 || err.response?.status === 400) setNotFound(true);
        else setError(err.response?.data?.message || err.message);
      });
  }, [contestId]);

  if (notFound) {
    return (
      <div className="home min-h-screen p-4 max-w-md lg:max-w-3xl mx-auto">
        <EmptyState
          icon="🔎"
          title="Contest not found"
          subtitle="It may not be available for your grade."
          action={<Link to="/contests" className="btn-pill">Back to Contests</Link>}
        />
      </div>
    );
  }
  if (error) return <p className="p-4 home__error">Error: {error}</p>;
  if (!mine || !board) return <PageLoading label="Loading results..." />;

  const { contest, result } = mine;
  const stats = result
    ? [
        ["Games solved", `${result.challengesSolved} of ${result.challengeCount}`],
        ["Correct answers", `${result.correctAnswers}/${result.totalAnswers}`],
        ["Accuracy", formatPercent(result.accuracy)],
        ["XP earned", result.xpEarned],
        ["Finish time", formatDuration(result.elapsedSeconds)],
        ["Progress", formatPercent(result.completionPercent)],
      ]
    : [];

  return (
    <div className="home min-h-screen p-4 max-w-md lg:max-w-3xl mx-auto">
      <Link to={`/contests/${contest.id}`} className="contest-details__back">
        ← Back to contest
      </Link>
      <h2 className="chapters-page__title mb-1">{contest.title}</h2>
      <p className="chapters-page__subtitle mb-3">
        Grade {contest.grade} · {contestPlace(contest)}
      </p>
      <p className="contest-details__notice">
        {mine.phase === "UPCOMING"
          ? "This contest hasn't started yet, so there are no results."
          : mine.final
            ? "This contest has ended — these are the final results."
            : "This contest is still live, so the standings can still change."}
      </p>

      <h3 className="contests__group-title">Your result</h3>
      {!mine.participated ? (
        <EmptyState
          icon="🎮"
          title="You haven't played this contest yet"
          subtitle={mine.phase === "ACTIVE" ? "Open the contest and play a game to get on the board." : "You didn't take part in this contest."}
          action={mine.phase === "ACTIVE" ? <Link to={`/contests/${contest.id}`} className="btn-pill">Go to contest</Link> : null}
        />
      ) : (
        <>
          <div className="contest-card" style={{ cursor: "default" }}>
            <div className="contest-card__top">
              <div>
                <p className="contest-card__title">
                  {result.rank == null ? "Not ranked yet" : `You're #${result.rank} of ${mine.rankedCount}`}
                </p>
                <p className="contest-card__meta">
                  {result.rank == null
                    ? "Solve a game (all answers right) to join the leaderboard."
                    : `${PARTICIPATION_LABELS[result.status]}`}
                </p>
              </div>
              <span className="contest-pill">{PARTICIPATION_LABELS[result.status]}</span>
            </div>
          </div>

          <div className="contest-results__summary">
            {stats.map(([label, value]) => (
              <div key={label} className="contest-results__stat">
                <p className="contest-results__stat-value">{value}</p>
                <p className="contest-results__stat-label">{label}</p>
              </div>
            ))}
          </div>

          {result.challenges.map((c) => (
            <div key={c.id} className="contest-challenge">
              <div>
                <p className="contest-challenge__title">{c.title}</p>
                <p className="contest-challenge__meta">
                  {c.label || "Game"}
                  {c.status === "COMPLETED" ? ` · ${c.correctAnswers}/${c.totalAnswers} correct` : ""}
                </p>
              </div>
              <div className="contest-challenge__side">
                <span
                  className={
                    c.status === "COMPLETED"
                      ? c.isCorrect
                        ? "contest-pill contest-pill--done"
                        : "contest-pill contest-pill--wrong"
                      : "contest-pill"
                  }
                >
                  {c.status === "COMPLETED"
                    ? c.isCorrect
                      ? `Solved · +${c.xpAwarded ?? 0} XP`
                      : "Not solved"
                    : CHALLENGE_STATUS_LABELS[c.status]}
                </span>
              </div>
            </div>
          ))}
        </>
      )}

      <h3 className="contests__group-title">Leaderboard</h3>
      {board.leaderboard.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No one is on the leaderboard yet"
          subtitle="Be the first to solve a game in this contest."
        />
      ) : (
        <div role="list" aria-label="Leaderboard">
          {board.leaderboard.map((row) => (
            <LeaderboardRow key={`${row.rank}-${row.name}-${row.isCurrentUser}`} row={row} />
          ))}
        </div>
      )}
      {board.currentUser && (
        <>
          <p className="contest-card__meta" style={{ margin: "10px 0 6px" }}>
            Your position
          </p>
          <LeaderboardRow row={board.currentUser} />
        </>
      )}
      <p className="contest-results__rule">{board.rankingRule.summary}</p>
    </div>
  );
}

export default ContestResult;

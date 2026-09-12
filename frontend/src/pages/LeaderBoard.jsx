import { useEffect, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import "../LeaderBoard.css";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "overall", label: "Overall" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

const initials = (name) => (name ? name.trim()[0]?.toUpperCase() : "?");

// Hoisted out of Podium (react-hooks/static-components): a component
// declared inside another component's render body gets torn down and
// recreated on every render, silently resetting any state/DOM identity
// it holds. Block is stateless here, but hoisting it is the fix either
// way — it doesn't need Podium's scope for anything.
function Block({ entry, place }) {
  return (
    <div className={`podium__block podium__block--${place}`}>
      <div className="podium__avatar">
        {initials(entry.name)}
        <span className="podium__medal">{MEDALS[entry.rank - 1]}</span>
      </div>
      <p className="podium__name">
        {entry.name}
        {entry.isCurrentUser && <span className="leaderboard__you-tag"> (You)</span>}
      </p>
      <p className="podium__xp">{entry.xp} XP</p>
      <div className="podium__stand">{entry.rank}</div>
    </div>
  );
}

// Podium: renders rank 2 (left), rank 1 (center, tallest), rank 3 (right).
// Pure presentation over data already fetched — no extra API calls.
function Podium({ top3 }) {
  const [first, second, third] = top3;

  return (
    <div className="podium">
      {second && <Block entry={second} place="second" />}
      {first && <Block entry={first} place="first" />}
      {third && <Block entry={third} place="third" />}
    </div>
  );
}

function Leaderboard() {
  const [period, setPeriod] = useState("weekly");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const loading = data === null && !error;

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/leaderboard?period=${period}`)
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    setData(null);
    setError("");
  };

  const currentUserInTopList =
    data?.leaderboard?.some((e) => e.isCurrentUser) ?? false;

  return (
    <div className="leaderboard p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
      <h2 className="leaderboard__title">Leaderboard</h2>

      <div className="leaderboard__tabs">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePeriodChange(p.key)}
            className={`leaderboard__tab${period === p.key ? " leaderboard__tab--active" : ""}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && <PageLoading label="Loading leaderboard..." />}

      {error && <p className="leaderboard__error">Error: {error}</p>}

      {!loading && !error && data && (
        <>
          {/* Phase 8 (item #2 — legacy wording audit): "investigation"
              only described case sessions; the leaderboard ranks XP
              from any completed session, games included. */}
          {data.leaderboard.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="Play a game to appear here."
            />
          ) : (
            <>
              {data.leaderboard.length >= 3 && (
                <Podium top3={data.leaderboard.slice(0, 3)} />
              )}
              <div className="leaderboard__card">
                {(data.leaderboard.length >= 3
                  ? data.leaderboard.slice(3)
                  : data.leaderboard
                ).map((entry) => (
                  <div
                    key={entry.userId}
                    className={`leaderboard__row${entry.isCurrentUser ? " leaderboard__row--you" : ""}`}
                  >
                    <span className="leaderboard__rank">
                      {MEDALS[entry.rank - 1] || entry.rank}
                    </span>
                    <span className="leaderboard__name">
                      {entry.name}
                      {entry.isCurrentUser && (
                        <span className="leaderboard__you-tag"> (You)</span>
                      )}
                    </span>
                    <span className="leaderboard__xp">{entry.xp} XP</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {data.currentUser && !currentUserInTopList && (
            <div className="leaderboard__you-outside">
              <span className="leaderboard__rank">
                #{data.currentUser.rank}
              </span>
              <span className="leaderboard__name">
                {data.currentUser.name}
                <span className="leaderboard__you-tag"> (You)</span>
              </span>
              <span className="leaderboard__xp">
                {data.currentUser.xp} XP
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Leaderboard;
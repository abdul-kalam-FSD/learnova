import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import ProgressBar from "../components/ProgressBar";
import { GAME_TYPE_TO_ROUTE } from "../games/gameRegistry";
import { PHASE_LABELS, formatContestTime, contestPlace } from "../utils/contestDisplay";
import "../Home.css";
import "../Contests.css";

function challengeStatus(c) {
  if (c.status === "COMPLETED") {
    return c.isCorrect
      ? { label: `Completed · +${c.xpAwarded ?? 0} XP`, className: "contest-pill contest-pill--done" }
      : { label: "Completed", className: "contest-pill contest-pill--wrong" };
  }
  if (c.status === "IN_PROGRESS") return { label: "In progress", className: "contest-pill contest-pill--upcoming" };
  return { label: "Not started", className: "contest-pill" };
}

// One contest: its games and the student's own progress on each. The Play
// button only navigates into the existing game screen — it carries the
// contest along as navigation state, and the SERVER re-validates it when
// the game actually starts, so a disabled/hidden button is never the only
// protection.
function ContestDetails() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Fetched on every visit, so coming back from a game shows fresh progress.
  useEffect(() => {
    api
      .get(`/student/contests/${contestId}`)
      .then((res) => setContest(res.data))
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
  if (!contest) return <PageLoading label="Loading contest..." />;

  const play = (challenge) => {
    const route = GAME_TYPE_TO_ROUTE[challenge.gameType];
    if (!route) return;
    navigate(route, {
      state: { contest: { id: contest.id, title: contest.title, gameType: challenge.gameType } },
    });
  };

  const phaseNotice = {
    UPCOMING: `This contest starts ${formatContestTime(contest.startAt)}. You can look around now — the games unlock when it begins.`,
    ACTIVE: `Live now — ends ${formatContestTime(contest.endAt)}. Each game counts once, so give it your best try.`,
    ENDED: `This contest ended ${formatContestTime(contest.endAt)}. You can no longer start games for it.`,
  }[contest.phase];

  const disabledReason = (c) => {
    if (c.status === "COMPLETED") return "Done";
    if (contest.phase === "UPCOMING") return "Not open yet";
    if (contest.phase === "ENDED") return "Contest ended";
    return "Unavailable";
  };

  return (
    <div className="home min-h-screen p-4 max-w-md lg:max-w-3xl mx-auto">
      <Link to="/contests" className="contest-details__back">
        ← All contests
      </Link>
      <h2 className="chapters-page__title mb-1">{contest.title}</h2>
      <p className="chapters-page__subtitle mb-1">
        {contestPlace(contest)}
        {contest.teacherName ? ` · by ${contest.teacherName}` : ""}
      </p>
      <p className="contest-card__meta">
        {formatContestTime(contest.startAt)} → {formatContestTime(contest.endAt)} ·{" "}
        <strong>{PHASE_LABELS[contest.phase]}</strong>
      </p>

      {contest.description && <p className="contest-details__notice">{contest.description}</p>}
      <p className="contest-details__notice">{phaseNotice}</p>

      <p className="contest-card__meta" style={{ marginBottom: 6 }}>
        {contest.progress.completed} of {contest.progress.total} games completed
      </p>
      <div className="mb-4">
        <ProgressBar value={contest.progress.completed} max={contest.progress.total || 1} variant="xp" />
      </div>

      <div>
        {contest.challenges.map((c, index) => {
          const status = challengeStatus(c);
          const playable = c.canPlay && Boolean(GAME_TYPE_TO_ROUTE[c.gameType]);
          return (
            <div key={c.id} className="contest-challenge">
              <div>
                <p className="contest-challenge__title">
                  {index + 1}. {c.title}
                </p>
                <p className="contest-challenge__meta">
                  {c.label || "Game"}
                  {c.difficulty ? ` · ${c.difficulty}` : ""}
                </p>
              </div>
              <div className="contest-challenge__side">
                <span className={status.className}>{status.label}</span>
                <button
                  type="button"
                  className="btn-pill contest-challenge__play"
                  disabled={!playable}
                  onClick={() => play(c)}
                  aria-label={`${c.status === "IN_PROGRESS" ? "Continue" : "Play"} ${c.title}`}
                >
                  {playable ? (c.status === "IN_PROGRESS" ? "Continue" : "Play") : disabledReason(c)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {contest.phase !== "UPCOMING" && (
        <p className="mt-3">
          <Link to={`/contests/${contest.id}/results`} className="btn-pill">
            View results &amp; leaderboard
          </Link>
        </p>
      )}

      {contest.phase === "ACTIVE" && (
        <p className="contest-card__meta mt-3">
          Tapping Play opens the game and shows only this contest&apos;s levels. XP, mastery and streaks work
          exactly like normal practice.
        </p>
      )}
    </div>
  );
}

export default ContestDetails;

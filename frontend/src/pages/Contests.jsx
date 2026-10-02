import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import { PHASE_LABELS, formatContestTime, contestPlace } from "../utils/contestDisplay";
import "../Home.css";
import "../Contests.css";

const PHASE_PILL_CLASS = {
  ACTIVE: "contest-pill contest-pill--live",
  UPCOMING: "contest-pill contest-pill--upcoming",
  ENDED: "contest-pill",
};

// Student contest list: published contests for the student's own grade,
// grouped by phase. Which contests appear, and which phase each is in, is
// decided entirely by the server (grade from the account, phase from the
// server clock) — this page only displays it.
function Contests() {
  const [contests, setContests] = useState(null);
  const [error, setError] = useState("");
  // 403 = not a real student account (guest / teacher / admin). The server's
  // message says why, so show it as a friendly state, not an error.
  const [blockedMessage, setBlockedMessage] = useState("");

  useEffect(() => {
    api
      .get("/student/contests")
      .then((res) => setContests(res.data.contests))
      .catch((err) => {
        const message = err.response?.data?.message || err.message;
        if (err.response?.status === 403) setBlockedMessage(message);
        else setError(message);
      });
  }, []);

  if (error) return <p className="p-4 home__error">Error: {error}</p>;

  const groups = ["ACTIVE", "UPCOMING", "ENDED"].map((phase) => ({
    phase,
    items: (contests || []).filter((c) => c.phase === phase),
  }));

  return (
    <div className="home min-h-screen p-4 max-w-md lg:max-w-3xl mx-auto">
      <h2 className="chapters-page__title mb-1">Contests</h2>
      <p className="chapters-page__subtitle mb-5">
        Challenges set by your teachers. Play Learnova games while a contest is live.
      </p>

      {blockedMessage && <EmptyState icon="🏆" title="Contests are for student accounts" subtitle={blockedMessage} />}

      {!blockedMessage && !contests && <PageLoading label="Loading contests..." />}

      {contests && contests.length === 0 && (
        <EmptyState
          icon="🏆"
          title="No contests yet"
          subtitle="When your teacher publishes a contest for your grade, it will show up here."
        />
      )}

      {contests &&
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.phase} aria-label={PHASE_LABELS[g.phase]}>
              <h3 className="contests__group-title">{PHASE_LABELS[g.phase]}</h3>
              {g.items.map((c) => (
                <Link key={c.id} to={`/contests/${c.id}`} className="contest-card">
                  <div className="contest-card__top">
                    <div>
                      <p className="contest-card__title">{c.title}</p>
                      <p className="contest-card__meta">{contestPlace(c)}</p>
                    </div>
                    <span className={PHASE_PILL_CLASS[c.phase]}>{PHASE_LABELS[c.phase]}</span>
                  </div>
                  <p className="contest-card__meta">
                    {formatContestTime(c.startAt)} → {formatContestTime(c.endAt)}
                  </p>
                  <p className="contest-card__meta">
                    {c.challengeCount} game{c.challengeCount === 1 ? "" : "s"} · {c.completedCount} of{" "}
                    {c.challengeCount} done{c.teacherName ? ` · by ${c.teacherName}` : ""}
                  </p>
                </Link>
              ))}
            </section>
          ))}
    </div>
  );
}

export default Contests;

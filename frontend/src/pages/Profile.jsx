import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import ThemeSwitcher from "../components/ThemeSwitcher";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import { getLevelProgress } from "../utils/level";
import { getAchievements } from "../utils/achievements";
import "../Profile.css";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  const [streams, setStreams] = useState([]);
  const [streamSaving, setStreamSaving] = useState(false);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data.user);
        // Streams only apply to Grade 11/12 (see models/Stream.js) —
        // skip the fetch entirely for everyone else.
        const grade = res.data.user.grade;
        if (grade === 11 || grade === 12) {
          api
            .get(`/public/standards/${grade}/streams`)
            .then((r) => setStreams(r.data.streams || []))
            .catch(() => setStreams([]));
        }
      })
      .catch((err) => setError(err.message));

    api
      .get("/profile/stats")
      .then((res) => setStats(res.data))
      .catch(() => {
        // Stats are a nice-to-have — if this fails, profile still renders
        // with core user info, just without the stats grid.
        setStats(null);
      });

    // The mastery breakdown UI moved to the standalone Progress tab,
    // but "Chapter Mastered" in Achievements still needs this data —
    // kept as a data-only fetch, not rendered here.
    api
      .get("/progress")
      .then((res) => setProgress(res.data))
      .catch(() => setProgress(null));
  }, []);

  const handleStreamChange = async (e) => {
    const streamId = e.target.value || null;
    setStreamSaving(true);
    try {
      await api.patch("/profile/stream", { streamId });
      setUser((prev) => ({ ...prev, stream_id: streamId }));
    } catch {
      // Non-critical — the dropdown just won't have saved; user can
      // retry. Not worth a blocking error banner on the whole page.
    } finally {
      setStreamSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (error) return <p className="p-4 profile__error">Error: {error}</p>;
  if (!user) return <PageLoading />;

  return (
    <div className="profile p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
      <div className="profile__header">
        <div className="profile__avatar">
          {user.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <p className="profile__name font-semibold text-lg">{user.name}</p>
        {/* Phase 8 (item #2 — legacy wording audit): was hardcoded
            "Bio Detective" for every student regardless of grade or
            subject, the same Biology-only leftover Home's hero already
            had fixed for it (see Home.jsx). Replaced with copy that's
            true for every student on this now-multi-subject platform. */}
        <p className="profile__tagline">Learnova Student</p>

        {(() => {
          const { level, xpIntoLevel, xpPerLevel, pct } = getLevelProgress(
            user.xp_total,
          );
          return (
            <div className="profile__level-block">
              <span className="profile__level-badge">Level {level}</span>
              <div
                className="profile__level-track"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="XP progress to next level"
              >
                <div
                  className="profile__level-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="profile__level-xp-label">
                {xpIntoLevel} / {xpPerLevel} XP
              </span>
            </div>
          );
        })()}

        <button onClick={handleLogout} className="profile__logout-link">
          ⎋ Logout
        </button>
      </div>

      <div className="profile__card mb-4">
        <div className="profile__row flex justify-between items-center p-3">
          <span className="profile__row-label">Grade</span>
          <span className="profile__row-value font-semibold">
            {user.grade}
          </span>
        </div>
        {(user.grade === 11 || user.grade === 12) && streams.length > 0 && (
          <div className="profile__row flex justify-between items-center p-3">
            <span className="profile__row-label">Stream</span>
            <select
              value={user.stream_id || ""}
              onChange={handleStreamChange}
              disabled={streamSaving}
              className="profile__row-value font-semibold"
              aria-label="Change your stream"
            >
              <option value="">Not set</option>
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="profile__row flex justify-between items-center p-3">
          <span className="profile__row-label">XP</span>
          <span className="profile__xp font-semibold">
            ⚡ {user.xp_total}
          </span>
        </div>
        <div className="profile__row flex justify-between items-center p-3">
          <span className="profile__row-label">Streak</span>
          <span className="profile__streak font-semibold">
            🔥 {user.streak_count}
          </span>
        </div>
      </div>

      {stats && (
        <>
          <div className="profile__stats-grid mb-4">
            <div className="profile__stat-card">
              <div className="profile__stat-icon">🧪</div>
              <div className="profile__stat-value">{stats.quizzesPlayed}</div>
              {/* Phase 8 (item #2): "Cases Played" mislabeled this count —
                  it's every completed session (game-session, weak-concept
                  practice, chapter review, case investigation, etc.), and
                  for most students the large majority are games, not
                  cases. "Games Played" matches the vocabulary Home
                  already uses ("Recently Played", "New Games", "All
                  Games") and matches what the number actually counts. */}
              <div className="profile__stat-label">Games Played</div>
            </div>
            <div className="profile__stat-card">
              <div className="profile__stat-icon">🎯</div>
              <div className="profile__stat-value">{stats.accuracy}%</div>
              <div className="profile__stat-label">Accuracy</div>
            </div>
            <div className="profile__stat-card">
              <div className="profile__stat-icon">🏆</div>
              <div className="profile__stat-value">{stats.totalScore}</div>
              <div className="profile__stat-label">Total Score</div>
            </div>
          </div>

          <div className="profile__card mb-4">
            <h3 className="profile__section-title">Recent Activity</h3>
            {/* Phase 8 (item #2): same "Cases Played" mislabeling —
                this fired for any student with zero completed
                sessions, including students who have only ever
                played games. Wording now matches Home's own
                achievements empty state ("Play a game to earn your
                first badge."). */}
            {stats.recentQuizzes.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No games played yet — play your first game!"
              />
            ) : (
              stats.recentQuizzes.map((q) => (
                <div
                  key={q.sessionId}
                  className="profile__row flex justify-between items-center p-3"
                >
                  <div>
                    <p className="profile__recent-title">{q.title}</p>
                    <p className="profile__recent-date">
                      {new Date(q.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="profile__recent-accuracy">
                    {q.accuracy}%
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {stats && (
        <div className="profile__card mb-4 p-3">
          <h3 className="profile__section-title mb-2">Achievements</h3>
          <div className="achievements__grid">
            {getAchievements({ user, stats, progress }).map((a) => (
              <div
                key={a.id}
                className={`achievement-badge${a.earned ? " achievement-badge--earned" : " achievement-badge--locked"}`}
              >
                <span className="achievement-badge__icon" aria-hidden="true">
                  {a.icon}
                </span>
                <span className="achievement-badge__title">{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="profile__card mb-4">
        <ThemeSwitcher />
      </div>
    </div>
  );
}
export default Profile;
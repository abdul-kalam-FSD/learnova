import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import ProgressBar from "../components/ProgressBar";
import PlayerHeader from "../components/PlayerHeader";
import { iconFor } from "../utils/chapterIcon";
import { getSubjectCategory } from "../utils/subjectTheme";
import { getLevelProgress } from "../utils/level";
import { GAME_TYPE_TO_ICON, GAME_TYPE_TO_ACTION } from "../games/gameRegistry";
import { useBackNavigation } from "../utils/useBackNavigation";
import "../Chapters.css";

// Phase 0B: SubjectWorld is the game-world hub students land on from
// Home's "Browse Chapters" — reuses the exact same /progress data the
// old flat Chapters.jsx list already used, plus /home (for the player
// header, same source Home.jsx's header reads) and /games/catalog
// (same source Home.jsx's "All Games" section reads, for the
// per-world "recommended mechanic" chip). No new backend endpoints,
// no invented stats, no lock/unlock system — every world stays
// reachable, exactly like SubjectChapters.jsx already does for
// chapters within a world.
function SubjectWorld() {
  const navigate = useNavigate();
  const goBack = useBackNavigation();
  const [subjectGroups, setSubjectGroups] = useState(null);
  const [player, setPlayer] = useState(null);
  const [catalogBySubject, setCatalogBySubject] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/progress"),
      api.get("/home").catch(() => null),
      api.get("/games/catalog").catch(() => null),
    ])
      .then(([progressRes, homeRes, catalogRes]) => {
        const bySubject = {};
        for (const ch of progressRes.data.chapters) {
          const subject = ch.subject_name || "General";
          if (!bySubject[subject]) bySubject[subject] = [];
          bySubject[subject].push(ch);
        }
        setSubjectGroups(Object.entries(bySubject));

        if (homeRes) {
          setPlayer({
            name: homeRes.data.name,
            xp_total: homeRes.data.xp_total,
            streak_count: homeRes.data.streak_count,
            grade: homeRes.data.grade,
          });
        }

        if (catalogRes) {
          const bySubjectCatalog = {};
          for (const entry of catalogRes.data.catalog || []) {
            bySubjectCatalog[entry.subject] = entry.gameTypes;
          }
          setCatalogBySubject(bySubjectCatalog);
        }
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <p className="p-4 chapters-page__error">Error: {error}</p>;
  if (!subjectGroups) return <PageLoading />;

  const { level, xpIntoLevel, xpPerLevel, pct: levelPct } = player
    ? getLevelProgress(player.xp_total)
    : { level: 1, xpIntoLevel: 0, xpPerLevel: 400, pct: 0 };

  return (
    <div className="chapters-page p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
      <button onClick={() => goBack("/home")} className="chapter-detail__back">
        ← Back to Home
      </button>

      {player && (
        <PlayerHeader
          name={player.name}
          level={level}
          xpIntoLevel={xpIntoLevel}
          xpPerLevel={xpPerLevel}
          levelPct={levelPct}
          streak={player.streak_count}
        />
      )}

      <div className="world-hub-heading mb-5">
        <div className="world-hub-heading__row">
          <h2 className="chapters-page__title world-hub-heading__title">Your Worlds</h2>
          {player?.grade && (
            <span className="subject-world__grade-badge">Grade {player.grade}</span>
          )}
        </div>
        <p className="chapters-page__subtitle world-hub-heading__subtitle">
          Pick a world to explore its chapters.
        </p>
      </div>

      {subjectGroups.length === 0 ? (
        <EmptyState
          icon="🌍"
          title="No worlds yet"
          subtitle="Chapters for your grade will show up here soon."
        />
      ) : (
        <div className="chapter-card__grid">
          {subjectGroups.map(([subjectName, chapters]) => {
            const totals = chapters.reduce(
              (acc, ch) => {
                acc.total += ch.total_concepts;
                acc.mastered += ch.breakdown.strong + ch.breakdown.learning;
                return acc;
              },
              { total: 0, mastered: 0 },
            );
            const pct =
              totals.total > 0
                ? Math.round((totals.mastered / totals.total) * 100)
                : 0;
            const completedChapters = chapters.filter((ch) => {
              const mastered = ch.breakdown.learning + ch.breakdown.strong;
              return ch.total_concepts > 0 && mastered === ch.total_concepts;
            }).length;

            // First chapter (in the grade's real order_index order,
            // preserved from /progress) that isn't fully mastered yet
            // — the world's "current mission". null when every
            // chapter in this world is already complete.
            const currentChapter = chapters.find((ch) => {
              const mastered = ch.breakdown.learning + ch.breakdown.strong;
              return !(ch.total_concepts > 0 && mastered === ch.total_concepts);
            });

            const catalogEntry = catalogBySubject[subjectName];
            const recommendedGame = catalogEntry && catalogEntry.length > 0 ? catalogEntry[0] : null;
            const category = getSubjectCategory(subjectName);

            return (
              <button
                key={subjectName}
                onClick={() => navigate(`/subjects/${encodeURIComponent(subjectName)}`)}
                className={`world-card world-card--${category}`}
              >
                <div className="world-card__top">
                  <div className="world-card__icon" aria-hidden="true">
                    {iconFor(subjectName, subjectName)}
                  </div>
                  <div className="world-card__body">
                    <p className="world-card__title">{subjectName}</p>
                    <ProgressBar value={pct} max={100} variant="primary" height={6} />
                    <p className="world-card__meta">
                      {completedChapters}/{chapters.length} chapters mastered ·{" "}
                      {pct}% mastery
                    </p>
                  </div>
                  <span className="world-card__arrow" aria-hidden="true">
                    ›
                  </span>
                </div>

                {currentChapter ? (
                  <div className="world-card__mission">
                    <span className="world-card__mission-label">Current Mission</span>
                    <p className="world-card__mission-title">{currentChapter.title}</p>
                  </div>
                ) : (
                  <span className="world-card__complete-badge">
                    ✓ All missions complete
                  </span>
                )}

                {recommendedGame ? (
                  <div className="world-card__recommended">
                    <span aria-hidden="true">
                      {GAME_TYPE_TO_ICON[recommendedGame.game_type] || "🎮"}
                    </span>
                    <span className="world-card__recommended-action">
                      {GAME_TYPE_TO_ACTION[recommendedGame.game_type] || "Play"}
                    </span>
                    <span>· {recommendedGame.label}</span>
                  </div>
                ) : (
                  <p className="world-empty-games">
                    No games yet for this world — chapters are still playable via Practice.
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SubjectWorld;
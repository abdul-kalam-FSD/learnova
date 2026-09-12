import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import SectionHeader from "../components/SectionHeader";
import GameCard from "../components/GameCard";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import { GAME_TYPE_TO_ROUTE, GAME_TYPE_TO_ICON } from "../games/gameRegistry";
import { getRecommendationReasonText } from "../utils/recommendationReason";
import "../Home.css";

// Practice tab (repurposed): previously a fixed nav destination into a
// single hardcoded demo Case ("Why Can't She Breathe?", Grade 10 Biology
// only — see backend/seedDemoCase.js) that showed a bare "No cases
// available yet" message for every other student. That flow still
// exists, unchanged, at pages/CaseInvestigation.jsx (route
// /practice/case) so the seeded demo and admin's Case CRUD
// (AdminCases.jsx) keep working — it's just no longer the primary nav
// destination.
//
// This screen instead surfaces the same adaptive Game Selection Engine
// Home.jsx uses (GET /games/recommended, GET /games/catalog), which
// already covers every subject via mastery state (weak/learning/strong),
// not just Biology.
//
// Phase 5A: the reason-copy map that used to live here directly was
// moved to utils/recommendationReason.js (shared with ChapterMission.jsx
// and Home.jsx) — same copy, single source of truth.

function Practice() {
  const navigate = useNavigate();
  const [recommendedGame, setRecommendedGame] = useState(null);
  const [gameCatalog, setGameCatalog] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/games/recommended").catch((err) => {
        if (err.response?.status === 404) return { data: null };
        throw err;
      }),
      api.get("/games/catalog"),
    ])
      .then(([recRes, catalogRes]) => {
        setRecommendedGame(recRes.data);
        setGameCatalog(catalogRes.data.catalog || []);
        setLoaded(true);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <p className="p-4 home__error">Error: {error}</p>;
  if (!loaded) return <PageLoading />;

  const hasAnything = recommendedGame || gameCatalog.length > 0;

  return (
    <div className="home min-h-screen p-4 max-w-md lg:max-w-3xl mx-auto">
      <h2 className="chapters-page__title mb-1">Practice</h2>
      <p className="chapters-page__subtitle mb-5">
        Pick up where you left off, or try something new.
      </p>

      {!hasAnything ? (
        <EmptyState
          icon="🧭"
          title="Practice content isn't available for your grade yet"
          subtitle="Your chapters may have games ready even if a recommended pick doesn't."
          action={
            <button
              // Phase 2 Batch A: matches Home.jsx's own "Browse Chapters" CTA,
              // which was already repointed from the old flat /chapters list
              // to /subjects in an earlier phase (see Home.jsx). This was the
              // one remaining "Browse Chapters" action still pointing at the
              // legacy route — /chapters itself stays live and unchanged.
              onClick={() => navigate("/subjects")}
              className="btn-pill home-hero__cta"
            >
              Browse Chapters <span aria-hidden="true">→</span>
            </button>
          }
        />
      ) : (
        <>
          {recommendedGame && (
            <button
              onClick={() =>
                navigate(GAME_TYPE_TO_ROUTE[recommendedGame.gameType] || "/chapters")
              }
              className="home-hero mb-5 text-left w-full"
            >
              <span className="home-hero__eyebrow">
                {GAME_TYPE_TO_ICON[recommendedGame.gameType] || "🎮"}{" "}
                {(recommendedGame.subject || "").toUpperCase()} · RECOMMENDED
              </span>
              <p className="home-hero__title">{recommendedGame.label}</p>
              <p className="home-hero__sub">
                {recommendedGame.title}
                {recommendedGame.difficulty
                  ? ` · ${recommendedGame.difficulty[0].toUpperCase()}${recommendedGame.difficulty.slice(1)} difficulty`
                  : ""}
                {getRecommendationReasonText(recommendedGame.reason)
                  ? ` — ${getRecommendationReasonText(recommendedGame.reason)}`
                  : ""}
              </p>
              <span className="btn-pill btn-pill-inverted home-hero__cta">
                Start Practice <span aria-hidden="true">→</span>
              </span>
            </button>
          )}

          {gameCatalog.length > 0 && (
            <div className="mb-5">
              <SectionHeader title="Practice by Subject" />
              {gameCatalog.map(({ subject, gameTypes }) => (
                <div key={subject} className="mb-3">
                  <p className="home-hero__eyebrow mb-2">
                    {subject.toUpperCase()}
                  </p>
                  <div className="flex flex-col gap-2">
                    {gameTypes.map(({ game_type, label, count }) => (
                      <GameCard
                        key={game_type}
                        icon={GAME_TYPE_TO_ICON[game_type] || "🎮"}
                        title={label}
                        subtitle={`${count} level${count === 1 ? "" : "s"}`}
                        onClick={() => navigate(GAME_TYPE_TO_ROUTE[game_type])}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Practice;

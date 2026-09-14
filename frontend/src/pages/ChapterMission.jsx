import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import GameCard from "../components/GameCard";
import PageLoading from "../components/PageLoading";
import { iconFor } from "../utils/chapterIcon";
import {
  GAME_TYPE_TO_ROUTE,
  GAME_TYPE_TO_ICON,
  GAME_TYPE_TO_ACTION,
} from "../games/gameRegistry";
import { getRecommendationReasonText } from "../utils/recommendationReason";
import { useBackNavigation } from "../utils/useBackNavigation";
import "../Chapters.css";

// Phase 0C: Subject World -> Chapter Journey -> Mission Brief -> Game
// Lobby (inside each game, already built in an earlier pass) ->
// Existing Game. This is a NEW route (/mission/:chapterId) that
// presents the SAME data the older /chapters/:id page already fetches
// (GET /chapters/:id — no new backend model, no duplicate registry),
// just framed as a mission instead of a bare concept list. The old
// /chapters/:id route and its ChapterDetails component are left
// completely untouched and still work.
//
// Every fact shown here comes from real data already returned by the
// API or already computed elsewhere in the app:
//   - subject name: passed via navigation state from the chapter
//     journey (SubjectChapters.jsx already knows it), same optional
//     pattern ChapterDetails.jsx already accepted and just didn't use.
//   - objective: composed from the chapter's own title + its real
//     concept count/list — never invented syllabus text.
//   - mission stage (Not Started / In Progress / Completed): derived
//     the exact same way SubjectChapters.jsx's stageState() already
//     does, from concepts[].mastery_state — no new/parallel state.
//   - mission choices: the chapter's own `games` list, labelled with
//     the existing GAME_TYPE_TO_ACTION registry (no new registry, no
//     invented XP/difficulty/timers/unlocks).
function stageFromConcepts(concepts) {
  if (!concepts || concepts.length === 0) return null;
  const mastered = concepts.filter(
    (c) => c.mastery_state === "learning" || c.mastery_state === "strong",
  ).length;
  if (mastered === concepts.length) {
    return { label: "Completed", icon: "✅" };
  }
  if (mastered > 0) {
    return { label: "In Progress", icon: "▶️" };
  }
  return { label: "Not Started", icon: "⚪" };
}

// Phase 4E: same reason-copy convention Practice.jsx already
// established for this exact field (GET /games/recommended's
// `reason`) — not a new vocabulary, just reused here so a chapter-
// scoped "Recommended for You" reads the same way the rest of the
// app already explains this field. If the API ever returns a reason
// value not in this map, no text is shown for it (real value, no
// invented fallback copy).
//
// Phase 5A: the REASON_COPY object that used to be duplicated here
// was moved to utils/recommendationReason.js (shared with Practice.jsx
// and Home.jsx) — same copy, single source of truth.

// Phase 4E, Step 2: the existing GET /games/recommended engine is
// global to the student (grade + mastery), not chapter-scoped — it
// can legitimately recommend a game that belongs to a different
// chapter entirely. This cross-check is the only thing standing
// between "personalized recommendation" and "recommendation that
// happens to be wrong for the page the student is looking at": it
// only returns the recommendation if its real gameType is present in
// THIS chapter's own real games[] list. No replacement/fallback pick
// is ever substituted — a non-match (or no recommendation at all)
// simply returns null, and the caller must not show anything in that
// case (see Step 4 / "no fake recommendation").
//
// Kept as a small pure function (no component state, no API calls) so
// it can be unit-tested directly, the same way Phase 4D's
// sortGamesByRegistryOrder was.
export function getChapterRecommendation(recommendedGame, games) {
  if (!recommendedGame || !recommendedGame.gameType) return null;
  if (!games || games.length === 0) return null;
  const belongsToChapter = games.some(
    (g) => g.game_type === recommendedGame.gameType,
  );
  return belongsToChapter ? recommendedGame : null;
}

function ChapterMission() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const goBack = useBackNavigation();
  const location = useLocation();
  const subjectNameFromNav = location.state?.subjectName || null;

  // Phase 2 Batch C: this used to be a plain navigate(-1) — fine when
  // the student actually arrived here via an in-app click (Subject
  // Chapters, Progress, etc.), but browser history on a direct URL
  // open or a page refresh has no prior in-app entry, so -1 could
  // send the student out of the app entirely rather than to the
  // canonical parent. react-router sets location.key to "default"
  // for that first/only history entry — everywhere else it's a real
  // generated key — so that's the same signal used here to tell the
  // two cases apart. When there IS real in-app history, this keeps
  // the exact previous behavior (navigate(-1)); when there isn't, it
  // falls back to the canonical Subject Chapters page for this
  // chapter's subject, or plain /subjects if the subject name wasn't
  // passed forward.
  //
  // Smooth-navigation task: routed through useBackNavigation() (goBack)
  // instead of navigate directly, so the fallback branches (an actual
  // PUSH, not history) still slide in from the left like a real Back
  // action — the navigate(-1) branch already gets that automatically
  // since react-router reports it as a POP.
  const goBackToChapters = () => {
    if (location.key !== "default") {
      goBack();
    } else if (subjectNameFromNav) {
      goBack(`/subjects/${encodeURIComponent(subjectNameFromNav)}`);
    } else {
      goBack("/subjects");
    }
  };

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const load = () => {
    setError(null);
    setNotFound(false);
    setData(null);
    api
      .get(`/chapters/${chapterId}`)
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err.response?.status === 404 || err.response?.status === 403) {
          setNotFound(true);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  // Phase 4E: reuses the exact same GET /games/recommended call
  // Home.jsx/Practice.jsx/useGameCompletionNav.js already make — no
  // new recommendation algorithm, no new endpoint. This is the
  // student's global recommendation; getChapterRecommendation (above)
  // is what scopes it down to "does this belong to the chapter the
  // student is currently looking at."
  //
  // Per Step 4: a 404 ("no games available yet"), a network failure,
  // or any other error must never block Chapter Missions from
  // rendering — so every failure path here just leaves
  // recommendedGame as null, exactly like a real "no match" would.
  const [recommendedGame, setRecommendedGame] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/games/recommended")
      .then((res) => {
        if (!cancelled) setRecommendedGame(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setRecommendedGame(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (notFound) {
    return (
      <div className="chapters-page p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
        <EmptyState
          icon="🔍"
          title="Mission not found"
          subtitle="This chapter isn't available — it may not exist, or it isn't part of your grade."
          action={
            <button onClick={() => navigate("/subjects")} className="btn-primary px-4 py-2 rounded-lg font-semibold text-sm">
              Browse Subject Worlds
            </button>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="chapters-page p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
        <p className="chapters-page__error mb-4">Error: {error}</p>
        <div className="flex gap-3">
          <button onClick={load} className="btn-primary px-4 py-2 rounded-lg font-semibold text-sm">
            Retry
          </button>
          <button onClick={() => navigate("/subjects")} className="btn-secondary px-4 py-2 rounded-lg font-semibold text-sm">
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <PageLoading label="Preparing your mission..." />;

  const { chapter, concepts, games } = data;
  const stage = stageFromConcepts(concepts);
  const mastered = concepts.filter(
    (c) => c.mastery_state === "learning" || c.mastery_state === "strong",
  ).length;
  const pct = concepts.length > 0 ? Math.round((mastered / concepts.length) * 100) : 0;

  // Defensive only: every game_type the backend can return here comes
  // from the same GameContent collection the registry is generated
  // from, so this should always resolve — but if content ever drifts
  // ahead of the frontend registry (a new game_type seeded before its
  // route ships), fail safely by not navigating anywhere rather than
  // sending the student to "/undefined".
  // Phase 5C-B: forwards the same real chapter title this page already
  // fetched (chapter.title) and the same real subject name already
  // received via nav state (subjectNameFromNav) — no new data, nothing
  // invented — so the game's GameTopBar can show real "Subject ·
  // Chapter" context (see missionContext.jsx / GameShell.jsx). When
  // subjectNameFromNav is null (e.g. a direct URL open of this mission
  // page), only chapterTitle carries forward; GameTopBar falls back to
  // showing the chapter title alone rather than inventing a subject.
  const goToGame = (gameType) => {
    const route = GAME_TYPE_TO_ROUTE[gameType];
    if (!route) return;
    navigate(route, {
      state: { chapterId, chapterTitle: chapter.title, subjectName: subjectNameFromNav },
    });
  };

  return (
    <div className="chapters-page p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
      <button onClick={goBackToChapters} className="chapter-detail__back">
        ← Back
      </button>

      <div className="mission-hero mb-6">
        <span className="mission-hero__label">
          {subjectNameFromNav ? `${subjectNameFromNav} · Mission Brief` : "Mission Brief"}
        </span>
        <p className="mission-hero__title">
          <span aria-hidden="true">{iconFor(chapter.title, subjectNameFromNav)}</span>{" "}
          {chapter.title}
        </p>
        {chapter.unit_name && <p className="chapter-detail__unit mb-2">{chapter.unit_name}</p>}

        {concepts.length > 0 ? (
          <p className="mission-hero__sub">
            Your objective: master all {concepts.length} concept
            {concepts.length === 1 ? "" : "s"} in this chapter.{" "}
            {mastered}/{concepts.length} mastered so far.
          </p>
        ) : (
          <p className="mission-hero__sub">
            This mission's concepts haven't been added yet — check back soon.
          </p>
        )}

        {concepts.length > 0 && (
          <div
            className="mission-hero__track"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Mission progress"
          >
            <div className="mission-hero__fill" style={{ width: `${pct}%` }} />
          </div>
        )}

        {stage && (
          <p className="chapter-detail__progress-value" style={{ marginTop: "0.6rem" }}>
            {stage.icon} {stage.label}
          </p>
        )}
      </div>

      {concepts.length > 0 && (
        <div className="concept-list divide-y mb-6">
          {concepts.map((c) => {
            const badgeClass = c.mastery_state ? `badge-${c.mastery_state}` : "badge-new";
            return (
              <div key={c.id} className="concept-list__row flex justify-between items-center p-3">
                <span>{c.title}</span>
                <span className={`badge ${badgeClass} text-xs font-semibold px-2 py-1`}>
                  {c.mastery_state || "new"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(() => {
        const chapterRecommendation = getChapterRecommendation(recommendedGame, games);
        if (!chapterRecommendation) return null;
        const reasonCopy = getRecommendationReasonText(chapterRecommendation.reason);
        const subtitleParts = [];
        if (chapterRecommendation.title) subtitleParts.push(chapterRecommendation.title);
        if (chapterRecommendation.difficulty) {
          subtitleParts.push(
            `${chapterRecommendation.difficulty[0].toUpperCase()}${chapterRecommendation.difficulty.slice(1)} difficulty`,
          );
        }
        return (
          <div className="mb-6">
            <p className="chapter-detail__unit text-sm mb-2 font-semibold">
              Recommended for You
            </p>
            <GameCard
              icon={GAME_TYPE_TO_ICON[chapterRecommendation.gameType] || "🎮"}
              eyebrow={chapterRecommendation.label}
              title={GAME_TYPE_TO_ACTION[chapterRecommendation.gameType] || "Play the mission"}
              subtitle={subtitleParts.join(" · ")}
              onClick={() => goToGame(chapterRecommendation.gameType)}
              className="game-card--recommended"
            />
            {reasonCopy && (
              <p className="mission-hero__sub" style={{ marginTop: "6px" }}>
                {reasonCopy}
              </p>
            )}
          </div>
        );
      })()}

      {/* Phase 4E, Step 5: this heading used to read "Choose your
          mission" / "Your mission" — copy that implied a ranking
          this list never actually had (backend registry order is a
          technical stability order only, not curriculum order — see
          Phase 4D). Now that a real personalized pick can live above
          this list in "Recommended for You", this section is named
          plainly for what it is: the complete, unranked chapter game
          list. */}
      <p className="chapter-detail__unit text-sm mb-2 font-semibold">
        Chapter Missions
      </p>
      {games && games.length > 0 ? (
        <div className="flex flex-col gap-2 mb-6">
          {games.map(({ game_type, label, count }) => (
            <GameCard
              key={game_type}
              icon={GAME_TYPE_TO_ICON[game_type] || "🎮"}
              eyebrow={label}
              title={GAME_TYPE_TO_ACTION[game_type] || "Play the mission"}
              subtitle={`${count} level${count === 1 ? "" : "s"}`}
              onClick={() => goToGame(game_type)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🎮"
          title="No missions available yet"
          subtitle="This chapter doesn't have a playable game mechanic yet — you can still practice its concepts."
          action={
            <button onClick={() => navigate("/practice")} className="btn-primary px-4 py-2 rounded-lg font-semibold text-sm">
              Practice This Chapter
            </button>
          }
        />
      )}
    </div>
  );
}

export default ChapterMission;
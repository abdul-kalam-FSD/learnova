import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import StatChip from "../components/StatChip";
import SectionHeader from "../components/SectionHeader";
import EmptyState from "../components/EmptyState";
import GameCard from "../components/GameCard";
import PageLoading from "../components/PageLoading";
import { GAME_TYPE_TO_ROUTE, GAME_TYPE_TO_ICON } from "../games/gameRegistry";
import { getLevelProgress } from "../utils/level";
import { getAchievements } from "../utils/achievements";
import { getRecommendationReasonText } from "../utils/recommendationReason";
import "../Home.css";
import "../Progress.css";

function Home() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [recommendedCase, setRecommendedCase] = useState(null);
  // Phase 7B (item 2): /cases/recommended already returns a `reason`
  // field (weak-concept / learning-concept / fallback-any-case) that was
  // being fetched and discarded. Stored alongside recommendedCase so the
  // hero can surface it the same way the game recommendation's reason
  // already is.
  const [recommendedCaseReason, setRecommendedCaseReason] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  // Phase 7B (item 3): distinguishes "haven't heard back yet" from
  // "heard back and there's genuinely nothing" for the Achievements
  // section, which derives from both /profile/stats and /progress.
  // Without this, earnedAchievements.length === 0 is indistinguishable
  // from "not loaded yet", so a student with real earned badges could
  // briefly see "No achievements yet" before both calls resolve. Set to
  // true in both the success and failure branch of each fetch below —
  // this only ever gates the EmptyState-vs-nothing decision, never the
  // achievement data itself.
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  // Game Selection Engine (Section 17/18): recommendedGame drives the
  // single "continue" hero, catalog drives the browsable subject-grouped
  // list below it. Both come from the student's actual grade + mastery
  // via /api/games/*, replacing what used to be ~15 hardcoded
  // {data.grade === N && <button>...} blocks that only ever matched
  // whichever grade someone had manually written a card for.
  const [recommendedGame, setRecommendedGame] = useState(null);
  // Phase 7C (item 1 — Phase 7C audit finding): /games/recommended and
  // /cases/recommended both resolve independently of /home, same as
  // statsLoaded/progressLoaded above. Without a settled-flag, the hero
  // briefly rendered its "GET STARTED" zero-recommendation fallback
  // before either request had answered — a false empty state in the
  // most important dashboard element. Set to true in both the success
  // and failure branch of each fetch below (same pattern as
  // statsLoaded/progressLoaded), so a failure still lets the hero reach
  // its real fallback instead of hanging indefinitely.
  const [gameRecommendationSettled, setGameRecommendationSettled] = useState(false);
  const [caseRecommendationSettled, setCaseRecommendationSettled] = useState(false);
  const [gameCatalog, setGameCatalog] = useState([]);
  // Phase 7 (Student Dashboard = Game Hub): quizzesPlayed/accuracy are
  // needed by getAchievements() for accurate badge thresholds — same
  // /profile/stats call Profile.jsx already makes, so achievements can
  // never disagree between the two screens.
  const [stats, setStats] = useState(null);
  // Section 26 (Teacher Assignments): missions a teacher has assigned
  // this student, resolved server-side to a playable game — see
  // GET /api/assignments/mine.
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    api
      .get("/home")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message));

    api
      .get("/cases/recommended")
      .then((res) => {
        setRecommendedCase(res.data.case);
        setRecommendedCaseReason(res.data.reason ?? null);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setRecommendedCase(null);
        } else {
          setRecommendedCase(null);
        }
        setRecommendedCaseReason(null);
      })
      .finally(() => setCaseRecommendationSettled(true));

    // Quick-progress snippet — compact overall mastery %, links to
    // the full Progress tab. Same source as Progress.jsx.
    api
      .get("/progress")
      .then((res) => setProgress(res.data))
      .catch(() => setProgress(null))
      .finally(() => setProgressLoaded(true));

    api
      .get("/games/recommended")
      .then((res) => setRecommendedGame(res.data))
      .catch(() => setRecommendedGame(null))
      .finally(() => setGameRecommendationSettled(true));

    api
      .get("/games/catalog")
      .then((res) => setGameCatalog(res.data.catalog || []))
      .catch(() => setGameCatalog([]));

    api
      .get("/profile/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoaded(true));

    api
      .get("/assignments/mine")
      .then((res) => setAssignments(res.data.assignments || []))
      .catch(() => setAssignments([]));
  }, []);

  const overallPct = (() => {
    if (!progress?.chapters) return null;
    const totals = progress.chapters.reduce(
      (acc, ch) => {
        acc.total += ch.total_concepts;
        acc.mastered += ch.breakdown.strong + ch.breakdown.learning;
        return acc;
      },
      { total: 0, mastered: 0 },
    );
    return totals.total > 0
      ? Math.round((totals.mastered / totals.total) * 100)
      : 0;
  })();

  if (error) return <p className="p-4 home__error">Error: {error}</p>;
  if (!data) return <PageLoading />;

  const { level, xpIntoLevel, xpPerLevel, pct: levelPct } = getLevelProgress(data.xp_total);

  // Phase 11/audit fix: this card used to hardcode "🔬 BIO DETECTIVE" as
  // the permanent hero for every student regardless of grade or subject
  // — a leftover from when the platform was Biology-only. The adaptive
  // recommendedGame engine (Section 17/18) now covers every subject, so
  // it takes priority whenever it has a pick; the Bio Detective case
  // hero only appears when a case is actually the recommended content,
  // and a subject-neutral hero covers everyone else instead of assuming
  // Biology.
  //
  // Phase 5A (Phase 4F audit finding): this eyebrow used to read
  // "NEXT UP", which implies a sequential/never-played next step that
  // getRecommendedGame() doesn't actually guarantee — it's a mastery-
  // based pick, not a curriculum sequence, and it does not exclude
  // content the student has already completed. "Recommended for You"
  // makes the same real personalization claim without the sequencing
  // implication, and matches the vocabulary already used by Practice.jsx
  // and ChapterMission.jsx for the identical API response. The
  // recommendation's real `reason` (already fetched, previously never
  // shown here) is appended the same way Practice.jsx already renders
  // it, via the shared reason-copy utility — omitted entirely when the
  // reason is missing/unrecognized rather than inventing text for it.
  const recommendationReasonText = recommendedGame
    ? getRecommendationReasonText(recommendedGame.reason)
    : null;
  // Phase 7B (item 1 — Phase 7A finding #1): recommendedGame.alreadyCompleted
  // (added to /games/recommended by 6C-C) was never read here, so the hero
  // could present already-completed content as "RECOMMENDED FOR YOU" /
  // "Play Now". Explicit `=== true` check only, matching 6C-C's own
  // explicit-truth handling of this same field — missing/undefined/any
  // other value must fall through to the existing, unchanged wording,
  // never be guessed as completed.
  const heroAlreadyCompleted = recommendedGame?.alreadyCompleted === true;
  // Phase 7B (item 2): case reason reuses the same shared copy map the
  // game recommendation already uses (no second reason map). The case
  // endpoint's reason values are "weak-concept" / "learning-concept" /
  // "fallback-any-case" — the first two share vocabulary with the game
  // reasons and resolve to real, accurate copy; "fallback-any-case" has
  // no entry in that map, so it correctly falls through to null and the
  // existing generic sub-copy below, rather than inventing text for it.
  const caseReasonText = recommendedCase
    ? getRecommendationReasonText(recommendedCaseReason)
    : null;
  // Phase 7C (item 1): both recommendation requests must have settled
  // (success or failure) before the hero is allowed to pick a branch —
  // otherwise a still-pending request looks identical to "resolved with
  // nothing" and the hero would show GET STARTED for a student who
  // actually has a real recommendation coming. This only gates which
  // hero variant renders; it does not delay the rest of the Dashboard.
  const recommendationsSettled = gameRecommendationSettled && caseRecommendationSettled;
  const hero = !recommendationsSettled
    ? {
        eyebrow: "⏳ ONE MOMENT",
        title: "Finding your next step…",
        sub: "Personalizing your recommendation.",
        cta: null,
        onClick: undefined,
      }
    : recommendedGame
    ? {
        eyebrow: `${GAME_TYPE_TO_ICON[recommendedGame.gameType] || "🎮"} ${(recommendedGame.subject || "").toUpperCase()} · ${heroAlreadyCompleted ? "REVIEW RECOMMENDED" : "RECOMMENDED FOR YOU"}`,
        title: recommendedGame.label,
        sub: recommendationReasonText
          ? `${recommendedGame.title} — ${recommendationReasonText}`
          : recommendedGame.title,
        // Same "Review Recommended" wording GameShell's post-game button
        // already uses for this exact field (Phase 6C-C) — the arrow is
        // appended separately by the hero markup below, same as before.
        cta: heroAlreadyCompleted ? "Review Recommended" : "Play Now",
        onClick: () => navigate(GAME_TYPE_TO_ROUTE[recommendedGame.gameType] || "/chapters"),
      }
    : recommendedCase
    ? {
        eyebrow: "🔬 BIO DETECTIVE",
        title: recommendedCase.title,
        sub: `${recommendedCase.clue_count} clue${recommendedCase.clue_count === 1 ? "" : "s"} · ${caseReasonText || "Solve it to earn XP and sharpen your mastery."}`,
        cta: "Start Case",
        onClick: () => navigate("/practice"),
      }
    : {
        eyebrow: "🎮 GET STARTED",
        title: "Pick a chapter and start playing",
        sub: "Browse your grade's chapters and jump into any game to start earning XP.",
        cta: "Browse Chapters",
        // Phase 0 vertical slice: sends students into Subject World
        // first (see SubjectWorld.jsx / SubjectChapters.jsx) rather
        // than straight to the old flat /chapters list. That route
        // stays live and unchanged for now — this is just the entry
        // point being repointed.
        onClick: () => navigate("/subjects"),
      };

  const achievements = getAchievements({ user: data, stats, progress });
  const earnedAchievements = achievements.filter((a) => a.earned);

  const newGames = gameCatalog
    .flatMap(({ subject, gameTypes }) => gameTypes.map((g) => ({ ...g, subject })))
    .filter((g) => g.isNew);

  return (
    <div className="home min-h-screen p-4 max-w-md lg:max-w-3xl mx-auto">
      {/* Header: greeting + grade + Level/XP chips (streak/brand live in the app header now) */}
      <div className="home-header mb-5">
        <div className="home-header__left">
          {/* Phase 7B (item 4): the page's only <h1> — was a <p>, no
              landmark heading existed for this screen at all. Same
              classes/visual result (Tailwind's preflight already strips
              h1's default browser margin/size, and .home-header__greeting
              sets its own font-size/weight/color explicitly). */}
          <h1 className="home-header__greeting">Hi, {data.name} 👋</h1>
          {data.grade && (
            <p className="home-header__grade-badge">Grade {data.grade}</p>
          )}
        </div>
        <div className="home-header__stat-chips">
          <StatChip icon="🎖️" value={`Lv ${level}`} variant="default" label="Level" />
          <StatChip
            icon="⚡"
            value={data.xp_total}
            variant="xp"
            label="Total XP"
          />
        </div>
      </div>

      {/* Hero: primary CTA card, single and subject-neutral (see `hero` above) */}
      <button
        onClick={hero.onClick}
        disabled={!hero.onClick}
        className="home-hero mb-2 text-left w-full"
      >
        <span className="home-hero__eyebrow">{hero.eyebrow}</span>
        <p className="home-hero__title">{hero.title}</p>
        <p className="home-hero__sub">{hero.sub}</p>
        {hero.cta && (
          <span className="btn-pill btn-pill-inverted home-hero__cta">
            {hero.cta} <span aria-hidden="true">→</span>
          </span>
        )}
      </button>

      {/* Level progress: how close to the next level, right under the hero
          since XP earned from the hero above is what moves this bar. */}
      <div className="home-level-peek mb-5">
        <div className="home-level-peek__top">
          <span className="home-level-peek__label">Level {level} progress</span>
          <span className="home-level-peek__xp">{xpIntoLevel} / {xpPerLevel} XP</span>
        </div>
        <div
          className="progress-overall__track"
          role="progressbar"
          aria-valuenow={levelPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="XP progress to next level"
        >
          <div className="progress-overall__fill" style={{ width: `${levelPct}%` }} />
        </div>
      </div>

      {/* Phase 7C (item 3): moved up from its previous spot near the
          bottom of the Dashboard (just above "Browse Chapters") to sit
          directly beside Level Progress — the audit found Overall
          Mastery is the strongest "Where am I in my learning?" signal,
          so it belongs with the other Tier 1/2 progress indicator
          instead of buried below exploration content. JSX, calculation,
          API call, and wording are all unchanged from before — this is
          an ordering change only. */}
      {overallPct !== null && (
        <button
          onClick={() => navigate("/progress")}
          className="home-progress-peek mb-5"
        >
          <div className="home-progress-peek__top">
            <span className="home-progress-peek__label">Overall Mastery</span>
            <span className="home-progress-peek__pct">{overallPct}%</span>
          </div>
          <div
            className="progress-overall__track"
            role="progressbar"
            aria-valuenow={overallPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall mastery"
          >
            <div
              className="progress-overall__fill"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </button>
      )}

      {/* Assigned to You: missions a teacher pushed to this student
          (Section 26). Placed right under the level bar since these
          are the highest-priority action items on the dashboard —
          something a real person asked the student to do, not just a
          system recommendation. */}
      {assignments.length > 0 && (
        <div className="mb-5">
          <SectionHeader title="Assigned to You" />
          <div className="flex flex-col gap-2">
            {assignments.slice(0, 5).map((a) => {
              const isDone = a.status === "completed";
              const route = a.suggestedGame ? GAME_TYPE_TO_ROUTE[a.suggestedGame.gameType] : null;
              const metaParts = [a.teacherName, a.subject].filter(Boolean);
              if (a.dueDate) metaParts.push(`Due ${new Date(a.dueDate).toLocaleDateString()}`);
              return (
                <GameCard
                  key={a.id}
                  icon={isDone ? "✅" : a.suggestedGame ? GAME_TYPE_TO_ICON[a.suggestedGame.gameType] || "🎯" : "🎯"}
                  eyebrow={isDone ? "COMPLETED" : "MISSION FROM YOUR TEACHER"}
                  title={a.conceptTitle}
                  subtitle={a.note ? `${a.note} · ${metaParts.join(" · ")}` : metaParts.join(" · ")}
                  onClick={!isDone && route ? () => navigate(route) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Achievements teaser: real badges from getAchievements() (same
          source as Profile), just previously never surfaced on Home.
          Phase 7C (item 4): "home-tier3-section" is a small, additive
          CSS-only hook (see Home.css) that quiets this achievement/
          exploration content slightly relative to the Tier 1/2 learning
          actions above it — no change to markup, data, or behavior. */}
      <div className="mb-5 home-tier3-section">
        <SectionHeader
          title="Achievements"
          action={
            <button onClick={() => navigate("/profile")} className="section-header__action">
              View all →
            </button>
          }
        />
        <div className="home-achievements-strip">
          {!statsLoaded || !progressLoaded ? (
            // Phase 7B (item 3): earnedAchievements depends on /profile/stats
            // and /progress, both still in flight the first time this
            // renders. This is the LOADING case ("we don't know yet") —
            // rendering nothing here (rather than the EmptyState below)
            // avoids falsely claiming "no achievements" for a student who
            // actually has some, once both calls resolve a render below
            // takes over with the real answer.
            null
          ) : earnedAchievements.length === 0 ? (
            <EmptyState
              icon="🏅"
              title="No achievements yet"
              subtitle="Play a game to earn your first badge."
            />
          ) : (
            earnedAchievements.slice(0, 6).map((a) => (
              <span key={a.id} className="home-achievements-strip__badge" title={a.title}>
                <span aria-hidden="true">{a.icon}</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Recently Played: real completed-session data from /home
          (computeUserQuizStats, same source Profile already uses),
          not previously shown on the dashboard at all.
          Phase 7D (dashboard hierarchy audit): this phase's own Tier-3
          definition ("Recently Played, achievements, catalog,
          leaderboard, etc.") already names this section explicitly, but
          it was the only one of those four left un-tiered when Phase 7C
          item 4 introduced the tier-3 de-emphasis. Adding the same
          existing, additive-only "home-tier3-section" / "game-card--tier3"
          hooks used by Achievements/New Games/All Games/Leaderboard —
          no markup restructuring, no data or behavior change. */}
      {data.recentQuizzes && data.recentQuizzes.length > 0 && (
        <div className="mb-5 home-tier3-section">
          <SectionHeader title="Recently Played" />
          <div className="flex flex-col gap-2">
            {data.recentQuizzes.map((q) => {
              const route = q.gameType ? GAME_TYPE_TO_ROUTE[q.gameType] : null;
              return (
                <GameCard
                  key={q.sessionId}
                  icon={q.gameType ? GAME_TYPE_TO_ICON[q.gameType] || "🎮" : "📋"}
                  title={q.title}
                  subtitle={`${q.accuracy}% accuracy · +${q.xpAwarded} XP`}
                  onClick={route ? () => navigate(route) : undefined}
                  className="game-card--tier3"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* New Games: only rendered when something is genuinely new
          (GameContent created in the last 14 days for this grade) —
          no invented "NEW" badges when nothing has actually changed.
          Phase 7C (item 4): "home-tier3-section" / "game-card--tier3"
          are additive CSS-only hooks (see Home.css) that slightly quiet
          this exploration content — no markup, data, or behavior change. */}
      {newGames.length > 0 && (
        <div className="mb-5 home-tier3-section">
          <SectionHeader title="New Games" />
          <div className="flex flex-col gap-2">
            {newGames.map((g) => (
              <GameCard
                key={g.game_type}
                icon={GAME_TYPE_TO_ICON[g.game_type] || "🎮"}
                eyebrow="🆕 NEW"
                title={g.label}
                subtitle={`${g.subject} · ${g.count} level${g.count === 1 ? "" : "s"}`}
                onClick={() => navigate(GAME_TYPE_TO_ROUTE[g.game_type])}
                className="game-card--tier3"
              />
            ))}
          </div>
        </div>
      )}

      {/* Browsable catalog: every game_type that actually has content
          for this student's grade, grouped by subject (server-side, via
          gameTypeRegistry.js) — no more per-grade hardcoded cards, so a
          new seed script showing up automatically appears here. */}
      {gameCatalog.length > 0 && (
        <div className="mb-5 home-tier3-section">
          <SectionHeader title="All Games" />
          {gameCatalog.map(({ subject, gameTypes }) => (
            <div key={subject} className="mb-3">
              <p className="home-hero__eyebrow mb-2">{subject.toUpperCase()}</p>
              <div className="flex flex-col gap-2">
                {gameTypes.map(({ game_type, label, count }) => (
                  <GameCard
                    key={game_type}
                    icon={GAME_TYPE_TO_ICON[game_type] || "🎮"}
                    title={label}
                    subtitle={`${count} level${count === 1 ? "" : "s"}`}
                    onClick={() => navigate(GAME_TYPE_TO_ROUTE[game_type])}
                    className="game-card--tier3"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weak concepts */}
      <div className="mb-5">
        <SectionHeader title="Weak Concepts" />
        {data.weakConcepts.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="No weak concepts yet"
            subtitle="Keep practicing to maintain your mastery."
          />
        ) : (
          <div className="weak-list rounded-lg divide-y">
            {data.weakConcepts.map((concept, i) => (
              <div
                key={concept.concept_id ?? i}
                className="weak-list__item flex justify-between items-center p-3"
              >
                <span>{concept.title}</span>
                <span className="badge badge-weak weak-list__item-badge">
                  🔴 Needs practice
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phase 7C (item 2): was gated on `!recommendedCase` alone, so this
          duplicated the hero's own CTA whenever a recommended GAME (not a
          case) existed. Only show this when there is no recommendation of
          either kind. */}
      {!recommendedGame && !recommendedCase && (
        <button
          onClick={() => navigate("/subjects")}
          className="btn-primary w-full font-bold py-3 rounded-lg"
        >
          Browse Chapters
        </button>
      )}

      {/* Leaderboard quick access. Phase 7C (item 4):
          "home-leaderboard-peek--tier3" is an additive CSS-only modifier
          (see Home.css) quieting this exploration content slightly. */}
      <button
        onClick={() => navigate("/leaderboard")}
        className="home-leaderboard-peek home-leaderboard-peek--tier3 mt-5"
      >
        <span className="home-leaderboard-peek__icon" aria-hidden="true">
          🏆
        </span>
        <span className="home-leaderboard-peek__text">
          <span className="home-leaderboard-peek__title">Leaderboard</span>
          <span className="home-leaderboard-peek__sub">
            See where you rank this week
          </span>
        </span>
        <span className="home-leaderboard-peek__arrow" aria-hidden="true">
          →
        </span>
      </button>
    </div>
  );
}

export default Home;
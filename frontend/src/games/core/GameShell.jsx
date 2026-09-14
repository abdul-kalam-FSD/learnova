import { useEffect, useId, useRef, useState } from "react";
import "../../Practice.css";
import "./gameIdentity.css";
import { FEEDBACK_COPY, HINT_LABEL } from "../../utils/gradeBand";
import { useGradeBand } from "../../context/gradeBandContext";
import { useMissionContext } from "../../context/missionContext";

// Shared shell for all subject-specific games (Section 16: modular
// per-game components, but a common shell so every game doesn't
// reinvent the topbar/panel/button chrome). Deliberately reuses the
// existing practice-* CSS classes from Practice.css so gameplay
// screens look consistent with the rest of the app without a new
// stylesheet.

export function GameTopBar({ label, xp, streak, onBack, progress, lives, gradeBand: gradeBandProp }) {
  // Explicit prop wins (FractionBuilder passes its own); every other
  // game falls back to the app-wide context set once in AppLayout —
  // this is what lets them pick up age-appropriate sizing with zero
  // per-game changes.
  const contextBand = useGradeBand();
  const gradeBand = gradeBandProp ?? contextBand;
  // Phase 5C-B: real chapter/mission context (see missionContext.jsx),
  // present only when this game was actually launched from
  // ChapterMission.jsx. Read here — the single place all 54 games'
  // GameTopBar calls already go through — rather than threading a new
  // prop through every game file. null everywhere else (Home, Practice,
  // direct game URL), so nothing extra renders there.
  const mission = useMissionContext();
  const missionLabel = mission?.chapterTitle
    ? mission.subjectName
      ? `${mission.subjectName} · ${mission.chapterTitle}`
      : mission.chapterTitle
    : null;
  // Screen-reader announcement for XP/streak changes (doc Section 11:
  // announce meaningful changes only, not every render — so this
  // tracks the previous values and only speaks when they actually
  // increase/decrease, e.g. "+20 XP earned" / "Streak increased to 4",
  // rather than repeating the current totals on every rerender.
  const prevXp = useRef(xp);
  const prevStreak = useRef(streak);
  const [announcement, setAnnouncement] = useState("");
  // Visual-only companion to the aria-live announcement below: a
  // floating "+N" over the XP pill plus a brief pulse on the pill
  // itself, so sighted students get the same "XP earned" moment
  // screen-reader users already got from the announcement (Part 22:
  // "show XP earned immediately... with a subtle animation"). Purely
  // additive — aria-hidden, self-clears via timeout, never blocks
  // the underlying number from updating instantly.
  const [xpBump, setXpBump] = useState(null);
  const xpBumpTimeout = useRef(null);

  useEffect(() => {
    const messages = [];
    if (xp > prevXp.current) {
      const delta = xp - prevXp.current;
      messages.push(`+${delta} XP earned`);
      setXpBump({ amount: delta, id: Date.now() });
      clearTimeout(xpBumpTimeout.current);
      xpBumpTimeout.current = setTimeout(() => setXpBump(null), 900);
    }
    if (streak > prevStreak.current) {
      messages.push(`Streak increased to ${streak}`);
    } else if (streak < prevStreak.current) {
      messages.push(`Streak reset to ${streak}`);
    }
    if (messages.length) {
      setAnnouncement(messages.join(". "));
    }
    prevXp.current = xp;
    prevStreak.current = streak;
    return () => clearTimeout(xpBumpTimeout.current);
  }, [xp, streak]);

  // No band available at all (context not yet resolved, or shell
  // used outside AppLayout e.g. in a test) -> unstyled default,
  // identical to this shell's original single fixed size/tone.
  const bandClass = gradeBand ? ` practice-topbar-wrap--${gradeBand}` : "";

  return (
    <div className={`practice-topbar-wrap sticky top-0 z-10${bandClass}`}>
      <div className="practice-topbar flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="practice-topbar__back text-lg leading-none"
            >
              ←
            </button>
          )}
          <div className="min-w-0 flex flex-col">
            {missionLabel && (
              <span className="practice-topbar__mission truncate">{missionLabel}</span>
            )}
            <span className="practice-topbar__label truncate">{label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Lives/attempts (Part 8: "only if appropriate" — most games
              have unlimited retries and pass nothing here, so this
              renders only when a game opts in). */}
          {typeof lives === "number" && (
            <div
              className="practice-pill px-2 py-1 rounded text-[11px]"
              aria-label={`${lives} ${lives === 1 ? "life" : "lives"} remaining`}
            >
              {"❤️".repeat(Math.max(0, lives)) || "0 ❤️"}
            </div>
          )}
          <div className="practice-pill px-2 py-1 rounded text-[11px]">
            STREAK {streak}
          </div>
          <div
            className={`practice-pill practice-pill--xp px-2 py-1 rounded text-[11px] relative${xpBump ? " practice-pill--xp-bump" : ""}`}
          >
            {xp} XP
            {xpBump && (
              <span key={xpBump.id} className="xp-bump" aria-hidden="true">
                +{xpBump.amount}
              </span>
            )}
          </div>
        </div>
        {/* Visually hidden, announced by assistive tech only when the
            message actually changes above (not on every render). */}
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
      {/* Mission progress (Part 8: top area should show progress, which
          was previously missing entirely). Optional — pass
          `progress={{ current, total }}` from a game that has a
          meaningful step sequence (level N of M, question N of M). */}
      {progress && progress.total > 0 && (
        <div className="game-progress px-4 pb-2" role="progressbar"
          aria-valuenow={progress.current}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-label={`Step ${progress.current} of ${progress.total}`}
        >
          <div className="game-progress__track">
            <div
              className="game-progress__fill"
              style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }}
            />
          </div>
          <span className="game-progress__label">
            {progress.current} / {progress.total}
          </span>
        </div>
      )}
    </div>
  );
}

// Persistent reminder of what this level is actually teaching (Part
// 8's "side/bottom panel: Objective"). Previously no game surfaced
// this during play — the concept title was only ever shown on the
// public chapter-preview page before the game even launched.
export function GameObjective({ children }) {
  if (!children) return null;
  return (
    <div className="game-objective mb-4">
      <span className="game-objective__label">Learning objective</span>
      <p className="game-objective__text">{children}</p>
    </div>
  );
}

// Collapsible hint (Part 8's "side/bottom panel: Hint"). Every game
// previously either had no proactive hint at all, or only revealed
// one after a wrong answer — this lets a student ask for help before
// attempting, without being forced to fail first. `cost` is
// optional flavor text (e.g. "may reduce XP") a game can set if it
// chooses to penalize hint use; the component itself takes no XP
// action, since only the calling game knows its own scoring rules.
export function GameHint({ text, cost, gradeBand: gradeBandProp }) {
  const contextBand = useGradeBand();
  const gradeBand = gradeBandProp ?? contextBand;
  // Primary students (Grade 4-5) get the hint open by default —
  // asking them to discover a collapsed affordance before they can
  // even see help text adds friction the older bands don't need.
  const [open, setOpen] = useState(gradeBand === "primary");
  if (!text) return null;
  const labels = HINT_LABEL[gradeBand] || HINT_LABEL.middle;
  return (
    <div className="game-hint mb-4">
      <button
        type="button"
        className="game-hint__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? labels.open : labels.closed}
      </button>
      {open && (
        <div className="game-hint__panel">
          <p>{text}</p>
          {cost && <p className="game-hint__cost">{cost}</p>}
        </div>
      )}
    </div>
  );
}

// Standardized correct/incorrect feedback (Part 8: "Correct action:
// positive animation, meaningful explanation, XP. Incorrect action:
// helpful feedback, explanation, opportunity to learn."). Before
// this, all 44 game components hand-rolled the same
// feedback-card/feedback-card--correct markup independently — this
// is the single implementation the CSS animation (game-feedback-pop,
// see GameUI.css) is written for, so adopting it is also how a game
// picks up the animation for free.
export function GameFeedback({ isCorrect, verdict, explanation, whatYouLearned, xpDelta, gradeBand: gradeBandProp }) {
  const contextBand = useGradeBand();
  const gradeBand = gradeBandProp ?? contextBand;
  const copy = FEEDBACK_COPY[gradeBand] || FEEDBACK_COPY.middle;
  return (
    <div
      className={`feedback-card game-feedback ${isCorrect ? "feedback-card--correct" : "feedback-card--incorrect"} mb-4`}
      role="status"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="feedback-card__verdict">
          {verdict || (isCorrect ? copy.correct : copy.incorrect)}
        </p>
        {isCorrect && typeof xpDelta === "number" && xpDelta > 0 && (
          <span className="game-feedback__xp">+{xpDelta} XP</span>
        )}
      </div>
      {explanation && <p className="feedback-card__explanation">{explanation}</p>}
      {isCorrect && whatYouLearned && (
        <p className="game-feedback__learned">
          <strong>What you learned:</strong> {whatYouLearned}
        </p>
      )}
    </div>
  );
}

// Shared loading state for a game's initial content fetch (Part 14:
// no blank screens / bare "Loading..." text). Every one of the 44
// game components currently returns a plain
// `<p>Loading...</p>` outside any shell chrome — this wraps it in the
// same GamePage/GamePanel frame so the transition into gameplay
// doesn't jump layouts.
export function GameLoadingState({ label = "Preparing your challenge..." }) {
  return (
    <GamePage>
      <GamePanel>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div
            className="h-10 w-10 rounded-full border-4 border-current border-t-transparent animate-spin"
            style={{ color: "var(--primary-color)" }}
            role="status"
            aria-label="Loading"
          />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {label}
          </p>
        </div>
      </GamePanel>
    </GamePage>
  );
}

// Shared error state for a game's initial content fetch (Part 14).
// Replaces a bare, un-styled error string with a real retry action —
// several games' API errors are transient (network blip, cold-start
// backend) and were previously unrecoverable without a manual
// back-and-forth navigation.
export function GameErrorState({ message, onRetry, onBack }) {
  return (
    <GamePage>
      <GamePanel>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-2xl" aria-hidden="true">
            ⚠️
          </p>
          <p className="text-sm font-medium">
            We couldn't load this game{message ? `: ${message}` : "."}
          </p>
          <div className="flex gap-3 mt-2">
            {onRetry && (
              <button onClick={onRetry} className="btn-primary px-4 py-2 rounded-lg font-semibold text-sm">
                Retry
              </button>
            )}
            {onBack && (
              <button onClick={onBack} className="btn-secondary px-4 py-2 rounded-lg font-semibold text-sm">
                Go back
              </button>
            )}
          </div>
        </div>
      </GamePanel>
    </GamePage>
  );
}

// Mission-briefing screen shown between "pick a level" and "actually
// start playing" (Phase 11 / spec Part 11: games felt like plain
// cards with no moment that makes a student want to play). Sits
// between LevelSelectScreen and the play screen in each game's own
// state machine — the caller decides when to show it and what
// happens on Start; this component only renders the briefing itself,
// using data the game already has (title/difficulty/level index) plus
// two optional real-data props:
//   - objective: the concept's actual explanation_text from the
//     backend (Phase 11 wants a "mission objective" — this is the
//     real one, not invented flavor text)
//   - xpInfo: { perCorrect, perfectBonus } from GET /games/content,
//     the same numbers calculateXP actually awards, so the XP preview
//     can never drift out of sync with what's granted on completion
// `skills` and `timeEstimateMinutes` are optional and only rendered
// when the caller actually has real values for them — no placeholder
// numbers are invented when a game_type doesn't have real timing data
// (e.g. untimed Match/Builder games).
export function GameLobby({
  title,
  subjectLabel,
  objective,
  difficulty,
  levelIndex,
  totalLevels,
  xpInfo,
  maxXpEstimate,
  timeEstimateMinutes,
  skills,
  onStart,
  onBack,
}) {
  return (
    <GamePanel>
      {/* Below lg: single column, same order as before. At lg+ (once
          the page itself widens via GamePage's lg:max-w-3xl) split
          into a briefing column and a stats/action sidebar, rather
          than just stretching one vertical strip across a wider
          screen. */}
      <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-8 lg:items-start">
        <div className="lg:min-w-0">
          {subjectLabel && (
            <span className="clue-card__label">{subjectLabel}</span>
          )}
          <h1 className="text-2xl font-bold mt-1 mb-1">{title}</h1>
          {typeof levelIndex === "number" && typeof totalLevels === "number" && (
            <p className="hint-text text-xs mb-3">
              Level {levelIndex + 1} of {totalLevels}
            </p>
          )}

          {objective && (
            <div className="game-objective mb-4">
              <span className="game-objective__label">Mission objective</span>
              <p className="game-objective__text">{objective}</p>
            </div>
          )}

          {skills && skills.length > 0 && (
            <div className="mb-5">
              <span className="game-objective__label">Skills</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill) => (
                  <span key={skill} className="badge badge-new text-xs font-semibold px-2 py-1">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4">
          <div className="flex flex-wrap gap-2 mb-4 lg:flex-col lg:items-stretch">
            {difficulty && (
              <span className="practice-pill px-3 py-1 rounded text-[11px] capitalize">
                {difficulty}
              </span>
            )}
            {typeof timeEstimateMinutes === "number" && (
              <span className="practice-pill px-3 py-1 rounded text-[11px]">
                ~{timeEstimateMinutes} min
              </span>
            )}
            {xpInfo && (
              <span className="practice-pill practice-pill--xp px-3 py-1 rounded text-[11px]">
                +{xpInfo.perCorrect} XP per correct{xpInfo.perfectBonus ? ` · +${xpInfo.perfectBonus} perfect bonus` : ""}
              </span>
            )}
            {typeof maxXpEstimate === "number" && (
              <span className="practice-pill practice-pill--xp px-3 py-1 rounded text-[11px]">
                Up to {maxXpEstimate} XP this round
              </span>
            )}
          </div>

          <GamePrimaryButton onClick={onStart}>Start Mission</GamePrimaryButton>
          {onBack && (
            <button onClick={onBack} className="hint-text text-xs mt-3 underline block">
              ← Choose a different level
            </button>
          )}
        </div>
      </div>
    </GamePanel>
  );
}

export function GamePanel({ children }) {
  return <div className="practice-panel p-5 flex-1">{children}</div>;
}

export function GamePrimaryButton({ children, onClick, disabled, secondary }) {
  const variant = secondary
    ? "btn-secondary"
    : disabled
      ? "btn-primary-disabled"
      : "btn-primary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variant} w-full py-3 rounded-lg font-semibold text-sm`}
    >
      {children}
    </button>
  );
}

// Gameplay Special Rule: leaving active gameplay (the "play" stage,
// mid-mission) can silently discard real in-progress state, so Back
// from there routes through useLeaveConfirmation() and this dialog
// instead of navigating immediately. Level-select/lobby Back buttons
// have nothing in progress yet and are untouched — they still call
// their handlers directly, no dialog involved.
//
// Kept intentionally small and dependency-free (own focus trap +
// Escape handling, matching components/Modal.jsx's pattern) rather
// than reusing Modal.jsx directly, since that component is styled for
// the admin/teacher portal (Admin.css) — this needed the game shell's
// own card/button look (GamePrimaryButton) so it reads as part of the
// mission, not an admin-style system dialog.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function LeaveMissionDialog({ open, onStay, onLeave }) {
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    const node = dialogRef.current;
    if (node) {
      const firstFocusable = node.querySelector(FOCUSABLE_SELECTOR);
      (firstFocusable || node).focus();
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onStay();
        return;
      }
      if (e.key !== "Tab") return;

      const current = dialogRef.current;
      if (!current) return;
      const focusable = Array.from(current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (previouslyFocusedRef.current?.focus) previouslyFocusedRef.current.focus();
    };
  }, [open, onStay]);

  if (!open) return null;

  return (
    <div className="leave-mission__backdrop" onClick={onStay}>
      <div
        className="leave-mission__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="leave-mission__title">
          Leave this mission?
        </h2>
        <p className="leave-mission__body">You may lose your current progress.</p>
        <div className="leave-mission__actions">
          <GamePrimaryButton onClick={onStay} secondary>
            Stay
          </GamePrimaryButton>
          <GamePrimaryButton onClick={onLeave}>Leave</GamePrimaryButton>
        </div>
      </div>
    </div>
  );
}
export function GameResults({
  completeLabel = "Level Complete",
  badgeText,
  title,
  masteryUpdate,
  xpAwarded,
  xpCapped,
  streak,
  accuracyPct,
  timeSpentSeconds,
  skillsPracticed,
  achievementUnlocked,
  onPlayAgain,
  playAgainLabel = "Play Again",
  onNextGame,
  nextGameReason,
  nextGameAlreadyCompleted,
  onBackToChapter,
  onDashboard,
  dashboardLabel = "Dashboard",
  xp,
  gradeBand,
  identity,
}) {
  const resolvedNextGameReason = nextGameReason ?? onNextGame?.reason ?? null;
  const resolvedNextGameAlreadyCompleted = Boolean(
    nextGameAlreadyCompleted ?? onNextGame?.alreadyCompleted ?? false,
  );
  return (
    <GamePage identity={identity}>
      <GameTopBar label={completeLabel} xp={xp ?? xpAwarded ?? 0} streak={streak ?? 0} gradeBand={gradeBand} />
      <GamePanel>
        <div className="text-center">
          <div className="case-closed__badge inline-block px-3 py-1 rounded text-[11px] font-bold tracking-widest mb-3">
            {badgeText || completeLabel.toUpperCase()}
          </div>
          {title && <h1 className="text-2xl font-bold mb-4">{title}</h1>}

          {achievementUnlocked && (
            <div className="clue-card rounded-lg p-4 mb-4 text-left">
              <span className="clue-card__label">🏅 ACHIEVEMENT UNLOCKED</span>
              <p className="text-sm mt-2 font-semibold">{achievementUnlocked}</p>
            </div>
          )}

          {masteryUpdate && (
            <div className="clue-card rounded-lg p-4 mb-4 text-left">
              <span className="clue-card__label">CONCEPT MASTERY</span>
              <p className="text-sm mt-2">
                {masteryUpdate.new_state
                  ? masteryUpdate.changed === true
                    ? `Mastery updated to: ${masteryUpdate.new_state}`
                    : masteryUpdate.changed === false
                      ? `Mastery: ${masteryUpdate.new_state}`
                      : `Updated to: ${masteryUpdate.new_state}`
                  : "Mastery updated"}
              </p>
            </div>
          )}

          {skillsPracticed && skillsPracticed.length > 0 && (
            <div className="mb-4 text-left">
              <span className="game-objective__label">Skills practiced</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {skillsPracticed.map((skill) => (
                  <span key={skill} className="badge badge-new text-xs font-semibold px-2 py-1">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {typeof xpAwarded === "number" && (
              <div className="case-closed__stat px-3 py-1 rounded text-sm font-semibold">
                +{xpAwarded} XP
              </div>
            )}
            {typeof streak === "number" && (
              <div className="case-closed__stat px-3 py-1 rounded text-sm font-semibold">
                🔥 Streak {streak}
              </div>
            )}
            {typeof accuracyPct === "number" && (
              <div className="case-closed__stat px-3 py-1 rounded text-sm font-semibold">
                🎯 {accuracyPct}% accuracy
              </div>
            )}
            {typeof timeSpentSeconds === "number" && (
              <div className="case-closed__stat px-3 py-1 rounded text-sm font-semibold">
                ⏱️ {Math.max(1, Math.round(timeSpentSeconds / 60))} min
              </div>
            )}
          </div>

          {/* Phase 6B (P1-2): the completion API already returns
              xpCapped truthfully; this only surfaces it. Renders
              nothing when xpCapped is false/undefined — same
              "optional, don't invent" rule every other stat here
              follows. */}
          {xpCapped && (
            <p className="text-xs opacity-75 mb-4 -mt-2">
              Daily bonus limit reached for this activity.
            </p>
          )}

          <div className="flex flex-col gap-3 lg:max-w-xs lg:mx-auto">
            {onPlayAgain && (
              <GamePrimaryButton onClick={onPlayAgain} secondary>
                {playAgainLabel}
              </GamePrimaryButton>
            )}
            {onNextGame && (
              <div>
                <GamePrimaryButton onClick={onNextGame} secondary>
                  {resolvedNextGameAlreadyCompleted ? "Review Recommended →" : "Recommended Next →"}
                </GamePrimaryButton>
                {resolvedNextGameReason && (
                  <p className="text-xs opacity-75 mt-1">{resolvedNextGameReason}</p>
                )}
              </div>
            )}
            {onBackToChapter && (
              <GamePrimaryButton onClick={onBackToChapter} secondary>
                Back to Chapter
              </GamePrimaryButton>
            )}
            {onDashboard && (
              <GamePrimaryButton onClick={onDashboard}>{dashboardLabel}</GamePrimaryButton>
            )}
          </div>
        </div>
      </GamePanel>
    </GamePage>
  );
}
export function GamePage({ children, identity }) {
  return (
    <div
      className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col"
      data-game-identity={identity || undefined}
    >
      {children}
    </div>
  );
}

// Shared shape visual (Section 4 Geometry family — Shape Match,
// Geometry Builder, and any future geometry mechanic all draw the
// same fixed set of polygons). Points are hand-picked per shape, not
// computed, since the shape set is small and fixed.
const SHAPE_POINTS = {
  triangle: "50,12 90,85 10,85",
  square: "18,18 82,18 82,82 18,82",
  rectangle: "10,28 90,28 90,72 10,72",
  pentagon: "50,8 92,40 76,88 24,88 8,40",
  hexagon: "28,10 72,10 94,50 72,90 28,90 6,50",
  rhombus: "50,8 88,50 50,92 12,50",
};
const IDENTITY_MARKS = {
  investigation: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <line x1="14.7" y1="14.7" x2="21" y2="21" />
    </>
  ),
  engineering: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <line x1="12" y1="2" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="2" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="22" y2="12" />
    </>
  ),
  history: (
    <>
      <path d="M6 3h12" />
      <path d="M6 21h12" />
      <path d="M8 3c0 5 8 5 8 9s-8 4-8 9" />
      <path d="M16 3c0 5-8 5-8 9s8 4 8 9" />
    </>
  ),
  speed: <polygon points="13,2 4,14 11,14 9,22 20,9 12,9" />,
  boss: (
    <path d="M12 2 4 5v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V5l-8-3Z" />
  ),
  strategy: (
    <>
      <path d="M9 20h6" />
      <path d="M10 20c0-3 .5-3.5 1-4.5.6-1.1 1-2 1-3.5" />
      <path d="M14 20c0-3-.5-3.5-1-4.5" />
      <path d="M8 8c0-2.5 1.8-4.5 4-4.5S16 5.5 16 8c0 2-1 3-2 4h-4c-1-1-2-2-2-4Z" />
    </>
  ),
};

export function GameIdentityMark({ identity, size = 18 }) {
  const shape = IDENTITY_MARKS[identity];
  if (!shape) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="game-identity-mark shrink-0"
    >
      {shape}
    </svg>
  );
}

export function ShapeIcon({ shape, size = 56 }) {
  const points = SHAPE_POINTS[shape];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="shrink-0"
      aria-label={shape}
    >
      {points ? (
        <polygon
          points={points}
          fill="color-mix(in srgb, var(--primary-color) 14%, var(--card-bg))"
          stroke="var(--primary-color)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      ) : (
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="color-mix(in srgb, var(--primary-color) 14%, var(--card-bg))"
          stroke="var(--primary-color)"
          strokeWidth="4"
        />
      )}
    </svg>
  );
}
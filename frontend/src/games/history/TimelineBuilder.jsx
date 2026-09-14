import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  GamePage,
  GameTopBar,
  GamePanel,
  GamePrimaryButton,
  GameObjective,
  GameHint,
  GameFeedback,
  GameLoadingState,
  GameErrorState,
  GameLobby,
  GameResults,
  LeaveMissionDialog,
} from "../core/GameShell";
import { GAME_TYPE_TO_SKILLS } from "../gameRegistry";
import { useGameCompletionNav } from "../core/useGameCompletionNav";
import { useGameBackTarget } from "../core/useGameBackTarget";
import { useLeaveConfirmation } from "../core/useLeaveConfirmation";
import { GameFrame } from "../core/GameFrame";
import { themeFor as mergeTheme } from "../core/gameTheme";
import { GameIdentityMark } from "../core/GameShell";

const GAME_TYPE = "HISTORY_TIMELINE_BUILDER";
const IDENTITY = "history";

// Same ordered-sequence mechanic as Social Science's Process Builder /
// CS's Code Order Builder / English's Sentence Builder (shared backend
// orderedPieceIds check). Adopting the theme convention CircuitBuilder
// already proved (Phase 1B §16, core/gameTheme.js) so this mechanic
// can eventually be reused for other "put these in the order they
// happened/were done" content without a copy fork — every field below
// is exactly the copy this game already used, so with no `theme` on a
// level's payload nothing changes.
const DEFAULT_THEME = {
  topBarLabel: "Timeline Builder",
  badge: "HISTORY · SEQUENCE OF EVENTS",
  heading: "Reconstruct the Timeline",
  intro:
    "Events don't happen in isolation — arrange them in the order they actually occurred.",
  itemsNoun: "event timeline",
  objective: "Arrange the events in the order they actually happened.",
  eraLabel: "ERA",
  slotsLabel: "Timeline so far (tap an event to undo back to it):",
  componentsLabel: "Tap events to add them in order:",
  testButtonLabel: "Check Timeline",
  testingLabel: "Checking...",
  verdictCorrect: "✓ Timeline reconstructed correctly!",
  verdictIncorrect: "✕ That's not the right sequence.",
  whatYouLearned:
    "Understanding history means knowing not just what happened, but the order events unfolded in and why.",
  resultTopBarLabel: "Timeline Complete",
  resultBadge: "TIMELINE RECONSTRUCTED",
  playAnotherLabel: "Build Another Timeline",
};

const themeFor = (payload) => mergeTheme(DEFAULT_THEME, payload);

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  const theme = themeFor(levels[0]?.payload);
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label={theme.topBarLabel} xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label game-identity-badge">
          <GameIdentityMark identity={IDENTITY} />
          {theme.badge}
        </span>
        <h1 className="text-2xl font-bold mt-1 mb-3">{theme.heading}</h1>
        <p className="hint-text text-sm mb-4">{theme.intro}</p>
        <div className="flex flex-col gap-3">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => onPick(level)}
              className="hub-item flex items-center justify-between px-4 py-3 rounded-lg text-sm text-left"
            >
              <span className="flex flex-col">
                <span className="font-semibold">{level.title}</span>
                <span className="hint-text text-xs">
                  {level.payload.scrambled_events.length}-{themeFor(level.payload).itemsNoun}
                </span>
              </span>
              <span className="practice-pill px-2 py-1 rounded text-[11px]">
                {level.difficulty}
              </span>
            </button>
          ))}
        </div>
      </GamePanel>
    </GamePage>
  );
}

// ---------- Timeline-sequencing play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  const theme = themeFor(level.payload);
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label={theme.topBarLabel} xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel={theme.badge}
        objective={level.concept_id?.explanation_text}
        difficulty={level.difficulty}
        levelIndex={levelIndex}
        totalLevels={totalLevels}
        xpInfo={xpInfo}
        skills={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
        onStart={onStart}
        onBack={onBack}
      />
    </GamePage>
  );
}

function TimelineScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { era_label, scrambled_events, hint } = level.payload;
  const theme = themeFor(level.payload);
  const [tray, setTray] = useState(scrambled_events);
  const [placed, setPlaced] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const totalSlots = scrambled_events.length;

  const placeEvent = (event) => {
    if (feedback?.isCorrect) return;
    setTray((prev) => prev.filter((e) => e.id !== event.id));
    setPlaced((prev) => [...prev, event]);
    setFeedback(null);
  };

  // Same undo-to-here approach as Equation Builder / Ecosystem Balance
  // — click a step on the timeline to remove it and every step after
  // it, back to the tray.
  const undoFrom = (index) => {
    if (feedback?.isCorrect) return;
    const removed = placed.slice(index);
    setPlaced((prev) => prev.slice(0, index));
    setTray((prev) => [...prev, ...removed]);
    setFeedback(null);
  };

  const checkTimeline = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, {
        orderedPieceIds: placed.map((e) => e.id),
      })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  const stepClass = (i) => {
    if (feedback?.isCorrect) return "dragdrop-slot--correct";
    if (feedback && !feedback.isCorrect) return "dragdrop-slot--wrong";
    return i < placed.length ? "dragdrop-slot--filled" : "dragdrop-slot--empty";
  };

  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar
        label={level.title}
        xp={xp}
        streak={streak}
        onBack={onBack}
        progress={totalLevels ? { current: levelIndex + 1, total: totalLevels } : undefined}
      />
      <GamePanel>
        <GameObjective>{theme.objective}</GameObjective>

        <span className="clue-card__label game-identity-badge">
          <GameIdentityMark identity={IDENTITY} />
          {theme.eraLabel}
        </span>
        <h2 className="text-lg font-bold mt-1 mb-4">{era_label}</h2>

        <p className="hint-text text-xs mb-2">
          {theme.slotsLabel}
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {Array.from({ length: totalSlots }).map((_, i) => (
            <button
              key={i}
              onClick={() => i < placed.length && undoFrom(i)}
              disabled={i >= placed.length || feedback?.isCorrect}
              className={`${stepClass(i)} rounded-lg px-4 py-3 text-sm text-left`}
            >
              {i + 1}. {placed[i]?.label ?? "—"}
            </button>
          ))}
        </div>

        <p className="hint-text text-xs mb-2">{theme.componentsLabel}</p>
        <div className="flex flex-col gap-2 mb-4">
          {tray.map((event) => (
            <button
              key={event.id}
              onClick={() => placeEvent(event)}
              disabled={feedback?.isCorrect}
              className="dragdrop-item dragdrop-item--default px-4 py-3 rounded-lg text-sm text-left select-none"
            >
              {event.label}
            </button>
          ))}
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? theme.verdictCorrect : theme.verdictIncorrect}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={feedback.isCorrect ? theme.whatYouLearned : null}
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton
            disabled={placed.length !== totalSlots || submitting}
            onClick={checkTimeline}
          >
            {submitting ? theme.testingLabel : theme.testButtonLabel}
          </GamePrimaryButton>
        ) : (
          <GamePrimaryButton onClick={onSolved}>Claim Reward →</GamePrimaryButton>
        )}
      </GamePanel>
    </GamePage>
  );
}

// ---------- Result screen ----------
function ResultScreen({ level, result, xp, streak, onPlayAnother, onHome, onBackToChapter, onNextGame }) {
  const theme = themeFor(level?.payload);
  return (
    <GameResults
      identity={IDENTITY}
      completeLabel={theme.resultTopBarLabel}
      badgeText={theme.resultBadge}
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel={theme.playAnotherLabel}
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function TimelineBuilderGame() {
  const navigate = useNavigate();
  const { onBackToChapter, onNextGame } = useGameCompletionNav(GAME_TYPE);
  const goBack = useGameBackTarget();
  const [stage, setStage] = useState("loading");
  const leaveMission = useLeaveConfirmation(() => setStage("select"));
  const [levels, setLevels] = useState([]);
  const [pendingLevel, setPendingLevel] = useState(null);
  const [activeLevel, setActiveLevel] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [result, setResult] = useState(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xpInfo, setXpInfo] = useState(null);
  const [error, setError] = useState("");

  const loadLevels = () => {
    Promise.all([
      api.get("/games/content", { params: { gameType: GAME_TYPE } }),
      api.get("/home"),
    ])
      .then(([contentRes, homeRes]) => {
        setStreak(homeRes.data.streak_count || 0);
        setXp(homeRes.data.xp_total || 0);
        setLevels(contentRes.data.content);
        setXpInfo(contentRes.data.xpInfo || null);
        setStage("select");
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setStage("error");
      });
  };

  useEffect(() => {
    loadLevels();
     
  }, []);

  // Phase 11 (Game Lobby): picking a level shows the mission briefing
  // first — the actual /games/start call (which creates the session)
  // only fires once the student taps "Start Mission".
  const pickLevel = (level) => {
    setPendingLevel(level);
    setStage("lobby");
  };

  const startMission = () => {
    const level = pendingLevel;
    api
      .post("/games/start", { gameType: GAME_TYPE, contentId: level.id })
      .then((res) => {
        setActiveLevel({ ...level, payload: res.data.content.payload });
        setSessionId(res.data.sessionId);
        setStage("play");
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setStage("error");
      });
  };

  const solved = () => {
    api
      .post(`/games/${sessionId}/complete`)
      .then((res) => {
        setResult(res.data);
        setXp((prev) => prev + res.data.xpAwarded);
        setStreak(res.data.newStreak);
        setStage("result");
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setStage("error");
      });
  };

  if (stage === "loading") return <GameLoadingState label="Loading Timeline Builder..." />;
  if (stage === "error")
    return (
      <GameErrorState message={error} onRetry={loadLevels} onBack={goBack} />
    );

  if (stage === "select") {
    return (
      <LevelSelectScreen
        levels={levels}
        xp={xp}
        streak={streak}
        onBack={goBack}
        onPick={pickLevel}
      />
    );
  }

  if (stage === "lobby") {
    return (
      <LobbyScreen
        level={pendingLevel}
        levelIndex={levels.findIndex((l) => l.id === pendingLevel?.id)}
        totalLevels={levels.length}
        xp={xp}
        streak={streak}
        xpInfo={xpInfo}
        onBack={() => setStage("select")}
        onStart={startMission}
      />
    );
  }

  if (stage === "play") {
    return (
      <>
      <TimelineScreen
        level={activeLevel}
        sessionId={sessionId}
        xp={xp}
        streak={streak}
        onBack={leaveMission.requestLeave}
        onSolved={solved}
        levelIndex={levels.findIndex((l) => l.id === activeLevel?.id)}
        totalLevels={levels.length}
      />
      <LeaveMissionDialog
        open={leaveMission.confirmOpen}
        onStay={leaveMission.cancelLeave}
        onLeave={leaveMission.confirmLeave}
      />
      </>
    );
  }

  if (stage === "result") {
    return (
      <ResultScreen
        level={activeLevel}
        result={result}
        xp={xp}
        streak={streak}
        onPlayAnother={() => {
          setStage("loading");
          setActiveLevel(null);
          setSessionId(null);
          setResult(null);
          loadLevels();
        }}
        onHome={() => navigate("/home")}
        onBackToChapter={onBackToChapter}
        onNextGame={onNextGame}
      />
    );
  }

  return null;
}

// TimelineBuilder is one of the six Phase 1B representative games (§15) —
// wrapped in GameFrame for the focused game-session mode.
function TimelineBuilder() {
  return (
    <GameFrame>
      <TimelineBuilderGame />
    </GameFrame>
  );
}

export default TimelineBuilder;
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
} from "../core/GameShell";
import { GAME_TYPE_TO_SKILLS } from "../gameRegistry";
import { useGameCompletionNav } from "../core/useGameCompletionNav";
import { useGameBackTarget } from "../core/useGameBackTarget";
import { GameFrame } from "../core/GameFrame";

// Commerce's second mechanic (Accountancy / Business Studies /
// Economics, Grades 11-12): arranges the steps of a real accounting,
// business, or economic process into the order they actually happen —
// same order-sensitive family as HISTORY_TIMELINE_BUILDER / CS_CODE_
// ORDER_BUILDER / SOCIAL_SCIENCE_PROCESS_BUILDER (see
// gameControllers.js's shared orderedPieceIds === correct_order
// check), reusing that generic backend logic — no new backend
// scoring code needed. UI cloned from
// socialscience/ProcessBuilder.jsx.
const GAME_TYPE = "COMMERCE_PROCESS_BUILDER";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Process Builder" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">COMMERCE · REAL-WORLD PROCESSES</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Build the Process</h1>
        <p className="hint-text text-sm mb-4">
          Arrange the scrambled steps into the order they actually happen in accounting,
          business, or the economy.
        </p>
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
                  {level.payload.scrambled_steps.length}-step process
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

// ---------- Sequencing play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Process Builder" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="COMMERCE · REAL-WORLD PROCESSES"
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

function ProcessBuilderScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { scenario_label, scrambled_steps, hint } = level.payload;
  const [tray, setTray] = useState(scrambled_steps);
  const [placed, setPlaced] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const totalSlots = scrambled_steps.length;

  const placeStep = (step) => {
    if (feedback?.isCorrect) return;
    setTray((prev) => prev.filter((s) => s.id !== step.id));
    setPlaced((prev) => [...prev, step]);
    setFeedback(null);
  };

  // Tap a step already placed to undo back to it (same pattern as
  // Timeline Builder / Code Order Builder / Civic Process Builder).
  const undoFrom = (index) => {
    if (feedback?.isCorrect) return;
    const removed = placed.slice(index);
    setPlaced((prev) => prev.slice(0, index));
    setTray((prev) => [...prev, ...removed]);
    setFeedback(null);
  };

  const checkOrder = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, {
        orderedPieceIds: placed.map((s) => s.id),
      })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  return (
    <GamePage>
      <GameTopBar
        label={level.title}
        xp={xp}
        streak={streak}
        onBack={onBack}
        progress={totalLevels ? { current: levelIndex + 1, total: totalLevels } : undefined}
      />
      <GamePanel>
        <GameObjective>Arrange the steps in the order this process actually happens.</GameObjective>

        <span className="clue-card__label">SCENARIO</span>
        <h2 className="text-lg font-bold mt-1 mb-4">{scenario_label}</h2>

        <p className="hint-text text-xs mb-2">
          Your process so far (tap a step to undo back to it):
        </p>
        <div className="flex flex-col gap-2 mb-5 min-h-[3rem]">
          {placed.length === 0 && <span className="hint-text text-sm">— tap steps below to start —</span>}
          {placed.map((step, i) => (
            <button
              key={step.id}
              onClick={() => undoFrom(i)}
              disabled={feedback?.isCorrect}
              className={`${
                feedback?.isCorrect
                  ? "dragdrop-slot--correct"
                  : feedback && !feedback.isCorrect
                    ? "dragdrop-slot--wrong"
                    : "dragdrop-slot--filled"
              } rounded-lg px-4 py-3 text-sm text-left`}
            >
              {i + 1}. {step.label}
            </button>
          ))}
        </div>

        <p className="hint-text text-xs mb-2">Tap steps to add them in order:</p>
        <div className="flex flex-col gap-2 mb-4">
          {tray.map((step) => (
            <button
              key={step.id}
              onClick={() => placeStep(step)}
              disabled={feedback?.isCorrect}
              className="dragdrop-item dragdrop-item--default px-4 py-3 rounded-lg text-sm text-left select-none"
            >
              {step.label}
            </button>
          ))}
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ That's the correct process order!" : "✕ That's not quite the right order."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "Business and financial processes follow a logical sequence — each step depends on the one before it actually being completed first."
                : null
            }
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton
            disabled={placed.length !== totalSlots || submitting}
            onClick={checkOrder}
          >
            {submitting ? "Checking..." : "Check Process"}
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
  return (
    <GameResults
      completeLabel="Process Complete"
      badgeText="PROCESS BUILT"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Build Another Process"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function ProcessBuilderGame() {
  const navigate = useNavigate();
  const { onBackToChapter, onNextGame } = useGameCompletionNav(GAME_TYPE);
  const goBack = useGameBackTarget();
  const [stage, setStage] = useState("loading");
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

  if (stage === "loading") return <GameLoadingState label="Loading Commerce Process Builder..." />;
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
      <ProcessBuilderScreen
        level={activeLevel}
        sessionId={sessionId}
        xp={xp}
        streak={streak}
        onBack={() => setStage("select")}
        onSolved={solved}
        levelIndex={levels.findIndex((l) => l.id === activeLevel?.id)}
        totalLevels={levels.length}
      />
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

// ProcessBuilder is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function ProcessBuilder() {
  return (
    <GameFrame>
      <ProcessBuilderGame />
    </GameFrame>
  );
}

export default ProcessBuilder;

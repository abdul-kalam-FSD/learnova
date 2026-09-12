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

const GAME_TYPE = "MATH_NUMBER_MACHINE";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Number Machine" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">MATHEMATICS · SIMPLE EQUATIONS</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Power the Machine</h1>
        <p className="hint-text text-sm mb-4">
          Solve for the unknown, then dial in the number that powers the
          machine.
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
                <span className="hint-text text-xs">{level.payload.equation_label}</span>
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

// ---------- Play screen ----------
// Every other Math mechanic so far is a selection out of pieces
// (subset, order, mapping) — this is the odd one out on purpose: a
// dial the student turns to a specific number, not a set of tiles to
// pick from. Genuinely different both as a UI and as a check (plain
// numeric equality server-side, see checkAttempt's MATH_NUMBER_MACHINE
// branch), matching the "not one game mechanic for everything" brief.
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Number Machine" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="MATHEMATICS · SIMPLE EQUATIONS"
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

function MachineScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { equation_label, dial_min, dial_max, hint } = level.payload;
  const [dialValue, setDialValue] = useState(dial_min);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const adjust = (delta) => {
    if (feedback?.isCorrect) return;
    setDialValue((v) => Math.min(dial_max, Math.max(dial_min, v + delta)));
    setFeedback(null);
  };

  const checkMachine = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, { answer: dialValue })
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
        <GameObjective>Solve the equation for the unknown, then dial in the correct value.</GameObjective>

        <span className="clue-card__label">SOLVE</span>
        <h2 className="text-xl font-bold mt-1 mb-6 text-center">{equation_label}</h2>

        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={() => adjust(-1)}
            disabled={feedback?.isCorrect || dialValue <= dial_min}
            className="dragdrop-item dragdrop-item--default w-12 h-12 rounded-lg text-xl font-bold select-none"
          >
            −
          </button>
          <div className="dragdrop-item dragdrop-item--selected w-20 h-16 rounded-lg flex items-center justify-center text-3xl font-bold">
            {dialValue}
          </div>
          <button
            onClick={() => adjust(1)}
            disabled={feedback?.isCorrect || dialValue >= dial_max}
            className="dragdrop-item dragdrop-item--default w-12 h-12 rounded-lg text-xl font-bold select-none"
          >
            +
          </button>
        </div>
        <p className="hint-text text-xs text-center mb-6">
          Dial: {dial_min}–{dial_max}
        </p>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ The machine powers on!" : "✕ Not quite — the machine stays dark."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "Solving for an unknown means undoing each operation applied to it, in reverse order."
                : null
            }
          />
        )}

        {feedback?.isCorrect ? (
          <GamePrimaryButton onClick={onSolved}>Claim Reward →</GamePrimaryButton>
        ) : (
          <GamePrimaryButton disabled={submitting} onClick={checkMachine}>
            {submitting ? "Checking..." : "Power the Machine"}
          </GamePrimaryButton>
        )}
      </GamePanel>
    </GamePage>
  );
}

// ---------- Result screen ----------
function ResultScreen({ level, result, xp, streak, onPlayAnother, onHome, onBackToChapter, onNextGame }) {
  return (
    <GameResults
      completeLabel="Machine Powered"
      badgeText="NUMBER MACHINE COMPLETE"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Power Another Machine"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function NumberMachineGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Number Machine..." />;
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
      <MachineScreen
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

// NumberMachine is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function NumberMachine() {
  return (
    <GameFrame>
      <NumberMachineGame />
    </GameFrame>
  );
}

export default NumberMachine;

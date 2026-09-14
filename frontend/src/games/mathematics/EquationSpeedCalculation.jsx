import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  GamePage,
  GameTopBar,
  GamePanel,
  GamePrimaryButton,
  GameObjective,
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
import { useRoundTimer } from "../core/useRoundTimer";

const GAME_TYPE = "MATH_EQUATION_SPEED_CALCULATION";
// Long enough to see the "answer registered" flash before the next
// question loads, short enough that a quick-fire round still feels quick.
const FEEDBACK_PAUSE_MS = 500;

// Real numbers only: derived from the round's own payload + the
// server's actual XP constants, never invented.
function roundStats(level, xpInfo) {
  const questionCount = level.payload.questions.length;
  const perQuestionSeconds = level.payload.time_limit_seconds;
  const totalSeconds = questionCount * perQuestionSeconds;
  const timeEstimateMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const maxXpEstimate = xpInfo
    ? questionCount * xpInfo.perCorrect + (xpInfo.perfectBonus || 0)
    : undefined;
  return { questionCount, timeEstimateMinutes, maxXpEstimate };
}

// ---------- Round select ----------
function RoundSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Equation Speed Calculation" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">MATHEMATICS · SIMPLE EQUATIONS</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Quick-Fire Solving</h1>
        <p className="hint-text text-sm mb-4">
          Type the answer and submit before time runs out — same undo-the-
          operation thinking as the Number Machine, just faster.
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
                  {level.payload.questions.length} questions ·{" "}
                  {level.payload.time_limit_seconds}s each
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

// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  const { questionCount, timeEstimateMinutes, maxXpEstimate } = roundStats(level, xpInfo);
  return (
    <GamePage>
      <GameTopBar label={level.title} xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="MATHEMATICS · SIMPLE EQUATIONS"
        objective={
          level.concept_id?.explanation_text ||
          `Solve all ${questionCount} equations before time runs out on each one.`
        }
        difficulty={level.difficulty}
        levelIndex={levelIndex}
        totalLevels={totalLevels}
        xpInfo={xpInfo}
        maxXpEstimate={maxXpEstimate}
        timeEstimateMinutes={timeEstimateMinutes}
        skills={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
        onStart={onStart}
        onBack={onBack}
      />
    </GamePage>
  );
}

// ---------- Timed round play screen ----------
// Same batch/timer skeleton as Fraction Speed Challenge, but the
// interaction itself is different on purpose: typed numeric entry
// instead of tapping one of several options, since Number Machine
// already proved that fit for solving equations and this is the
// same input carried into a timed round rather than MCQ-under-time.
function RoundScreen({ level, xp, streak, onBack, onRoundScored, levelIndex, totalLevels }) {
  const { questions, time_limit_seconds } = level.payload;
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  const { question, index, timeLeft, timerPct, flash, recordAnswerAndAdvance } = useRoundTimer({
    questions,
    perQuestionSeconds: time_limit_seconds,
    feedbackPauseMs: FEEDBACK_PAUSE_MS,
    toAnswerPatch: (answerValue) => ({ answerValue }),
    toFlash: (answerValue) => ({ isTimeout: answerValue === null }),
    // Unlike the option-tapping games, timing out here submits
    // whatever's currently typed (which may not be empty) rather than
    // always `null` — an existing, deliberate behavior preserved here
    // rather than defaulting to the hook's null-on-timeout behavior.
    getTimeoutValue: () => (inputValue === "" ? null : Number(inputValue)),
    // Reset the typed input in the same batched update the hook uses
    // to advance to the next question, same as the original code did.
    onAdvance: () => setInputValue(""),
    onRoundComplete: onRoundScored,
  });

  const submitTyped = () => {
    if (flash) return;
    recordAnswerAndAdvance(inputValue === "" ? null : Number(inputValue));
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [index]);

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
        <GameObjective>Solve each equation for x correctly before the timer runs out.</GameObjective>

        <div className="flex items-center justify-between mb-2">
          <span className="clue-card__label">
            QUESTION {index + 1} / {questions.length}
          </span>
          <span className="hint-text text-xs">{timeLeft}s</span>
        </div>
        <div className="dragdrop-slot--empty rounded-lg h-2 mb-4 relative overflow-hidden" style={{ width: "100%" }}>
          <div
            className={timeLeft <= 2 ? "dragdrop-item--wrong h-full" : "dragdrop-item--correct h-full"}
            style={{ width: `${timerPct}%`, transition: "width 1s linear" }}
          />
        </div>

        <h2 className="text-xl font-bold mb-6 text-center">{question.equation_label}</h2>

        <div className="flex items-center justify-center gap-3 mb-4">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={inputValue}
            disabled={!!flash}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitTyped()}
            className="dragdrop-item dragdrop-item--default w-28 h-14 rounded-lg text-2xl font-bold text-center"
            placeholder="?"
            aria-label={`Your answer for ${question.equation_label}`}
          />
          <GamePrimaryButton onClick={submitTyped} disabled={!!flash || inputValue === ""}>
            Go
          </GamePrimaryButton>
        </div>

        {flash?.isTimeout && (
          <p className="hint-text text-xs text-center">⏱ Time's up — moving on.</p>
        )}
      </GamePanel>
    </GamePage>
  );
}

// ---------- Round score screen (batch attempt result, before claiming) ----------
function RoundResultScreen({ level, scoreResult, onClaim, submitting }) {
  const { correctCount, totalCount, isCorrect, hint } = scoreResult;
  return (
    <GamePage>
      <GameTopBar label={level.title} />
      <GamePanel>
        <span className="clue-card__label">ROUND COMPLETE</span>
        <h2 className="text-xl font-bold mt-1 mb-4">
          {correctCount} / {totalCount} correct
        </h2>
        <GameFeedback
          isCorrect={isCorrect}
          verdict={isCorrect ? "✓ Perfect round!" : "Nice try — check the ones you missed next time."}
          explanation={!isCorrect ? hint : null}
          whatYouLearned={
            isCorrect
              ? "Fast equation solving comes from spotting the operation needed at a glance, not working it out step by step under pressure."
              : null
          }
        />
        <GamePrimaryButton onClick={onClaim} disabled={submitting}>
          {submitting ? "Claiming..." : "Claim Reward →"}
        </GamePrimaryButton>
      </GamePanel>
    </GamePage>
  );
}

// ---------- Result screen ----------
function ResultScreen({ level, result, scoreResult, xp, streak, onPlayAnother, onHome, onBackToChapter, onNextGame }) {
  return (
    <GameResults
      completeLabel="Round Complete"
      badgeText="SPEED CALCULATION COMPLETE"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      accuracyPct={
        scoreResult && scoreResult.totalCount > 0
          ? Math.round((scoreResult.correctCount / scoreResult.totalCount) * 100)
          : undefined
      }
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Play Another Round"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function EquationSpeedCalculationGame() {
  const navigate = useNavigate();
  const { onBackToChapter, onNextGame } = useGameCompletionNav(GAME_TYPE);
  const goBack = useGameBackTarget();
  const [stage, setStage] = useState("loading");
  const leaveMission = useLeaveConfirmation(() => setStage("select"));
  const [levels, setLevels] = useState([]);
  const [pendingLevel, setPendingLevel] = useState(null);
  const [activeLevel, setActiveLevel] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [result, setResult] = useState(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xpInfo, setXpInfo] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  // Phase 11 (Game Lobby): picking a round shows the mission briefing
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

  const submitRound = (answers) => {
    api
      .post(`/games/${sessionId}/attempt`, { answers })
      .then((res) => {
        setScoreResult(res.data);
        setStage("roundResult");
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setStage("error");
      });
  };

  const claim = () => {
    setSubmitting(true);
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
      })
      .finally(() => setSubmitting(false));
  };

  if (stage === "loading") return <GameLoadingState label="Loading Equation Speed Calculation..." />;
  if (stage === "error")
    return (
      <GameErrorState message={error} onRetry={loadLevels} onBack={goBack} />
    );

  if (stage === "select") {
    return (
      <RoundSelectScreen
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
      <RoundScreen
        level={activeLevel}
        sessionId={sessionId}
        xp={xp}
        streak={streak}
        onBack={leaveMission.requestLeave}
        onRoundScored={submitRound}
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

  if (stage === "roundResult") {
    return (
      <RoundResultScreen
        level={activeLevel}
        scoreResult={scoreResult}
        onClaim={claim}
        submitting={submitting}
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
        scoreResult={scoreResult}
        onPlayAnother={() => {
          setStage("loading");
          setActiveLevel(null);
          setSessionId(null);
          setScoreResult(null);
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

// EquationSpeedCalculation is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function EquationSpeedCalculation() {
  return (
    <GameFrame>
      <EquationSpeedCalculationGame />
    </GameFrame>
  );
}

export default EquationSpeedCalculation;
import { useEffect, useState } from "react";
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
} from "../core/GameShell";
import { GAME_TYPE_TO_SKILLS } from "../gameRegistry";
import { useGameCompletionNav } from "../core/useGameCompletionNav";
import { useGameBackTarget } from "../core/useGameBackTarget";
import { GameFrame } from "../core/GameFrame";
import { useRoundTimer } from "../core/useRoundTimer";

const GAME_TYPE = "MATH_GEOMETRY_BOSS_CHALLENGE";
// Same pause used by Angle Speed Challenge — long enough to register
// the tap, short enough that a boss round still feels fast-paced.
const FEEDBACK_PAUSE_MS = 600;

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
      <GameTopBar label="Geometry Boss Challenge" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">MATHEMATICS · GEOMETRY · BOSS</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Face the Shape Golem</h1>
        <p className="hint-text text-sm mb-4">
          The Shape Golem only falls to a clean sweep — shapes, angles and
          perimeter all mixed into one fast round. Every wrong answer lets it
          stand a little longer.
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
        subjectLabel="MATHEMATICS · GEOMETRY · BOSS"
        objective={
          level.concept_id?.explanation_text ||
          `Defeat the boss by answering all ${questionCount} questions before time runs out on each one.`
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
function RoundScreen({ level, xp, streak, onBack, onRoundScored, levelIndex, totalLevels }) {
  const { questions, time_limit_seconds } = level.payload;
  const { question, index, timeLeft, timerPct, flash, recordAnswerAndAdvance } = useRoundTimer({
    questions,
    perQuestionSeconds: time_limit_seconds,
    feedbackPauseMs: FEEDBACK_PAUSE_MS,
    toAnswerPatch: (selectedOptionId) => ({ selectedOptionId }),
    toFlash: (selectedOptionId) => ({ optionId: selectedOptionId, isTimeout: selectedOptionId === null }),
    onRoundComplete: onRoundScored,
  });

  const optionClass = (optionId) => {
    if (flash?.optionId === optionId) {
      return "dragdrop-item dragdrop-item--selected";
    }
    return "dragdrop-item dragdrop-item--default";
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
        <GameObjective>Answer each geometry question correctly before the timer runs out to land a hit on the boss.</GameObjective>

        <div className="flex items-center justify-between mb-2">
          <span className="clue-card__label">
            ATTACK {index + 1} / {questions.length}
          </span>
          <span className="hint-text text-xs">{timeLeft}s</span>
        </div>
        <div className="dragdrop-slot--empty rounded-lg h-2 mb-4 relative overflow-hidden" style={{ width: "100%" }}>
          <div
            className={timeLeft <= 2 ? "dragdrop-item--wrong h-full" : "dragdrop-item--correct h-full"}
            style={{ width: `${timerPct}%`, transition: "width 1s linear" }}
          />
        </div>

        <h2 className="text-lg font-bold mb-4">{question.prompt}</h2>

        <div className="flex flex-col gap-2 mb-4">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => recordAnswerAndAdvance(opt.id)}
              disabled={!!flash}
              className={`${optionClass(opt.id)} px-4 py-3 rounded-lg text-sm text-left select-none`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {flash?.isTimeout && (
          <p className="hint-text text-xs">⏱ Time's up — the Golem shrugs it off.</p>
        )}
      </GamePanel>
    </GamePage>
  );
}

// ---------- Round score screen (boss health revealed here, not live during play —
// per-question correctness is sanitized server-side same as Angle Speed Challenge) ----------
function RoundResultScreen({ level, scoreResult, onClaim, submitting }) {
  const { correctCount, totalCount, isCorrect, hint } = scoreResult;
  const golemHealthPct = totalCount > 0 ? Math.max(0, 100 - (correctCount / totalCount) * 100) : 100;

  return (
    <GamePage>
      <GameTopBar label={level.title} />
      <GamePanel>
        <span className="clue-card__label">BOSS HEALTH</span>
        <div className="dragdrop-slot--empty rounded-lg h-3 mb-4 relative overflow-hidden" style={{ width: "100%" }}>
          <div
            className={isCorrect ? "dragdrop-item--correct h-full" : "dragdrop-item--wrong h-full"}
            style={{ width: `${golemHealthPct}%`, transition: "width 0.6s ease" }}
          />
        </div>
        <h2 className="text-xl font-bold mt-1 mb-4">
          {correctCount} / {totalCount} hits landed
        </h2>
        <GameFeedback
          isCorrect={isCorrect}
          verdict={isCorrect ? "✓ The Shape Golem is down!" : "The Golem is still standing — one miss was all it took."}
          explanation={!isCorrect ? hint : null}
          whatYouLearned={
            isCorrect
              ? "Geometric properties (angles, area, symmetry) follow fixed rules that let you check an answer quickly."
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

// ---------- Final result screen ----------
function ResultScreen({ level, result, scoreResult, xp, streak, onPlayAnother, onHome, onBackToChapter, onNextGame }) {
  return (
    <GameResults
      completeLabel="Boss Battle Complete"
      badgeText="BOSS CHALLENGE COMPLETE"
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
      playAgainLabel="Rematch the Golem"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function GeometryBossChallengeGame() {
  const navigate = useNavigate();
  const { onBackToChapter, onNextGame } = useGameCompletionNav(GAME_TYPE);
  const goBack = useGameBackTarget();
  const [stage, setStage] = useState("loading");
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

  if (stage === "loading") return <GameLoadingState label="Loading Geometry Boss Challenge..." />;
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
      <RoundScreen
        level={activeLevel}
        xp={xp}
        streak={streak}
        onBack={() => setStage("select")}
        onRoundScored={submitRound}
        levelIndex={levels.findIndex((l) => l.id === activeLevel?.id)}
        totalLevels={levels.length}
      />
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

// GeometryBossChallenge is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function GeometryBossChallenge() {
  return (
    <GameFrame>
      <GeometryBossChallengeGame />
    </GameFrame>
  );
}

export default GeometryBossChallenge;

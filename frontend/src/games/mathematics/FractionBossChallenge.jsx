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
  LeaveMissionDialog,
} from "../core/GameShell";
import { GAME_TYPE_TO_SKILLS } from "../gameRegistry";
import { useGameCompletionNav } from "../core/useGameCompletionNav";
import { useGameBackTarget } from "../core/useGameBackTarget";
import { useLeaveConfirmation } from "../core/useLeaveConfirmation";
import { useRoundLives } from "../core/useRoundLives";
import { GameFrame } from "../core/GameFrame";
import { GameIdentityMark } from "../core/GameShell";

const GAME_TYPE = "MATH_FRACTION_BOSS_CHALLENGE";
const IDENTITY = "boss";
// Same purpose as Speed Challenge's FEEDBACK_PAUSE_MS — long enough to
// see the hit/life-lost flash before the next question loads.
const FEEDBACK_PAUSE_MS = 600;

// Real numbers only: derived from the round's own payload + the
// server's actual XP constants, never invented. This variant is
// untimed (lives-based, not a clock), so there's no time estimate —
// GameLobby already skips that pill when it isn't provided.
function roundStats(level, xpInfo) {
  const questionCount = level.payload.questions.length;
  const maxXpEstimate = xpInfo
    ? questionCount * xpInfo.perCorrect + (xpInfo.perfectBonus || 0)
    : undefined;
  return { questionCount, maxXpEstimate };
}

// ---------- Round select ----------
function RoundSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label="Fraction Boss Challenge" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label game-identity-badge">
          <GameIdentityMark identity={IDENTITY} />
          MATHEMATICS · FRACTIONS
        </span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Defeat the Boss</h1>
        <p className="hint-text text-sm mb-4">
          No timer here — every correct answer damages the boss, but run out
          of lives and it escapes. Take your time, just don't waste your
          chances.
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
                  {level.payload.max_lives} lives
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
  const { questionCount, maxXpEstimate } = roundStats(level, xpInfo);
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label={level.title} xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="MATHEMATICS · FRACTIONS · BOSS"
        objective={
          level.concept_id?.explanation_text ||
          `Defeat the boss by answering all ${questionCount} questions correctly before your lives run out.`
        }
        difficulty={level.difficulty}
        levelIndex={levelIndex}
        totalLevels={totalLevels}
        xpInfo={xpInfo}
        maxXpEstimate={maxXpEstimate}
        skills={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
        onStart={onStart}
        onBack={onBack}
      />
    </GamePage>
  );
}

// ---------- Boss battle play screen ----------
// Round-loop state now lives in useRoundLives (Phase 1B §6-8) —
// extracted verbatim from this component. See that hook's own comment
// for why it currently has exactly one real consumer (this game), not
// three, despite the "Boss Challenge" naming shared with two other
// games that turned out to be timed, not lives-based.
function RoundScreen({ level, sessionId, xp, streak, onBack, onRoundOver, onError, levelIndex, totalLevels }) {
  const { questions, max_lives } = level.payload;
  const totalCount = questions.length;

  const { question, index, lives, correctCount, flash, recordAnswerAndAdvance } = useRoundLives({
    questions,
    maxLives: max_lives,
    feedbackPauseMs: FEEDBACK_PAUSE_MS,
    submitAnswers: (answersSoFar) =>
      api.post(`/games/${sessionId}/attempt`, { answers: answersSoFar }),
    onRoundOver,
    onError,
  });

  const optionClass = (optionId) => {
    if (flash?.optionId === optionId) {
      return flash.wrong
        ? "dragdrop-item dragdrop-item--wrong"
        : "dragdrop-item dragdrop-item--correct";
    }
    return "dragdrop-item dragdrop-item--default";
  };

  const bossHealth = totalCount - correctCount;
  const healthPct = Math.max(0, Math.min(100, (bossHealth / totalCount) * 100));

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
        <GameObjective>Answer correctly to damage the boss — but each wrong answer costs a life.</GameObjective>

        <div className="flex items-center justify-between mb-2">
          <span className="clue-card__label game-identity-badge">
            <GameIdentityMark identity={IDENTITY} />
            BOSS HEALTH
          </span>
          <span className="hint-text text-xs">
            {"❤".repeat(Math.max(0, lives))}
            {"🖤".repeat(Math.max(0, max_lives - lives))}
          </span>
        </div>
        <div className="dragdrop-slot--empty rounded-lg h-3 mb-4 relative overflow-hidden" style={{ width: "100%" }}>
          <div
            className="dragdrop-item--correct h-full"
            style={{ width: `${healthPct}%`, transition: "width 400ms ease-out" }}
          />
        </div>

        <span className="clue-card__label">
          QUESTION {index + 1} / {questions.length}
        </span>
        <h2 className="text-lg font-bold mt-1 mb-4">{question.prompt}</h2>

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

        {flash?.wrong && (
          <p className="hint-text text-xs">💔 Life lost — the dragon shrugs it off.</p>
        )}
      </GamePanel>
    </GamePage>
  );
}

// ---------- Round score screen (result, before claiming) ----------
function RoundResultScreen({ level, scoreResult, outcome, onClaim, submitting }) {
  const { correctCount, totalCount, hint } = scoreResult;
  const { bossDefeated } = outcome;
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label={level.title} />
      <GamePanel>
        <span className="clue-card__label game-identity-badge">
          <GameIdentityMark identity={IDENTITY} />
          {bossDefeated ? "BOSS DEFEATED" : "BOSS ESCAPED"}
        </span>
        <h2 className="text-xl font-bold mt-1 mb-4">
          {correctCount} / {totalCount} correct
        </h2>
        <GameFeedback
          isCorrect={bossDefeated}
          verdict={
            bossDefeated
              ? "✓ The Denominator Dragon is defeated!"
              : "Out of lives — the dragon got away this time."
          }
          explanation={!bossDefeated ? hint : null}
          whatYouLearned={
            bossDefeated
              ? "Simplifying fractions before comparing or combining them makes the arithmetic much faster."
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
      identity={IDENTITY}
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
      playAgainLabel="Play Another Round"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function FractionBossChallengeGame() {
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
  const [outcome, setOutcome] = useState(null);
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

  // The last incremental /attempt call inside RoundScreen already
  // covers the whole answers-so-far batch (boss defeated/escaped/round
  // finished all resolve there), so there's nothing left to submit
  // here — just carry that result into the result screen.
  const handleRoundOver = (finalScoreResult, roundOutcome) => {
    setScoreResult(finalScoreResult);
    setOutcome(roundOutcome);
    setStage("roundResult");
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

  if (stage === "loading") return <GameLoadingState label="Loading Fraction Boss Challenge..." />;
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
        onRoundOver={handleRoundOver}
        onError={(msg) => {
          setError(msg);
          setStage("error");
        }}
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
        outcome={outcome}
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
          setOutcome(null);
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

// FractionBossChallenge is one of the six Phase 1B representative
// games (§15) — wrapped in GameFrame for the focused game-session mode.
function FractionBossChallenge() {
  return (
    <GameFrame>
      <FractionBossChallengeGame />
    </GameFrame>
  );
}

export default FractionBossChallenge;
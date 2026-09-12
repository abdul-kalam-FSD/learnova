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

const GAME_TYPE = "MATH_FRACTION_STRATEGY_CHALLENGE";

function fractionLabel(f) {
  return `${f.numerator}/${f.denominator}`;
}

function fractionPct(f) {
  return Math.min(100, (f.numerator / f.denominator) * 100);
}

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Fraction Strategy Challenge" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">MATHEMATICS · FRACTIONS</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Cross in Limited Moves</h1>
        <p className="hint-text text-sm mb-4">
          No clock this time — but every piece you tap costs a move. Plan the
          combination before you commit, because once your moves run out,
          that's it.
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
                  Target: {fractionLabel(level.payload.target)} · {level.payload.max_moves} moves
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

// ---------- Play screen ----------
// Every piece is a committed move — no undo, unlike Fraction Builder's
// freely add/remove pieces before checking. That's the whole point of
// "strategy": the student has to think ahead about which combination
// reaches the target in the fewest taps, not experiment their way there.
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Fraction Strategy Challenge" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="MATHEMATICS · FRACTIONS"
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

function StrategyScreen({ level, sessionId, xp, streak, onBack, onSolved }) {
  const { target, pieces, max_moves, hint } = level.payload;
  const [available, setAvailable] = useState(pieces);
  const [placed, setPlaced] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const movesLeft = max_moves - placed.length;
  const outOfMoves = movesLeft <= 0 && !feedback?.isCorrect;

  const placedPct = placed.reduce((sum, p) => sum + fractionPct(p), 0);
  const targetPct = fractionPct(target);

  const commitPiece = (piece) => {
    if (feedback?.isCorrect || movesLeft <= 0) return;
    setAvailable((prev) => prev.filter((p) => p.id !== piece.id));
    setPlaced((prev) => [...prev, piece]);
    setFeedback(null);
  };

  const checkCrossing = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, {
        selectedPieceIds: placed.map((p) => p.id),
      })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  const resetAttempt = () => {
    setAvailable(pieces);
    setPlaced([]);
    setFeedback(null);
  };

  return (
    <GamePage>
      <GameTopBar label={level.title} xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <GameObjective>Combine fraction pieces to match the target length in the fewest moves.</GameObjective>

        <div className="flex items-center justify-between mb-2">
          <span className="clue-card__label">TARGET {fractionLabel(target)}</span>
          <span className="hint-text text-xs">
            {Math.max(0, movesLeft)} / {max_moves} moves left
          </span>
        </div>

        <div className="mb-1 hint-text text-xs">Target length</div>
        <div className="dragdrop-slot--empty rounded-lg h-6 mb-4 relative overflow-hidden" style={{ width: "100%" }}>
          <div className="dragdrop-item--correct h-full" style={{ width: `${targetPct}%` }} />
        </div>

        <div className="mb-1 hint-text text-xs">Your crossing</div>
        <div className="dragdrop-slot--empty rounded-lg h-6 mb-4 relative overflow-hidden" style={{ width: "100%" }}>
          <div
            className={`h-full ${
              feedback?.isCorrect
                ? "dragdrop-item--correct"
                : feedback && !feedback.isCorrect
                  ? "dragdrop-item--wrong"
                  : "dragdrop-item--selected"
            }`}
            style={{ width: `${Math.min(placedPct, 100)}%` }}
          />
        </div>

        <p className="hint-text text-xs mb-2">
          Tap a piece to commit it — no taking it back:
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {available.map((piece) => (
            <button
              key={piece.id}
              onClick={() => commitPiece(piece)}
              disabled={feedback?.isCorrect || movesLeft <= 0}
              className="dragdrop-item dragdrop-item--default px-3 py-2 rounded-lg text-sm select-none"
            >
              {fractionLabel(piece)}
            </button>
          ))}
        </div>

        {placed.length > 0 && (
          <>
            <p className="hint-text text-xs mb-2">Moves spent:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {placed.map((piece, i) => (
                <span
                  key={`${piece.id}-${i}`}
                  className="dragdrop-item dragdrop-item--selected px-3 py-2 rounded-lg text-sm select-none"
                >
                  {fractionLabel(piece)}
                </span>
              ))}
            </div>
          </>
        )}

        {!feedback?.isCorrect && !outOfMoves && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ You crossed it!" : "✕ That's not the right combination."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "Adding fractions with different denominators means finding a common length to measure against."
                : null
            }
          />
        )}

        {outOfMoves && !feedback && (
          <GameFeedback isCorrect={false} verdict="Out of moves." explanation={hint} />
        )}

        {feedback?.isCorrect ? (
          <GamePrimaryButton onClick={onSolved}>Claim Reward →</GamePrimaryButton>
        ) : outOfMoves ? (
          <GamePrimaryButton onClick={resetAttempt}>Try Again</GamePrimaryButton>
        ) : (
          <GamePrimaryButton disabled={placed.length === 0 || submitting} onClick={checkCrossing}>
            {submitting ? "Checking..." : "Check Crossing"}
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
      completeLabel="Crossing Complete"
      badgeText="STRATEGY CHALLENGE COMPLETE"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Try Another Crossing"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function FractionStrategyChallengeGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Fraction Strategy Challenge..." />;
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
      <StrategyScreen
        level={activeLevel}
        sessionId={sessionId}
        xp={xp}
        streak={streak}
        onBack={() => setStage("select")}
        onSolved={solved}
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

// FractionStrategyChallenge is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function FractionStrategyChallenge() {
  return (
    <GameFrame>
      <FractionStrategyChallengeGame />
    </GameFrame>
  );
}

export default FractionStrategyChallenge;

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
import { GameIdentityMark } from "../core/GameShell";

const GAME_TYPE = "MATH_EQUATION_BALANCE_STRATEGY";
const IDENTITY = "strategy";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label="Equation Balance Strategy" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label game-identity-badge">
          <GameIdentityMark identity={IDENTITY} />
          MATHEMATICS · SIMPLE EQUATIONS
        </span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Keep It Balanced</h1>
        <p className="hint-text text-sm mb-4">
          Every operation you pick applies to both sides of the scale at
          once — no undo, and only a few moves before you're out. Plan the
          order before you tap.
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
                <span className="hint-text text-xs">{level.payload.max_moves} moves</span>
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

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

// ---------- Play screen ----------
// Like Fraction Strategy Challenge, operations are one-way commits —
// no undo before checking — because the point is choosing the right
// order under a budget, not trial-and-error. What's different here:
// the server has no stored "correct answer" at all (see checkAttempt's
// MATH_EQUATION_BALANCE_STRATEGY branch); it re-applies whichever
// operations the student picked to the real starting equation and
// checks whether the scale actually landed on "1x = c". The live
// left/right totals shown below are computed the same way client-side,
// purely for visual feedback — the server redoes the real check.
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label="Equation Balance Strategy" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="MATHEMATICS · SIMPLE EQUATIONS"
        objective={
          level.concept_id?.explanation_text ||
          `Balance the equation in ${level.payload.max_moves} moves or fewer.`
        }
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

function BalanceScreen({ level, sessionId, xp, streak, onBack, onSolved }) {
  const { equation_label, initial_equation, available_ops, max_moves, hint } = level.payload;
  const [available, setAvailable] = useState(available_ops);
  const [applied, setApplied] = useState([]);
  const [state, setState] = useState(initial_equation);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const movesLeft = max_moves - applied.length;
  const solved = Math.abs(state.a - 1) < 1e-9 && Math.abs(state.b) < 1e-9;
  const outOfMoves = movesLeft <= 0 && !solved;

  const applyOp = (op) => {
    if (solved || movesLeft <= 0) return;
    let { a, b, c } = state;
    if (op.op === "add") {
      b += op.value;
      c += op.value;
    } else if (op.op === "subtract") {
      b -= op.value;
      c -= op.value;
    } else if (op.op === "multiply") {
      a *= op.value;
      b *= op.value;
      c *= op.value;
    } else if (op.op === "divide") {
      a /= op.value;
      b /= op.value;
      c /= op.value;
    }
    setState({ a, b, c });
    setAvailable((prev) => prev.filter((o) => o.id !== op.id));
    setApplied((prev) => [...prev, op]);
    setFeedback(null);
  };

  const checkBalance = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, {
        operationSequence: applied.map((o) => o.id),
      })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  const resetAttempt = () => {
    setAvailable(available_ops);
    setApplied([]);
    setState(initial_equation);
    setFeedback(null);
  };

  const leftSide = `${state.a !== 1 ? fmt(state.a) : ""}x${state.b !== 0 ? (state.b > 0 ? ` + ${fmt(state.b)}` : ` − ${fmt(Math.abs(state.b))}`) : ""}`;

  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label={level.title} xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <GameObjective>Apply the same operation to both sides to isolate x, using as few moves as possible.</GameObjective>

        <div className="flex items-center justify-between mb-2">
          <span className="clue-card__label game-identity-badge">
            <GameIdentityMark identity={IDENTITY} />
            STARTED FROM
          </span>
          <span className="hint-text text-xs">
            {Math.max(0, movesLeft)} / {max_moves} moves left
          </span>
        </div>
        <p className="hint-text text-xs mb-4">{equation_label}</p>

        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="dragdrop-item dragdrop-item--selected px-4 py-3 rounded-lg text-lg font-bold">
            {leftSide || "x"}
          </div>
          <span className="text-lg font-bold">=</span>
          <div className="dragdrop-item dragdrop-item--selected px-4 py-3 rounded-lg text-lg font-bold">
            {fmt(state.c)}
          </div>
        </div>

        <p className="hint-text text-xs mb-2">
          Tap an operation to apply it to both sides — no taking it back:
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {available.map((op) => (
            <button
              key={op.id}
              onClick={() => applyOp(op)}
              disabled={solved || movesLeft <= 0}
              className="dragdrop-item dragdrop-item--default px-3 py-2 rounded-lg text-sm select-none"
            >
              {op.label}
            </button>
          ))}
        </div>

        {applied.length > 0 && (
          <>
            <p className="hint-text text-xs mb-2">Moves applied:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {applied.map((op, i) => (
                <span
                  key={`${op.id}-${i}`}
                  className="dragdrop-item dragdrop-item--selected px-3 py-2 rounded-lg text-sm select-none"
                >
                  {op.label}
                </span>
              ))}
            </div>
          </>
        )}

        {!feedback?.isCorrect && !outOfMoves && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ Balanced!" : "✕ That's not balanced within your moves."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "Whatever operation you apply to one side of an equation, you must apply to the other to keep it balanced."
                : null
            }
          />
        )}

        {outOfMoves && !feedback && (
          <GameFeedback isCorrect={false} verdict="Out of moves — not balanced yet." explanation={hint} />
        )}

        {feedback?.isCorrect ? (
          <GamePrimaryButton onClick={onSolved}>Claim Reward →</GamePrimaryButton>
        ) : outOfMoves ? (
          <GamePrimaryButton onClick={resetAttempt}>Try Again</GamePrimaryButton>
        ) : (
          <GamePrimaryButton disabled={applied.length === 0 || submitting} onClick={checkBalance}>
            {submitting ? "Checking..." : "Check Balance"}
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
      identity={IDENTITY}
      completeLabel="Balanced"
      badgeText="BALANCE STRATEGY COMPLETE"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Balance Another Equation"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function EquationBalanceStrategyGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Equation Balance Strategy..." />;
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
      <BalanceScreen
        level={activeLevel}
        sessionId={sessionId}
        xp={xp}
        streak={streak}
        onBack={leaveMission.requestLeave}
        onSolved={solved}
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

// EquationBalanceStrategy is one of the six Phase 1B representative games (§15) —
// wrapped in GameFrame for the focused game-session mode.
function EquationBalanceStrategy() {
  return (
    <GameFrame>
      <EquationBalanceStrategyGame />
    </GameFrame>
  );
}

export default EquationBalanceStrategy;
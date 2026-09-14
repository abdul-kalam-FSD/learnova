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

const GAME_TYPE = "MATH_PASCAL_TRIANGLE_BUILD";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Pascal's Triangle Builder" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">MATHEMATICS · BINOMIAL THEOREM</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Grow the Triangle</h1>
        <p className="hint-text text-sm mb-4">
          Every number is the sum of the two above it. Tap the coefficient
          tiles in order, left to right, to build the next row.
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
                  Build row {level.payload.prior_rows.length + 1} · (a + b)
                  <sup>{level.payload.prior_rows.length}</sup>
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

// ---------- Triangle pyramid visual (read-only prior rows) ----------
function TrianglePyramid({ priorRows, placed, totalSlots }) {
  return (
    <div className="flex flex-col items-center gap-1 mb-5">
      {priorRows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1.5">
          {row.map((value, i) => (
            <span
              key={i}
              className="dragdrop-slot--filled rounded-md w-9 h-9 flex items-center justify-center text-xs font-mono"
            >
              {value}
            </span>
          ))}
        </div>
      ))}
      {/* The row currently being built — same width as the tile tray,
          filled left-to-right as the student taps tiles. */}
      <div className="flex gap-1.5 mt-1">
        {Array.from({ length: totalSlots }).map((_, i) => (
          <span
            key={i}
            className={`rounded-md w-9 h-9 flex items-center justify-center text-xs font-mono ${
              i < placed.length ? "dragdrop-slot--filled" : "dragdrop-slot--empty"
            }`}
          >
            {placed[i]?.label ?? "?"}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Row-building play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Pascal's Triangle Builder" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="MATHEMATICS · BINOMIAL THEOREM"
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

function BuildScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { prior_rows, scrambled_pieces, hint } = level.payload;
  const [tray, setTray] = useState(scrambled_pieces);
  const [placed, setPlaced] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const totalSlots = scrambled_pieces.length;

  const placePiece = (piece) => {
    if (feedback?.isCorrect) return;
    setTray((prev) => prev.filter((p) => p.id !== piece.id));
    setPlaced((prev) => [...prev, piece]);
    setFeedback(null);
  };

  // Undo-to-here, same as Equation Builder — simpler than full
  // drag-reorder, still lets the student fix an early mistake.
  const undoFrom = (index) => {
    if (feedback?.isCorrect) return;
    const removed = placed.slice(index);
    setPlaced((prev) => prev.slice(0, index));
    setTray((prev) => [...prev, ...removed]);
    setFeedback(null);
  };

  const checkRow = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, {
        orderedPieceIds: placed.map((p) => p.id),
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
        <GameObjective>Build the next row of Pascal's Triangle, where each number is the sum of the two above it.</GameObjective>

        <span className="clue-card__label">BUILD ROW {prior_rows.length + 1}</span>
        <p className="hint-text text-xs mt-1 mb-3">
          Tap a tile in the row below to undo back to that point.
        </p>

        <TrianglePyramid
          priorRows={prior_rows}
          placed={placed}
          totalSlots={totalSlots}
        />

        {/* Undo control lives separately from the pyramid so the
            pyramid stays a clean read-only visual. */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {placed.map((piece, i) => (
            <button
              key={piece.id}
              onClick={() => undoFrom(i)}
              disabled={feedback?.isCorrect}
              className="dragdrop-item dragdrop-item--selected px-3 py-1 rounded-lg text-xs font-mono select-none"
            >
              {piece.label} ↺
            </button>
          ))}
        </div>

        <p className="hint-text text-xs mb-2">Tap tiles to add them in order:</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tray.map((piece) => (
            <button
              key={piece.id}
              onClick={() => placePiece(piece)}
              disabled={feedback?.isCorrect}
              className="dragdrop-item dragdrop-item--default px-3 py-2 rounded-lg text-sm font-mono select-none"
            >
              {piece.label}
            </button>
          ))}
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ That's the row!" : "✕ Not quite — check the sums above."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "Each entry in Pascal's Triangle is the sum of the two entries directly above it in the previous row."
                : null
            }
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton
            disabled={placed.length !== totalSlots || submitting}
            onClick={checkRow}
          >
            {submitting ? "Checking..." : "Check Row"}
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
      completeLabel="Row Complete"
      badgeText="TRIANGLE ROW BUILT"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Build Another Row"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function PascalTriangleBuilderGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Pascal's Triangle Builder..." />;
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
      <BuildScreen
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

// PascalTriangleBuilder is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function PascalTriangleBuilder() {
  return (
    <GameFrame>
      <PascalTriangleBuilderGame />
    </GameFrame>
  );
}

export default PascalTriangleBuilder;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  GamePage,
  GameTopBar,
  GamePanel,
  GamePrimaryButton,
  ShapeIcon,
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

const GAME_TYPE = "MATH_GEOMETRY_BUILDER";

function targetLabel(target) {
  return `${target.perimeter}${target.unit}`;
}

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Geometry Builder" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">MATHEMATICS · GEOMETRY</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Construct the Shape</h1>
        <p className="hint-text text-sm mb-4">
          Pick side-length pieces that add up to the target perimeter — build
          a shape strong enough to stand.
        </p>
        <div className="flex flex-col gap-3">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => onPick(level)}
              className="hub-item flex items-center justify-between px-4 py-3 rounded-lg text-sm text-left"
            >
              <span className="flex items-center gap-3">
                <ShapeIcon shape={level.payload.target.shape} size={36} />
                <span className="flex flex-col">
                  <span className="font-semibold">{level.title}</span>
                  <span className="hint-text text-xs">
                    Target: {targetLabel(level.payload.target)}
                  </span>
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

// ---------- Construction play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Geometry Builder" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="MATHEMATICS · GEOMETRY"
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

function ConstructionScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { target, pieces, hint } = level.payload;
  const [available, setAvailable] = useState(pieces);
  const [placed, setPlaced] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const addPiece = (piece) => {
    if (feedback?.isCorrect) return;
    setAvailable((prev) => prev.filter((p) => p.id !== piece.id));
    setPlaced((prev) => [...prev, piece]);
    setFeedback(null);
  };

  const removePiece = (piece) => {
    if (feedback?.isCorrect) return;
    setPlaced((prev) => prev.filter((p) => p.id !== piece.id));
    setAvailable((prev) => [...prev, piece]);
    setFeedback(null);
  };

  const builtLength = placed.reduce((sum, p) => sum + p.length, 0);
  const builtPct = Math.min(100, (builtLength / target.perimeter) * 100);

  const checkConstruction = () => {
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
        <GameObjective>Build the target shape by selecting side pieces that sum to its perimeter.</GameObjective>

        <span className="clue-card__label">TARGET</span>
        <div className="flex items-center gap-3 mt-1 mb-3">
          <ShapeIcon shape={target.shape} />
          <h2 className="text-lg font-bold">
            Build a {target.shape} with perimeter {targetLabel(target)}
          </h2>
        </div>

        <div className="mb-1 hint-text text-xs">
          Your construction: {builtLength}{target.unit} / {targetLabel(target)}
        </div>
        <div className="dragdrop-slot--empty rounded-lg h-6 mb-4 relative overflow-hidden" style={{ width: "100%" }}>
          <div
            className={`h-full ${feedback?.isCorrect ? "dragdrop-item--correct" : feedback && !feedback.isCorrect ? "dragdrop-item--wrong" : "dragdrop-item--selected"}`}
            style={{ width: `${builtPct}%` }}
          />
        </div>

        <p className="hint-text text-xs mb-2">Tap pieces to add them as sides:</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {available.map((piece) => (
            <button
              key={piece.id}
              onClick={() => addPiece(piece)}
              disabled={feedback?.isCorrect}
              className="dragdrop-item dragdrop-item--default px-3 py-2 rounded-lg text-sm select-none"
            >
              {piece.length}{target.unit}
            </button>
          ))}
        </div>

        {placed.length > 0 && (
          <>
            <p className="hint-text text-xs mb-2">Sides placed (tap to remove):</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {placed.map((piece) => (
                <button
                  key={piece.id}
                  onClick={() => removePiece(piece)}
                  disabled={feedback?.isCorrect}
                  className="dragdrop-item dragdrop-item--selected px-3 py-2 rounded-lg text-sm select-none"
                >
                  {piece.length}{target.unit}
                </button>
              ))}
            </div>
          </>
        )}

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ Shape constructed!" : "✕ That doesn't build the target shape."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "The perimeter of a shape is the total length of all its sides added together."
                : null
            }
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton disabled={placed.length === 0 || submitting} onClick={checkConstruction}>
            {submitting ? "Checking..." : "Check Construction"}
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
      completeLabel="Construction Complete"
      badgeText="CONSTRUCTION COMPLETE"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Build Another Shape"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function GeometryBuilderGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Geometry Builder..." />;
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
      <ConstructionScreen
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

// GeometryBuilder is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function GeometryBuilder() {
  return (
    <GameFrame>
      <GeometryBuilderGame />
    </GameFrame>
  );
}

export default GeometryBuilder;
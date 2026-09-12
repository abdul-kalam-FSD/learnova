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

const GAME_TYPE = "MATH_GEOMETRY_STRATEGY_CHALLENGE";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Geometry Strategy Challenge" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">MATHEMATICS · GEOMETRY</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Build It in the Fewest Moves</h1>
        <p className="hint-text text-sm mb-4">
          Pick side pieces that add up to the target perimeter — but you only
          get a limited number of picks, so plan the combo before you tap.
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
                  Target {level.payload.target_perimeter} {level.payload.unit} · max{" "}
                  {level.payload.max_moves} moves
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

// ---------- Piece-picking play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Geometry Strategy Challenge" xp={xp} streak={streak} onBack={onBack} />
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

function PlayScreen({ level, xp, streak, onBack, onSubmit, submitting, feedback, onRetry }) {
  const { shape_label, target_perimeter, unit, max_moves, pieces } = level.payload;
  const [selectedIds, setSelectedIds] = useState([]);

  const pieceById = Object.fromEntries(pieces.map((p) => [p.id, p]));
  const selectedTotal = selectedIds.reduce((sum, id) => sum + pieceById[id].length, 0);
  const movesLeft = max_moves - selectedIds.length;

  const togglePiece = (id) => {
    if (feedback) return; // locked while a result is showing
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= max_moves) return prev; // budget already spent
      return [...prev, id];
    });
  };

  const pieceClass = (id) =>
    selectedIds.includes(id)
      ? "dragdrop-item dragdrop-item--selected"
      : "dragdrop-item dragdrop-item--default";

  const retryAndReset = () => {
    setSelectedIds([]);
    onRetry();
  };

  return (
    <GamePage>
      <GameTopBar label={level.title} xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <GameObjective>Pick side pieces that sum to the target perimeter in as few moves as possible.</GameObjective>

        <span className="clue-card__label">{shape_label.toUpperCase()}</span>
        <h2 className="text-lg font-bold mt-1 mb-1">
          Target perimeter: {target_perimeter} {unit}
        </h2>
        <div className="flex items-center justify-between mb-4">
          <span className="hint-text text-xs">
            Selected: {selectedTotal} {unit}
          </span>
          <span className="hint-text text-xs">Moves left: {movesLeft}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {pieces.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePiece(p.id)}
              disabled={!!feedback || (!selectedIds.includes(p.id) && movesLeft === 0)}
              className={`${pieceClass(p.id)} px-4 py-3 rounded-lg text-sm select-none`}
            >
              {p.length} {unit}
            </button>
          ))}
        </div>

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ Perfect combo!" : "Not quite — try a different combo."}
            explanation={!feedback.isCorrect ? feedback.hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "The perimeter of a shape is the sum of the lengths of all its sides."
                : null
            }
          />
        )}

        {!feedback ? (
          <GamePrimaryButton
            onClick={() => onSubmit(selectedIds)}
            disabled={selectedIds.length === 0 || submitting}
          >
            {submitting ? "Checking..." : "Submit Combo"}
          </GamePrimaryButton>
        ) : feedback.isCorrect ? (
          <GamePrimaryButton onClick={feedback.onClaim} disabled={submitting}>
            {submitting ? "Claiming..." : "Claim Reward →"}
          </GamePrimaryButton>
        ) : (
          <GamePrimaryButton onClick={retryAndReset}>Try Again</GamePrimaryButton>
        )}
      </GamePanel>
    </GamePage>
  );
}

// ---------- Result screen ----------
function ResultScreen({ level, result, xp, streak, onPlayAnother, onHome, onBackToChapter, onNextGame }) {
  return (
    <GameResults
      completeLabel="Challenge Complete"
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
      playAgainLabel="Play Another Round"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function GeometryStrategyChallengeGame() {
  const navigate = useNavigate();
  const { onBackToChapter, onNextGame } = useGameCompletionNav(GAME_TYPE);
  const goBack = useGameBackTarget();
  const [stage, setStage] = useState("loading");
  const [levels, setLevels] = useState([]);
  const [pendingLevel, setPendingLevel] = useState(null);
  const [activeLevel, setActiveLevel] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [feedback, setFeedback] = useState(null);
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
        setFeedback(null);
        setStage("play");
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setStage("error");
      });
  };

  // A wrong combo doesn't end the session — same retry-until-right
  // spirit as the other single-attempt game types — so this just
  // posts another /attempt on the still-open session.
  const submitCombo = (selectedPieceIds) => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, { selectedPieceIds })
      .then((res) => {
        setFeedback({
          isCorrect: res.data.isCorrect,
          hint: res.data.hint,
          onClaim: claim,
        });
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setStage("error");
      })
      .finally(() => setSubmitting(false));
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

  if (stage === "loading") return <GameLoadingState label="Loading Geometry Strategy Challenge..." />;
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
      <PlayScreen
        level={activeLevel}
        xp={xp}
        streak={streak}
        onBack={() => setStage("select")}
        onSubmit={submitCombo}
        submitting={submitting}
        feedback={feedback}
        onRetry={() => setFeedback(null)}
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
          setFeedback(null);
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

// GeometryStrategyChallenge is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function GeometryStrategyChallenge() {
  return (
    <GameFrame>
      <GeometryStrategyChallengeGame />
    </GameFrame>
  );
}

export default GeometryStrategyChallenge;

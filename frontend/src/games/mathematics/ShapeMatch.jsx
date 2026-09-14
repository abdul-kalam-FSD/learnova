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

const GAME_TYPE = "MATH_SHAPE_MATCH";

// ---------- Shape visual ----------
// Same mapping-equality pattern as FractionMatch, but each slot is a
// drawn shape instead of a text label — points are hand-picked per
// shape (not computed) since the shape set is small and fixed.
const SHAPE_POINTS = {
  triangle: "50,12 90,85 10,85",
  square: "18,18 82,18 82,82 18,82",
  rectangle: "10,28 90,28 90,72 10,72",
  pentagon: "50,8 92,40 76,88 24,88 8,40",
  hexagon: "28,10 72,10 94,50 72,90 28,90 6,50",
  rhombus: "50,8 88,50 50,92 12,50",
};

function ShapeIcon({ shape, size = 56 }) {
  const points = SHAPE_POINTS[shape];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="shrink-0"
      aria-label={shape}
    >
      {points ? (
        <polygon
          points={points}
          fill="color-mix(in srgb, var(--primary-color) 14%, var(--card-bg))"
          stroke="var(--primary-color)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      ) : (
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="color-mix(in srgb, var(--primary-color) 14%, var(--card-bg))"
          stroke="var(--primary-color)"
          strokeWidth="4"
        />
      )}
    </svg>
  );
}

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Shape Match" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">MATHEMATICS · GEOMETRY</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Match the Shapes</h1>
        <p className="hint-text text-sm mb-4">
          Match each shape to its correct property — extra cards in the tray
          are decoys, so double-check before you assign.
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
                  {level.payload.slots.length} shapes
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

// ---------- Shape-matching play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Shape Match" xp={xp} streak={streak} onBack={onBack} />
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

function MatchScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { scenario, slots, components, hint } = level.payload;
  const [tray, setTray] = useState(components);
  // mapping: { slotId: componentId }
  const [mapping, setMapping] = useState({});
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const componentById = (id) => components.find((c) => c.id === id);

  const pickComponent = (component) => {
    if (feedback?.isCorrect) return;
    setSelectedComponent((prev) => (prev === component.id ? null : component.id));
  };

  const assignSlot = (slotId) => {
    if (feedback?.isCorrect) return;
    if (mapping[slotId]) {
      if (!selectedComponent) {
        const freed = mapping[slotId];
        setMapping((prev) => {
          const next = { ...prev };
          delete next[slotId];
          return next;
        });
        setTray((prev) => [...prev, componentById(freed)]);
        setFeedback(null);
        return;
      }
      return;
    }
    if (!selectedComponent) return;
    setMapping((prev) => ({ ...prev, [slotId]: selectedComponent }));
    setTray((prev) => prev.filter((c) => c.id !== selectedComponent));
    setSelectedComponent(null);
    setFeedback(null);
  };

  const allSlotsFilled = slots.every((s) => mapping[s.id]);

  const checkMatches = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, { mapping })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  const slotClass = (slotId) => {
    if (feedback?.isCorrect) return "dragdrop-slot--correct";
    if (feedback && !feedback.isCorrect) return "dragdrop-slot--wrong";
    return mapping[slotId] ? "dragdrop-slot--filled" : "dragdrop-slot--empty";
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
        <GameObjective>Match each shape to its correct property or classification.</GameObjective>

        <span className="clue-card__label">CHALLENGE</span>
        <h2 className="text-lg font-bold mt-1 mb-4">{scenario}</h2>

        <p className="hint-text text-xs mb-2">
          Shapes (pick a property below, then tap a shape):
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => assignSlot(slot.id)}
              disabled={feedback?.isCorrect}
              className={`${slotClass(slot.id)} rounded-lg px-4 py-3 text-sm text-left flex items-center gap-3`}
            >
              <ShapeIcon shape={slot.shape} />
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{slot.label}</span>
                <span className="hint-text text-xs">
                  {mapping[slot.id] ? componentById(mapping[slot.id])?.label : "— not matched yet —"}
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="hint-text text-xs mb-2">Properties:</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tray.map((component) => (
            <button
              key={component.id}
              onClick={() => pickComponent(component)}
              disabled={feedback?.isCorrect}
              className={`dragdrop-item px-3 py-2 rounded-lg text-sm select-none ${
                selectedComponent === component.id
                  ? "dragdrop-item--selected"
                  : "dragdrop-item--default"
              }`}
            >
              {component.label}
            </button>
          ))}
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ All matched correctly!" : "✕ Not quite right."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "Shapes are classified by their sides, angles, and symmetry, not just their appearance."
                : null
            }
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton disabled={!allSlotsFilled || submitting} onClick={checkMatches}>
            {submitting ? "Checking..." : "Check Matches"}
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
      completeLabel="Match Complete"
      badgeText="MATCH COMPLETE"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Match More Shapes"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function ShapeMatchGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Shape Match..." />;
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
      <MatchScreen
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

// ShapeMatch is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function ShapeMatch() {
  return (
    <GameFrame>
      <ShapeMatchGame />
    </GameFrame>
  );
}

export default ShapeMatch;
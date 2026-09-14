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
import { themeFor as mergeTheme } from "../core/gameTheme";
import { GameIdentityMark } from "../core/GameShell";

const GAME_TYPE = "PHYSICS_CIRCUIT_BUILDER";
const IDENTITY = "engineering";

// This mechanic (map each "slot" to the matching "component") is reused
// across chapters that aren't literally about wiring a circuit —
// Grade 11 Electrostatics (capacitor behavior) and Grade 12 Semiconductor
// Electronics (diode bias) both run on it too. All the on-screen copy
// below used to be hardcoded to circuit-wiring language regardless of
// topic. Every GameContent.payload can now carry an optional `theme`
// object to override any of these strings; anything it doesn't set
// falls back to the original circuit-wiring copy, so existing Grade
// 4-10 circuit content renders exactly as before with zero seed changes.
const DEFAULT_THEME = {
  topBarLabel: "Circuit Builder",
  badge: "PHYSICS · ELECTRIC CIRCUITS",
  heading: "Wire the Circuit",
  intro:
    "Assign each component to its correct role in the circuit — get every connection right to complete it.",
  itemsNoun: "components to place",
  objective: "Assign each component to its correct role so the circuit completes.",
  slotsLabel: "Circuit slots (tap a component below, then tap a slot to place it):",
  componentsLabel: "Components:",
  testButtonLabel: "Test Circuit",
  testingLabel: "Testing...",
  verdictCorrect: "✓ Circuit complete!",
  verdictIncorrect: "✕ The circuit doesn't work yet.",
  whatYouLearned:
    "A complete circuit needs an unbroken path from the power source through every component and back again.",
  resultTopBarLabel: "Circuit Complete",
  resultBadge: "CIRCUIT WORKING",
  playAnotherLabel: "Wire Another Circuit",
};

// Now delegates its merge to the shared convention (Phase 1B §16,
// core/gameTheme.js) — same DEFAULT_THEME, same override behavior,
// just no longer redefining the merge itself.
const themeFor = (payload) => mergeTheme(DEFAULT_THEME, payload);

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  const theme = themeFor(levels[0]?.payload);
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label={theme.topBarLabel} xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label game-identity-badge">
          <GameIdentityMark identity={IDENTITY} />
          {theme.badge}
        </span>
        <h1 className="text-2xl font-bold mt-1 mb-3">{theme.heading}</h1>
        <p className="hint-text text-sm mb-4">{theme.intro}</p>
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
                  {level.payload.slots.length} {themeFor(level.payload).itemsNoun}
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

// ---------- Circuit-wiring play screen ----------
// ---------- Mission briefing (Phase 11) ----------
// This mechanic is theme-driven (see DEFAULT_THEME above) since the
// same slot-matching interaction is reused for Electrostatics and
// Semiconductor Electronics content too — the lobby reads its
// objective/labels from the level's own theme rather than a static
// string, so it stays correct for every topic this mechanic serves.
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  const theme = themeFor(level.payload);
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label={theme.topBarLabel} xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel={theme.badge}
        objective={theme.objective}
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

function CircuitScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { scenario, components, slots, hint } = level.payload;
  const theme = themeFor(level.payload);
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
      // Filled slot tapped without a tray selection -> unassign it.
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

  const checkCircuit = () => {
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
    <GamePage identity={IDENTITY}>
      <GameTopBar
        label={level.title}
        xp={xp}
        streak={streak}
        onBack={onBack}
        progress={totalLevels ? { current: levelIndex + 1, total: totalLevels } : undefined}
      />
      <GamePanel>
        <GameObjective>{theme.objective}</GameObjective>

        <span className="clue-card__label game-identity-badge">
          <GameIdentityMark identity={IDENTITY} />
          SCENARIO
        </span>
        <h2 className="text-lg font-bold mt-1 mb-4">{scenario}</h2>

        <p className="hint-text text-xs mb-2">{theme.slotsLabel}</p>
        <div className="flex flex-col gap-2 mb-5">
          {slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => assignSlot(slot.id)}
              disabled={feedback?.isCorrect}
              className={`${slotClass(slot.id)} rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between`}
            >
              <span>{slot.label}</span>
              <span className="font-semibold">
                {mapping[slot.id] ? componentById(mapping[slot.id])?.label : "—"}
              </span>
            </button>
          ))}
        </div>

        <p className="hint-text text-xs mb-2">{theme.componentsLabel}</p>
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
            verdict={feedback.isCorrect ? theme.verdictCorrect : theme.verdictIncorrect}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={feedback.isCorrect ? theme.whatYouLearned : null}
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton disabled={!allSlotsFilled || submitting} onClick={checkCircuit}>
            {submitting ? theme.testingLabel : theme.testButtonLabel}
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
  const theme = themeFor(level?.payload);
  return (
    <GameResults
      identity={IDENTITY}
      completeLabel={theme.resultTopBarLabel}
      badgeText={theme.resultBadge}
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel={theme.playAnotherLabel}
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function CircuitBuilderGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Circuit Builder..." />;
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
      <CircuitScreen
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

// CircuitBuilder is one of the six Phase 1B representative games (§15) —
// wrapped in GameFrame for the focused game-session mode.
function CircuitBuilder() {
  return (
    <GameFrame>
      <CircuitBuilderGame />
    </GameFrame>
  );
}

export default CircuitBuilder;
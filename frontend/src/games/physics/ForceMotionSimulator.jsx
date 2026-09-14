import { useEffect, useMemo, useState } from "react";
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

const GAME_TYPE = "PHYSICS_FORCE_SIMULATOR";

// Physics' first "parameter change -> cause and effect" mechanic
// (spec Part 7: physics should use "parameter changes, simulation,
// cause-and-effect", not just Circuit Builder/Match). The student
// first free-explores force and mass on sliders and watches a cart
// speed up or slow down — no number is shown here on purpose, so
// they build the F-up/faster, m-up/slower intuition themselves
// instead of reading it off a readout. Only in the locked "Predict"
// phase, with the actual challenge's fixed force/mass, do they type
// a numeric acceleration answer. Server-side this reuses
// MATH_NUMBER_MACHINE's plain numeric-equality check as-is (see
// checkAttempt) — the visual/interaction is what's new, not the
// scoring.

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Force & Motion Simulator" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">PHYSICS · HOW FORCES AFFECT MOTION</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Push, Pull, Predict</h1>
        <p className="hint-text text-sm mb-4">
          Explore how force and mass change a cart's acceleration, then predict
          the number for a real scenario.
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
                <span className="hint-text text-xs">{level.payload.scenario_text}</span>
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

// Qualitative-only readout on purpose — see file header. Buckets the
// force/mass ratio into a label + an animation-duration, never a
// number.
function speedLabelAndDuration(force, mass) {
  const ratio = force / mass;
  if (ratio < 1) return { label: "Barely moving", duration: 4.5 };
  if (ratio < 2.5) return { label: "Slow", duration: 3 };
  if (ratio < 5) return { label: "Medium", duration: 1.8 };
  if (ratio < 8) return { label: "Fast", duration: 1 };
  return { label: "Very fast", duration: 0.6 };
}

function CartTrack({ duration, running }) {
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden mb-1 dragdrop-item dragdrop-item--default">
      <div
        className="absolute top-1/2 -translate-y-1/2 text-3xl"
        style={{
          left: 0,
          animation: running ? `force-cart-move ${duration}s linear infinite` : "none",
        }}
      >
        🛒
      </div>
      <style>{`
        @keyframes force-cart-move {
          0% { transform: translate(0, -50%); }
          100% { transform: translate(calc(100% - 2rem), -50%); }
        }
      `}</style>
    </div>
  );
}

// ---------- Play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Force & Motion Simulator" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="PHYSICS · HOW FORCES AFFECT MOTION"
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

function SimulatorScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const {
    scenario_text,
    force_n,
    mass_kg,
    explore_min_force,
    explore_max_force,
    explore_min_mass,
    explore_max_mass,
    unit,
    hint,
  } = level.payload;

  const [phase, setPhase] = useState("explore"); // "explore" | "predict"
  const [exploreForce, setExploreForce] = useState(force_n);
  const [exploreMass, setExploreMass] = useState(mass_kg);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const exploreSpeed = useMemo(
    () => speedLabelAndDuration(exploreForce, exploreMass),
    [exploreForce, exploreMass],
  );
  const challengeSpeed = useMemo(
    () => speedLabelAndDuration(force_n, mass_kg),
    [force_n, mass_kg],
  );

  const submitAnswer = () => {
    if (answer === "" || feedback?.isCorrect) return;
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, { answer: Number(answer) })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  if (phase === "explore") {
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
          <GameObjective>
            Drag the sliders and watch the cart. Bigger push = faster. Heavier cart = slower.
          </GameObjective>

          <span className="clue-card__label">EXPLORE</span>
          <h2 className="text-lg font-bold mt-1 mb-3">Free Play — no scenario yet</h2>

          <CartTrack duration={exploreSpeed.duration} running />
          <p className="text-center font-semibold text-sm mb-4">{exploreSpeed.label}</p>

          <div className="mb-4">
            <label className="text-xs hint-text flex flex-col gap-1 mb-1">
              Force: {exploreForce} N
              <input
                type="range"
                min={explore_min_force}
                max={explore_max_force}
                value={exploreForce}
                onChange={(e) => setExploreForce(Number(e.target.value))}
                className="w-full"
                aria-valuetext={`${exploreForce} newtons`}
              />
            </label>
          </div>
          <div className="mb-6">
            <label className="text-xs hint-text flex flex-col gap-1 mb-1">
              Mass: {exploreMass} kg
              <input
                type="range"
                min={explore_min_mass}
                max={explore_max_mass}
                value={exploreMass}
                onChange={(e) => setExploreMass(Number(e.target.value))}
                className="w-full"
                aria-valuetext={`${exploreMass} kilograms`}
              />
            </label>
          </div>

          <GamePrimaryButton onClick={() => setPhase("predict")}>
            Try the Real Scenario →
          </GamePrimaryButton>
        </GamePanel>
      </GamePage>
    );
  }

  return (
    <GamePage>
      <GameTopBar
        label={level.title}
        xp={xp}
        streak={streak}
        onBack={() => setPhase("explore")}
        progress={totalLevels ? { current: levelIndex + 1, total: totalLevels } : undefined}
      />
      <GamePanel>
        <GameObjective>Use what you just saw to predict this cart's acceleration.</GameObjective>

        <span className="clue-card__label">PREDICT</span>
        <h2 className="text-base font-semibold mt-1 mb-3">{scenario_text}</h2>

        <CartTrack duration={challengeSpeed.duration} running={!feedback?.isCorrect} />

        <div className="flex justify-center gap-4 my-4 text-sm">
          <span className="practice-pill px-3 py-1 rounded">Force: {force_n} N</span>
          <span className="practice-pill px-3 py-1 rounded">Mass: {mass_kg} kg</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <input
            type="number"
            inputMode="decimal"
            value={answer}
            disabled={feedback?.isCorrect}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="?"
            aria-label={`Your predicted answer, in ${unit}`}
            className="dragdrop-item dragdrop-item--default w-24 h-14 rounded-lg text-2xl font-bold text-center"
          />
          <span className="hint-text text-sm">{unit}</span>
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ Correct — the cart matches your prediction!" : "✕ Not quite yet."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "Newton's Second Law: acceleration = Force ÷ Mass. More force speeds it up, more mass slows it down."
                : null
            }
          />
        )}

        {feedback?.isCorrect ? (
          <GamePrimaryButton onClick={onSolved}>Claim Reward →</GamePrimaryButton>
        ) : (
          <GamePrimaryButton disabled={submitting || answer === ""} onClick={submitAnswer}>
            {submitting ? "Checking..." : "Submit Prediction"}
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
      completeLabel="Scenario Solved"
      badgeText="FORCE SIMULATOR COMPLETE"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Try Another Scenario"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function ForceMotionSimulatorGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Force Simulator..." />;
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
      <SimulatorScreen
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

// ForceMotionSimulator is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function ForceMotionSimulator() {
  return (
    <GameFrame>
      <ForceMotionSimulatorGame />
    </GameFrame>
  );
}

export default ForceMotionSimulator;
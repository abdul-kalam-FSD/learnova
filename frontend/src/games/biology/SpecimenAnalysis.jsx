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

const GAME_TYPE = "BIO_SPECIMEN_ANALYSIS";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Specimen Analysis" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">BIOLOGY · CLASSIFICATION</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Classify the Specimen</h1>
        <p className="hint-text text-sm mb-4">
          Inspect every observable feature, then classify the specimen based
          on what you found — some details won't matter to the classification.
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
                  {level.payload.features?.length || 0} features to inspect
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

// ---------- Inspect -> observe -> identify -> classify -> explain screen ----------
// Distinct from Diagnosis's loop on purpose: Diagnosis inspects, then
// picks an unordered *subset* of cards as supporting evidence.
// Specimen Analysis instead requires inspecting every feature first
// (observe the whole specimen before drawing a conclusion, not just
// the ones that happen to look relevant), and the scored action is a
// single classification choice, not a card subset — scored server-side
// via the same single-choice check as Virtual Lab/Debugging Lab/Civic
// Decision (attempt.selectedHotspotId vs payload.correct_hotspot_id —
// see gameControllers.js checkAttempt). Only the game_type needed
// adding to that check's list. The classification options themselves
// are never secret (the student needs to see the candidates to reason
// about them); only the correct id and the reasoning explanation are
// withheld until a correct attempt.
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Specimen Analysis" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="BIOLOGY · CLASSIFICATION"
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

function SpecimenAnalysisScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { specimenName, context, features, classificationOptions, hint } = level.payload;
  const [inspected, setInspected] = useState({});
  const [choice, setChoice] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isInspected = (id) => Boolean(inspected[id]);
  const allInspected = features.every((f) => isInspected(f.id));

  const inspectFeature = (id) => {
    if (feedback?.isCorrect) return;
    setInspected((prev) => ({ ...prev, [id]: true }));
  };

  const pickClassification = (id) => {
    if (feedback?.isCorrect || !allInspected) return;
    setChoice(id);
    setFeedback(null);
  };

  const submitClassification = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, { selectedHotspotId: choice })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  const optionClass = (id) => {
    if (feedback?.isCorrect && choice === id) return "dragdrop-item--correct";
    if (feedback && !feedback.isCorrect && choice === id) return "dragdrop-item--wrong";
    if (choice === id) return "dragdrop-item--selected";
    return "dragdrop-item--default";
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
        <GameObjective>Inspect every feature, then classify the specimen based on what you observe.</GameObjective>

        <span className="clue-card__label">SPECIMEN FILE</span>
        <h2 className="text-lg font-bold mt-1 mb-1">{specimenName}</h2>
        <p className="hint-text text-sm mb-4">{context}</p>

        <p className="hint-text text-xs mb-2">
          Tap each feature to observe it. Every feature must be inspected
          before you can classify the specimen:
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => inspectFeature(feature.id)}
              disabled={feedback?.isCorrect}
              className="clue-card dragdrop-item--default rounded-lg px-4 py-3 text-sm text-left flex flex-col gap-1"
            >
              <span className="font-semibold">{feature.label}</span>
              {isInspected(feature.id) ? (
                <span className="hint-text text-xs">{feature.detail}</span>
              ) : (
                <span className="hint-text text-xs">Tap to observe</span>
              )}
            </button>
          ))}
        </div>

        <p className="hint-text text-xs mb-2">
          {allInspected
            ? "Now identify what this specimen is:"
            : "Inspect every feature above to unlock classification."}
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {classificationOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => pickClassification(option.id)}
              disabled={feedback?.isCorrect || !allInspected}
              className={`clue-card ${optionClass(option.id)} rounded-lg px-4 py-3 text-sm text-left`}
            >
              <span className="font-semibold">{option.label}</span>
            </button>
          ))}
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ Classification confirmed!" : "✕ Not quite right."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? feedback.explanation ||
                  "Classification relies on matching every observed feature to a consistent set of criteria, not just one standout trait."
                : null
            }
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton disabled={!choice || submitting} onClick={submitClassification}>
            {submitting ? "Analyzing..." : "Submit Classification"}
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
      completeLabel="Specimen Filed"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Analyze Another Specimen"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function SpecimenAnalysisGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Specimen Analysis..." />;
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
      <SpecimenAnalysisScreen
        level={activeLevel}
        sessionId={sessionId}
        xp={xp}
        streak={streak}
        onBack={() => setStage("select")}
        onSolved={solved}
        levelIndex={levels.findIndex((l) => l.id === activeLevel?.id)}
        totalLevels={levels.length}
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

// SpecimenAnalysis is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function SpecimenAnalysis() {
  return (
    <GameFrame>
      <SpecimenAnalysisGame />
    </GameFrame>
  );
}

export default SpecimenAnalysis;

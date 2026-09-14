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

const GAME_TYPE = "BIO_DIAGNOSIS";
const IDENTITY = "investigation";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label="Diagnosis" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label game-identity-badge">
          <GameIdentityMark identity={IDENTITY} />
          BIOLOGY · HUMAN HEALTH
        </span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Diagnose the Patient</h1>
        <p className="hint-text text-sm mb-4">
          Inspect every piece of evidence, then select only the clues that
          actually support your diagnosis — some symptoms are red herrings.
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
                  {level.payload.evidence?.length || 0} pieces of evidence
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

// ---------- Inspect -> reason -> diagnose screen ----------
// Interaction is deliberately two taps deep, not one: the first tap
// on an evidence card only inspects it (reveals its detail text) —
// it can't be selected as supporting evidence yet. A second tap on an
// already-inspected card toggles it in/out of the student's chosen
// evidence set. This is what keeps the loop "Inspect -> Identify
// clues -> Reason -> Diagnosis" rather than collapsing into a single
// tap-and-submit MCQ.
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage identity={IDENTITY}>
      <GameTopBar label="Diagnosis" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="BIOLOGY · HUMAN HEALTH"
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

function DiagnosisScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { scenario, evidence, hint } = level.payload;
  const [inspected, setInspected] = useState({});
  const [selected, setSelected] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isInspected = (id) => Boolean(inspected[id]);
  const isSelected = (id) => selected.includes(id);

  const tapCard = (id) => {
    if (feedback?.isCorrect) return;
    if (!isInspected(id)) {
      setInspected((prev) => ({ ...prev, [id]: true }));
      return;
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setFeedback(null);
  };

  const submitDiagnosis = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, { selectedPieceIds: selected })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  const cardClass = (id) => {
    if (feedback?.isCorrect && isSelected(id)) return "dragdrop-item--correct";
    if (feedback && !feedback.isCorrect && isSelected(id)) return "dragdrop-item--wrong";
    if (isSelected(id)) return "dragdrop-item--selected";
    return "dragdrop-item--default";
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
        <GameObjective>
          Inspect the evidence, then select only the clues that support the correct diagnosis.
        </GameObjective>

        <span className="clue-card__label game-identity-badge">
          <GameIdentityMark identity={IDENTITY} />
          CASE FILE
        </span>
        <h2 className="text-lg font-bold mt-1 mb-4">{scenario}</h2>

        <p className="hint-text text-xs mb-2">
          Tap a card to inspect it, then tap again to mark it as supporting
          evidence for your diagnosis:
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {evidence.map((card) => (
            <button
              key={card.id}
              onClick={() => tapCard(card.id)}
              disabled={feedback?.isCorrect}
              className={`clue-card ${cardClass(card.id)} rounded-lg px-4 py-3 text-sm text-left flex flex-col gap-1`}
            >
              <span className="font-semibold">{card.label}</span>
              {isInspected(card.id) ? (
                <span className="hint-text text-xs">{card.detail}</span>
              ) : (
                <span className="hint-text text-xs">Tap to inspect</span>
              )}
            </button>
          ))}
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ Diagnosis confirmed!" : "✕ Not quite right."}
            explanation={
              feedback.isCorrect
                ? feedback.diagnosis && `Diagnosis: ${feedback.diagnosis}`
                : feedback.hint || hint
            }
            whatYouLearned={feedback.isCorrect ? feedback.explanation : null}
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton disabled={selected.length === 0 || submitting} onClick={submitDiagnosis}>
            {submitting ? "Reviewing..." : "Submit Diagnosis"}
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
      identity={IDENTITY}
      completeLabel="Case Closed"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Diagnose Another Patient"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function DiagnosisGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Diagnosis..." />;
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
      <DiagnosisScreen
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

// Diagnosis is one of the six Phase 1B representative games (§15) —
// wrapped in GameFrame for the focused game-session mode.
function Diagnosis() {
  return (
    <GameFrame>
      <DiagnosisGame />
    </GameFrame>
  );
}

export default Diagnosis;
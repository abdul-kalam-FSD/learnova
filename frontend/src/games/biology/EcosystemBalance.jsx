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

const GAME_TYPE = "BIO_ECOSYSTEM_BALANCE";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Ecosystem Balance" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">BIOLOGY · FOOD CHAINS &amp; WEBS</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Trace the Chain Reaction</h1>
        <p className="hint-text text-sm mb-4">
          One change ripples through the whole ecosystem — arrange the
          effects in the order they actually happen.
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
                  {level.payload.scrambled_effects.length}-step chain
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

// ---------- Chain-sequencing play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Ecosystem Balance" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="BIOLOGY · FOOD CHAINS & WEBS"
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

function ChainScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { trigger, scrambled_effects, hint } = level.payload;
  const [tray, setTray] = useState(scrambled_effects);
  const [placed, setPlaced] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const totalSlots = scrambled_effects.length;

  const placeEffect = (effect) => {
    if (feedback?.isCorrect) return;
    setTray((prev) => prev.filter((e) => e.id !== effect.id));
    setPlaced((prev) => [...prev, effect]);
    setFeedback(null);
  };

  // Same undo-to-here approach as Equation Builder — click a step in
  // the chain to remove it and every step after it, back to the tray.
  const undoFrom = (index) => {
    if (feedback?.isCorrect) return;
    const removed = placed.slice(index);
    setPlaced((prev) => prev.slice(0, index));
    setTray((prev) => [...prev, ...removed]);
    setFeedback(null);
  };

  const checkChain = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, {
        orderedPieceIds: placed.map((e) => e.id),
      })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  const stepClass = (i) => {
    if (feedback?.isCorrect) return "dragdrop-slot--correct";
    if (feedback && !feedback.isCorrect) return "dragdrop-slot--wrong";
    return i < placed.length ? "dragdrop-slot--filled" : "dragdrop-slot--empty";
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
        <GameObjective>Arrange the ecosystem effects in the order they actually ripple through the chain.</GameObjective>

        <span className="clue-card__label">TRIGGER</span>
        <h2 className="text-lg font-bold mt-1 mb-4">{trigger}</h2>

        <p className="hint-text text-xs mb-2">
          Chain reaction so far (tap a step to undo back to it):
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {Array.from({ length: totalSlots }).map((_, i) => (
            <button
              key={i}
              onClick={() => i < placed.length && undoFrom(i)}
              disabled={i >= placed.length || feedback?.isCorrect}
              className={`${stepClass(i)} rounded-lg px-4 py-3 text-sm text-left`}
            >
              {i + 1}. {placed[i]?.label ?? "—"}
            </button>
          ))}
        </div>

        <p className="hint-text text-xs mb-2">Tap effects to add them in order:</p>
        <div className="flex flex-col gap-2 mb-4">
          {tray.map((effect) => (
            <button
              key={effect.id}
              onClick={() => placeEffect(effect)}
              disabled={feedback?.isCorrect}
              className="dragdrop-item dragdrop-item--default px-4 py-3 rounded-lg text-sm text-left select-none"
            >
              {effect.label}
            </button>
          ))}
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ Ecosystem traced correctly!" : "✕ That's not how it unfolds."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "A single change to one population ripples through the food web, affecting predators, prey, and competitors in a predictable sequence."
                : null
            }
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton
            disabled={placed.length !== totalSlots || submitting}
            onClick={checkChain}
          >
            {submitting ? "Checking..." : "Check Chain"}
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
      completeLabel="Balance Restored"
      badgeText="CHAIN TRACED"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Trace Another Chain"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function EcosystemBalanceGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Ecosystem Balance..." />;
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
      <ChainScreen
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

// EcosystemBalance is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function EcosystemBalance() {
  return (
    <GameFrame>
      <EcosystemBalanceGame />
    </GameFrame>
  );
}

export default EcosystemBalance;

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

// Tamil's second mechanic alongside TAMIL_PROVERB_MATCH (which
// matches a proverb to its meaning). This builds a whole, correctly
// ordered Tamil sentence from scrambled words — same order-sensitive
// family as CS_CODE_ORDER_BUILDER / ENGLISH_SENTENCE_BUILDER / MATH_
// EQUATION_BUILDER (see gameControllers.js's shared orderedPieceIds
// === correct_order check), reusing that generic backend logic — no
// new backend scoring code needed. UI chrome follows the Tamil-first
// convention already used by ProverbMatch.jsx.
const GAME_TYPE = "TAMIL_SENTENCE_BUILDER";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Sentence Builder" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">தமிழ் · வாக்கிய அமைப்பு</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">வாக்கியம் அமைக்க</h1>
        <p className="hint-text text-sm mb-4">
          கலைந்திருக்கும் சொற்களை சரியான வரிசையில் அடுக்கி, சரியான வாக்கியமாக அமைக்கவும்.
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
                  {level.payload.scrambled_words.length} சொற்கள் கொண்ட வாக்கியம்
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

// ---------- Sequencing play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Sentence Builder" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="தமிழ் · வாக்கிய அமைப்பு"
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

function SentenceBuilderScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { scenario_label, scrambled_words, hint } = level.payload;
  const [tray, setTray] = useState(scrambled_words);
  const [placed, setPlaced] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const totalSlots = scrambled_words.length;

  const placeWord = (word) => {
    if (feedback?.isCorrect) return;
    setTray((prev) => prev.filter((w) => w.id !== word.id));
    setPlaced((prev) => [...prev, word]);
    setFeedback(null);
  };

  // Tap a word already placed to undo back to it (same pattern as
  // English Sentence Builder / Code Order Builder / Route Builder).
  const undoFrom = (index) => {
    if (feedback?.isCorrect) return;
    const removed = placed.slice(index);
    setPlaced((prev) => prev.slice(0, index));
    setTray((prev) => [...prev, ...removed]);
    setFeedback(null);
  };

  const checkOrder = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, {
        orderedPieceIds: placed.map((w) => w.id),
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
        <GameObjective>சொற்களை சரியான வாக்கிய வரிசையில் அடுக்கவும்.</GameObjective>

        <span className="clue-card__label">பயிற்சி</span>
        <h2 className="text-lg font-bold mt-1 mb-4">{scenario_label}</h2>

        <p className="hint-text text-xs mb-2">
          இதுவரை அமைந்த வாக்கியம் (திரும்பப் பெற ஒரு சொல்லைத் தொடவும்):
        </p>
        <div className="flex flex-wrap gap-2 mb-5 min-h-[3rem] items-center">
          {placed.length === 0 && <span className="hint-text text-sm">— கீழே உள்ள சொற்களைத் தொட்டு தொடங்கவும் —</span>}
          {placed.map((word, i) => (
            <button
              key={word.id}
              onClick={() => undoFrom(i)}
              disabled={feedback?.isCorrect}
              className={`${
                feedback?.isCorrect
                  ? "dragdrop-slot--correct"
                  : feedback && !feedback.isCorrect
                    ? "dragdrop-slot--wrong"
                    : "dragdrop-slot--filled"
              } rounded-lg px-3 py-2 text-sm`}
            >
              {word.label}
            </button>
          ))}
        </div>

        <p className="hint-text text-xs mb-2">சொற்களை வரிசையாகச் சேர்க்கத் தொடவும்:</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tray.map((word) => (
            <button
              key={word.id}
              onClick={() => placeWord(word)}
              disabled={feedback?.isCorrect}
              className="dragdrop-item dragdrop-item--default px-3 py-2 rounded-lg text-sm select-none"
            >
              {word.label}
            </button>
          ))}
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ வாக்கியம் சரியாக அமைந்தது!" : "✕ வரிசை சரியில்லை."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "தமிழில் சொல் வரிசை பொருளை உருவாக்குகிறது — எழுவாய், செயப்படுபொருள், பயனிலை என்ற வரிசை மாறினால் வாக்கியம் தவறாகிவிடும்."
                : null
            }
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton
            disabled={placed.length !== totalSlots || submitting}
            onClick={checkOrder}
          >
            {submitting ? "சரிபார்க்கிறது..." : "வாக்கியத்தை சரிபார்"}
          </GamePrimaryButton>
        ) : (
          <GamePrimaryButton onClick={onSolved}>வெகுமதி பெறு →</GamePrimaryButton>
        )}
      </GamePanel>
    </GamePage>
  );
}

// ---------- Result screen ----------
function ResultScreen({ level, result, xp, streak, onPlayAnother, onHome, onBackToChapter, onNextGame }) {
  return (
    <GameResults
      completeLabel="Complete"
      badgeText="வாக்கியம் அமைந்தது"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="இன்னொரு வாக்கியம் அமைக்க"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function SentenceBuilderGame() {
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

  if (stage === "loading") return <GameLoadingState label="வாக்கிய அமைப்பு ஏற்றப்படுகிறது..." />;
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
      <SentenceBuilderScreen
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

// SentenceBuilder is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function SentenceBuilder() {
  return (
    <GameFrame>
      <SentenceBuilderGame />
    </GameFrame>
  );
}

export default SentenceBuilder;
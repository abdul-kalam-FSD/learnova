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

const GAME_TYPE = "CHEMISTRY_EQUATION_BALANCER";

function formulaWithSubscripts(formula) {
  // "H2O" -> "H₂O" for display. Numbers after a letter become subscripts.
  const subMap = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
  return formula.replace(/\d/g, (d) => subMap[d]);
}

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Equation Balancer" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">CHEMISTRY · CHEMICAL EQUATIONS</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Balance the Reaction</h1>
        <p className="hint-text text-sm mb-4">
          Adjust the coefficients until the atoms on both sides match exactly.
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
                  {level.payload.species.length} species to balance
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

// ---------- Coefficient-adjusting play screen ----------
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Equation Balancer" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="CHEMISTRY · CHEMICAL EQUATIONS"
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

function BalanceScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { species, max_coefficient, hint } = level.payload;
  const [coefficients, setCoefficients] = useState(
    Object.fromEntries(species.map((s) => [s.id, 1])),
  );
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const adjust = (id, delta) => {
    if (feedback?.isCorrect) return;
    setCoefficients((prev) => {
      const next = Math.min(max_coefficient, Math.max(1, prev[id] + delta));
      return { ...prev, [id]: next };
    });
    setFeedback(null);
  };

  const checkBalance = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, { coefficients })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  const reactants = species.filter((s) => s.side === "reactant");
  const products = species.filter((s) => s.side === "product");

  const speciesChip = (s) => (
    <div
      key={s.id}
      className={`clue-card rounded-lg px-3 py-2 flex items-center gap-3 ${
        feedback?.isCorrect ? "dragdrop-item--correct" : ""
      }`}
    >
      <button
        onClick={() => adjust(s.id, -1)}
        disabled={coefficients[s.id] <= 1 || feedback?.isCorrect}
        className="btn-secondary rounded-full w-7 h-7 text-sm font-bold"
      >
        −
      </button>
      <span className="text-sm font-mono min-w-[70px] text-center">
        {coefficients[s.id]} {formulaWithSubscripts(s.formula)}
      </span>
      <button
        onClick={() => adjust(s.id, 1)}
        disabled={coefficients[s.id] >= max_coefficient || feedback?.isCorrect}
        className="btn-secondary rounded-full w-7 h-7 text-sm font-bold"
      >
        +
      </button>
    </div>
  );

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
        <GameObjective>Adjust the coefficients until the number of atoms on both sides matches exactly.</GameObjective>

        <span className="clue-card__label">REACTION</span>
        <p className="hint-text text-xs mt-1 mb-4">
          Tap − / + to change each coefficient, then check your balance.
        </p>

        <div className="flex flex-col gap-2 mb-2">{reactants.map(speciesChip)}</div>
        <div className="text-center hint-text text-sm my-2">↓</div>
        <div className="flex flex-col gap-2 mb-4">{products.map(speciesChip)}</div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ Balanced!" : "✕ Not balanced yet."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? "The law of conservation of mass means the same number of each atom must appear on both sides of a balanced equation."
                : null
            }
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton disabled={submitting} onClick={checkBalance}>
            {submitting ? "Checking..." : "Check Balance"}
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
      completeLabel="Reaction Balanced"
      badgeText="EQUATION BALANCED"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Balance Another Reaction"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function EquationBalancerGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Equation Balancer..." />;
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
      <BalanceScreen
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

// EquationBalancer is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function EquationBalancer() {
  return (
    <GameFrame>
      <EquationBalancerGame />
    </GameFrame>
  );
}

export default EquationBalancer;

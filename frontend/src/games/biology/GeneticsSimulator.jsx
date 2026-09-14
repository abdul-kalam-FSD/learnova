import { Fragment, useEffect, useState } from "react";
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

const GAME_TYPE = "BIO_GENETICS_SIMULATOR";

// ---------- Level select ----------
function LevelSelectScreen({ levels, xp, streak, onBack, onPick }) {
  return (
    <GamePage>
      <GameTopBar label="Genetics Simulator" xp={xp} streak={streak} onBack={onBack} />
      <GamePanel>
        <span className="clue-card__label">BIOLOGY · GENETICS</span>
        <h1 className="text-2xl font-bold mt-1 mb-3">Run the Cross</h1>
        <p className="hint-text text-sm mb-4">
          Fill in each box of the Punnett square with the genotype it
          produces, then check your cross to see the offspring ratio.
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
                  {level.payload.cells?.length || 0}-box Punnett square
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

// ---------- Punnett-square play screen ----------
// Genuinely distinct from Circuit Builder's tap-tile-then-tap-slot flow
// in one important way: a genotype combination (e.g. "Tt") can be the
// correct outcome for more than one box in the same cross, so the
// genotype options here are reusable stamps, not a tray of one-use
// tile instances. That sidesteps the historical bug this component
// was rebuilt to fix — duplicate-labeled tile *instances* colliding in
// DOM queries — by construction: there's only ever one "Tt" stamp
// button, not two indistinguishable ones. Both the stamps and the
// grid cells carry stable data-testids (not just visible text) for
// the same reason in the other direction: once a cell is filled, its
// text matches its stamp's text exactly, so a query keyed on visible
// text alone (e.g. "the button labeled Tt") would ambiguously match
// both the stamp and every cell currently showing "Tt".
// ---------- Mission briefing (Phase 11) ----------
function LobbyScreen({ level, levelIndex, totalLevels, xp, streak, xpInfo, onBack, onStart }) {
  return (
    <GamePage>
      <GameTopBar label="Genetics Simulator" xp={xp} streak={streak} onBack={onBack} />
      <GameLobby
        title={level.title}
        subjectLabel="BIOLOGY · GENETICS"
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

function CrossScreen({ level, sessionId, xp, streak, onBack, onSolved, levelIndex, totalLevels }) {
  const { scenario, trait, parent1Label, parent2Label, colAlleles, rowAlleles, cells, genotypeOptions, hint } =
    level.payload;
  const [mapping, setMapping] = useState({});
  const [selectedGenotype, setSelectedGenotype] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const cellAt = (row, col) => cells.find((c) => c.row === row && c.col === col);

  const pickGenotype = (genotype) => {
    if (feedback?.isCorrect) return;
    setSelectedGenotype((prev) => (prev === genotype ? null : genotype));
  };

  const assignCell = (cellId) => {
    if (feedback?.isCorrect) return;
    if (!selectedGenotype) {
      // Tapping an already-filled box with no stamp selected clears it,
      // matching Circuit Builder's "tap to unassign" affordance —
      // genotypes are reusable stamps, so there's nothing to return to
      // a tray, just the mapping entry to remove.
      if (mapping[cellId]) {
        setMapping((prev) => {
          const next = { ...prev };
          delete next[cellId];
          return next;
        });
        setFeedback(null);
      }
      return;
    }
    setMapping((prev) => ({ ...prev, [cellId]: selectedGenotype }));
    setSelectedGenotype(null);
    setFeedback(null);
  };

  const allCellsFilled = cells.every((c) => mapping[c.id]);

  const runCross = () => {
    setSubmitting(true);
    api
      .post(`/games/${sessionId}/attempt`, { mapping })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({ isCorrect: false, hint: err.response?.data?.message || err.message }),
      )
      .finally(() => setSubmitting(false));
  };

  const cellClass = (cellId) => {
    if (feedback?.isCorrect) return "dragdrop-slot--correct";
    if (feedback && !feedback.isCorrect) return "dragdrop-slot--wrong";
    return mapping[cellId] ? "dragdrop-slot--filled" : "dragdrop-slot--empty";
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
        <GameObjective>Fill in the Punnett square to predict the genotype of each offspring.</GameObjective>

        <span className="clue-card__label">CROSS</span>
        <h2 className="text-lg font-bold mt-1 mb-1">{scenario}</h2>
        <p className="hint-text text-sm mb-4">{trait}</p>

        <div className="flex justify-between text-xs font-semibold mb-2">
          <span>{parent1Label}</span>
          <span>{parent2Label}</span>
        </div>

        <div className="mb-5" style={{ display: "grid", gridTemplateColumns: "auto repeat(2, 1fr)", gap: "0.5rem" }}>
          <div />
          {colAlleles.map((allele, col) => (
            <div key={`col-${col}`} className="text-center font-bold text-sm">
              {allele}
            </div>
          ))}
          {rowAlleles.map((rowAllele, row) => (
            <Fragment key={`row-${row}`}>
              <div className="flex items-center font-bold text-sm">{rowAllele}</div>
              {colAlleles.map((_, col) => {
                const cell = cellAt(row, col);
                return (
                  <button
                    key={cell.id}
                    data-testid={`cell-${cell.id}`}
                    onClick={() => assignCell(cell.id)}
                    disabled={feedback?.isCorrect}
                    className={`${cellClass(cell.id)} rounded-lg py-4 text-center text-sm font-semibold`}
                  >
                    {mapping[cell.id] || "—"}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>

        <p className="hint-text text-xs mb-2">
          Tap a genotype below, then tap a box to fill it in (tap a filled box with nothing selected to clear it):
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {genotypeOptions.map((genotype) => (
            <button
              key={genotype}
              data-testid={`genotype-${genotype}`}
              onClick={() => pickGenotype(genotype)}
              disabled={feedback?.isCorrect}
              className={`dragdrop-item px-4 py-2 rounded-lg text-sm font-semibold select-none ${
                selectedGenotype === genotype ? "dragdrop-item--selected" : "dragdrop-item--default"
              }`}
            >
              {genotype}
            </button>
          ))}
        </div>

        {!feedback?.isCorrect && <GameHint text={hint} />}

        {feedback && (
          <GameFeedback
            isCorrect={feedback.isCorrect}
            verdict={feedback.isCorrect ? "✓ Cross complete!" : "✕ That's not quite the right cross."}
            explanation={!feedback.isCorrect ? feedback.hint || hint : null}
            whatYouLearned={
              feedback.isCorrect
                ? feedback.explanation ||
                  "Each box in a Punnett square combines one allele from each parent to predict offspring genotypes."
                : null
            }
          />
        )}

        {!feedback?.isCorrect ? (
          <GamePrimaryButton disabled={!allCellsFilled || submitting} onClick={runCross}>
            {submitting ? "Crossing..." : "Run Cross"}
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
      completeLabel="Cross Complete"
      title={level.title}
      masteryUpdate={result?.masteryUpdate}
      xpAwarded={result?.xpAwarded ?? 0}
      xpCapped={result?.xpCapped ?? false}
      streak={result?.newStreak ?? streak}
      skillsPracticed={GAME_TYPE_TO_SKILLS[GAME_TYPE]}
      onPlayAgain={onPlayAnother}
      onBackToChapter={onBackToChapter}
      onNextGame={onNextGame}
      playAgainLabel="Run Another Cross"
      onDashboard={onHome}
      dashboardLabel="Back to Home"
      xp={xp}
    />
  );
}

function GeneticsSimulatorGame() {
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

  if (stage === "loading") return <GameLoadingState label="Loading Genetics Simulator..." />;
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
      <CrossScreen
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

// GeneticsSimulator is migrated to the focused game-session mode (Phase 5C-A)
// -- wrapped in GameFrame so it renders like the six Phase 1B/1C
// representative games already did (see GameFrame.jsx).
function GeneticsSimulator() {
  return (
    <GameFrame>
      <GeneticsSimulatorGame />
    </GameFrame>
  );
}

export default GeneticsSimulator;
// This file is the original "Practice" tab component, relocated (not
// deleted) when the bottom-nav "Practice" tab was repurposed to surface
// an adaptive recommended-game screen instead. The Case-solving flow
// itself (clues, drag/drop, matching, theory, board, XP/streak wiring)
// is unchanged — only its route moved, from /practice to /practice/case
// — so the single seeded demo case (see backend/seedDemoCase.js) and
// admin's Case CRUD (AdminCases.jsx / AdminCaseEditor.jsx) still work,
// they just aren't the primary student nav destination anymore.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { shuffle } from "../utils/shuffle";
import "../Practice.css";
import PageLoading from "../components/PageLoading";

// Builds the investigation step sequence based on however many clues the
// backend actually returned for this case (case.clue_count can vary),
// instead of assuming a fixed 3 clues. dragdrop is inserted after the
// first clue, matching after the second — both tasks are always present
// somewhere in the sequence even if a case has only 1 clue.
function buildStepOrder(clueCount) {
  const order = [];
  for (let i = 0; i < clueCount; i++) {
    order.push(`clue-${i}`);
    if (i === 0) order.push("dragdrop");
    if (i === 1) order.push("matching");
  }
  if (!order.includes("dragdrop")) order.splice(1, 0, "dragdrop");
  if (!order.includes("matching")) order.push("matching");
  return order;
}

// ---------- Small building blocks ----------
function TopBar({ label, xp, streak, onBack }) {
  return (
    <div className="practice-topbar flex items-center justify-between px-4 py-3 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="practice-topbar__back text-lg leading-none"
            aria-label="Back"
          >
            ←
          </button>
        )}
        <span className="practice-topbar__label">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="practice-pill px-2 py-1 rounded text-[11px]">
          STREAK {streak}
        </div>
        <div className="practice-pill practice-pill--xp px-2 py-1 rounded text-[11px]">
          {xp} XP
        </div>
      </div>
    </div>
  );
}

function Panel({ children }) {
  return <div className="practice-panel p-5 flex-1">{children}</div>;
}

function ClueCard({ text }) {
  return (
    <div className="clue-card rounded-lg p-4 mb-4">
      <span className="clue-card__label">CONTEXT</span>
      <p className="mt-1 text-sm">{text}</p>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  secondary,
  investigation,
}) {
  const variant = investigation
    ? disabled
      ? "btn-investigation-disabled"
      : "btn-investigation"
    : secondary
      ? "btn-secondary"
      : disabled
        ? "btn-primary-disabled"
        : "btn-primary";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variant} w-full py-3 rounded-lg font-semibold text-sm`}
    >
      {children}
    </button>
  );
}

// ---------- Clue (MCQ) screen ----------
function ClueScreen({
  label,
  question,
  xp,
  streak,
  sessionId,
  onBack,
  onAnswered,
}) {
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const pick = (opt) => {
    if (feedback) return;
    setSelected(opt.id);
  };

  const check = () => {
    if (!selected) return;
    api
      .post(`/quiz/${sessionId}/answer`, {
        questionId: question.id,
        selectedOptionId: selected,
      })
      .then((res) => setFeedback(res.data))
      .catch((err) =>
        setFeedback({
          isCorrect: false,
          explanation: err.response?.data?.message || err.message,
        }),
      );
  };

  return (
    <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
      <TopBar label={label} xp={xp} streak={streak} onBack={onBack} />
      <Panel>
        <h2 className="text-lg font-bold mb-4">{question.question_text}</h2>
        <div className="flex flex-col gap-2 mb-4">
          {question.options.map((opt) => {
            const isPicked = selected === opt.id;
            const isCorrectOption =
              feedback && opt.id === feedback.correctOptionId;
            const isWrongPick =
              feedback && isPicked && !feedback.isCorrect;

            let optionModifier = "";
            let icon = null;
            if (feedback) {
              if (isCorrectOption) {
                optionModifier = " option--correct";
                icon = "✓";
              } else if (isWrongPick) {
                optionModifier = " option--incorrect";
                icon = "✕";
              }
            } else if (isPicked) {
              optionModifier = " option--picked";
            }

            return (
              <button
                key={opt.id}
                onClick={() => pick(opt)}
                className={`option${optionModifier} flex items-center justify-between text-left px-4 py-3 rounded-lg text-sm`}
              >
                <span>{opt.text}</span>
                {icon && <span className="option__icon">{icon}</span>}
              </button>
            );
          })}
        </div>
        {feedback && (
          <div
            className={`feedback-card ${feedback.isCorrect ? "feedback-card--correct" : "feedback-card--incorrect"} mb-4`}
          >
            <p className="feedback-card__verdict">
              {feedback.isCorrect ? "✓ Correct!" : "✕ Not quite!"}
            </p>
            {feedback.explanation && (
              <p className="feedback-card__explanation">
                {feedback.explanation}
              </p>
            )}
            {feedback.funFact && (
              <div className="fun-fact">
                <span className="fun-fact__label">💡 FUN FACT</span>
                <p className="fun-fact__text">{feedback.funFact}</p>
              </div>
            )}
          </div>
        )}
        {!feedback ? (
          <PrimaryButton disabled={!selected} onClick={check}>
            Check
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => onAnswered(feedback)}>
            Continue →
          </PrimaryButton>
        )}
      </Panel>
    </div>
  );
}

// ---------- Drag & Drop task ----------
function DragDropScreen({ task, xp, streak, onBack, onComplete }) {
  const items = task.items;
  const [pool, setPool] = useState(() => shuffle(items));
  const [slots, setSlots] = useState(Array(items.length).fill(null));
  const [selectedItem, setSelectedItem] = useState(null);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const pickFromPool = (item) => {
    if (checked) return;
    setSelectedItem(item);
  };

  // itemOverride lets a real drag-and-drop drop event place an item
  // directly, without needing the two-tap select-then-place flow.
  const placeInSlot = (i, itemOverride) => {
    const item = itemOverride ?? selectedItem;
    if (checked || !item || slots[i]) return;
    const next = [...slots];
    next[i] = item;
    setSlots(next);
    setPool(pool.filter((p) => p !== item));
    setSelectedItem(null);
  };

  const clearSlot = (i) => {
    if (checked || !slots[i]) return;
    const item = slots[i];
    const next = [...slots];
    next[i] = null;
    setSlots(next);
    setPool([...pool, item]);
  };

  const check = () => {
    const ok = slots.every((v, i) => v === items[i]);
    setCorrect(ok);
    setChecked(true);
  };

  const allFilled = slots.every((s) => s !== null);

  return (
    <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
      <TopBar
        label="Interactive Task"
        xp={xp}
        streak={streak}
        onBack={onBack}
      />
      <Panel>
        <span className="clue-card__label">DRAG &amp; DROP</span>
        <h2 className="text-lg font-bold mt-1 mb-4">{task.prompt}</h2>
        <ClueCard text={task.clue_text} />
        <p className="hint-text text-xs mb-2">
          Drag an item into its step — or tap it, then tap the step.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {pool.map((item) => {
            const isSelected = selectedItem === item;
            const itemClass = isSelected
              ? "dragdrop-item--selected"
              : "dragdrop-item--default";
            return (
              <button
                key={item}
                draggable={!checked}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", item);
                  setSelectedItem(item);
                }}
                onDragEnd={() => setSelectedItem(null)}
                onClick={() => pickFromPool(item)}
                className={`dragdrop-item ${itemClass} px-3 py-2 rounded-lg text-sm select-none`}
              >
                <span className="dragdrop-item__handle" aria-hidden="true">⠿</span> {item}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {slots.map((item, i) => {
            let slotModifier = "dragdrop-slot--empty";
            if (checked && item) {
              slotModifier =
                item === items[i]
                  ? "dragdrop-slot--correct"
                  : "dragdrop-slot--wrong";
            } else if (item) {
              slotModifier = "dragdrop-slot--filled";
            }
            return (
              <button
                key={i}
                onClick={() => (item ? clearSlot(i) : placeInSlot(i))}
                onDragOver={(e) => {
                  if (!item && !checked) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  placeInSlot(i, e.dataTransfer.getData("text/plain"));
                }}
                className={`dragdrop-slot ${slotModifier} w-24 h-12 flex items-center justify-center rounded-lg text-xs text-center px-1`}
              >
                {item || `Step ${i + 1}`}
              </button>
            );
          })}
        </div>
        {checked && (
          <p
            className={`${correct ? "feedback-text--correct" : "feedback-text--incorrect"} text-sm mb-4 font-medium`}
          >
            {correct
              ? `Correct! Order: ${items.join(" → ")}.`
              : `Not quite — correct order: ${items.join(" → ")}`}
          </p>
        )}
        {!checked ? (
          <PrimaryButton disabled={!allFilled} onClick={check}>
            Check Answer
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={onComplete}>
            Continue →
          </PrimaryButton>
        )}
      </Panel>
    </div>
  );
}

// ---------- Matching task ----------
function MatchingScreen({ task, xp, streak, onBack, onComplete }) {
  const pairs = task.pairs;
  const structures = pairs.map((p) => p.structure);
  const [roles] = useState(() => shuffle(pairs.map((p) => p.role)));
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [matches, setMatches] = useState({});
  const [checked, setChecked] = useState(false);

  const pickStructure = (s) => {
    if (checked || matches[s]) return;
    setSelectedStructure(s);
  };

  const pickRole = (r) => {
    if (checked || !selectedStructure) return;
    if (Object.values(matches).includes(r)) return;
    setMatches({ ...matches, [selectedStructure]: r });
    setSelectedStructure(null);
  };

  const check = () => setChecked(true);

  const correctCount = pairs.filter(
    (p) => matches[p.structure] === p.role,
  ).length;
  const allMatched = Object.keys(matches).length === structures.length;

  return (
    <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
      <TopBar
        label="Interactive Task"
        xp={xp}
        streak={streak}
        onBack={onBack}
      />
      <Panel>
        <span className="clue-card__label">MATCHING</span>
        <h2 className="text-lg font-bold mt-1 mb-4">{task.prompt}</h2>
        <ClueCard text={task.clue_text} />
        <div className="matching-canvas mb-4">
          <svg
            className="canvas-lines"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {structures.map((s, i) => {
              if (!matches[s]) return null;
              const j = roles.indexOf(matches[s]);
              if (j === -1) return null;
              const rowCount = Math.max(structures.length, roles.length);
              const y1 = ((i + 0.5) / rowCount) * 100;
              const y2 = ((j + 0.5) / rowCount) * 100;
              const pairRole = pairs.find((p) => p.structure === s)?.role;
              const lineModifier = checked
                ? matches[s] === pairRole
                  ? " matching-canvas__line--correct"
                  : " matching-canvas__line--wrong"
                : "";
              return (
                <line
                  key={s}
                  x1="6"
                  y1={y1}
                  x2="94"
                  y2={y2}
                  className={`matching-canvas__line${lineModifier}`}
                />
              );
            })}
          </svg>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              {structures.map((s) => {
                const pairRole = pairs.find((p) => p.structure === s)?.role;
                const isCorrect = checked && matches[s] === pairRole;
                const isWrong = checked && matches[s] && matches[s] !== pairRole;
                const itemClass = isCorrect
                  ? "dragdrop-item--correct"
                  : isWrong
                    ? "dragdrop-item--wrong"
                    : selectedStructure === s || matches[s]
                      ? "dragdrop-item--selected"
                      : "dragdrop-item--default";
                const matchedClass =
                  matches[s] && !checked ? "dragdrop-item--matched" : "";
                return (
                  <button
                    key={s}
                    onClick={() => pickStructure(s)}
                    className={`dragdrop-item ${itemClass} ${matchedClass} px-3 py-2 rounded-lg text-sm text-left`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              {roles.map((r) => {
                const isUsed = Object.values(matches).includes(r);
                const matchedStructure = Object.keys(matches).find(
                  (s) => matches[s] === r,
                );
                const pairRole = pairs.find(
                  (p) => p.structure === matchedStructure,
                )?.role;
                const isCorrect = checked && isUsed && r === pairRole;
                const isWrong = checked && isUsed && r !== pairRole;
                const itemClass = isCorrect
                  ? "dragdrop-item--correct"
                  : isWrong
                    ? "dragdrop-item--wrong"
                    : isUsed
                      ? "dragdrop-item--selected"
                      : "dragdrop-item--default";
                const matchedClass =
                  isUsed && !checked ? "dragdrop-item--matched" : "";
                return (
                  <button
                    key={r}
                    onClick={() => pickRole(r)}
                    className={`dragdrop-item ${itemClass} ${matchedClass} px-3 py-2 rounded-lg text-xs text-left`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {checked && (
          <p
            className={`${correctCount === pairs.length ? "feedback-text--correct" : "feedback-text--incorrect"} text-sm mb-4 font-medium`}
          >
            {correctCount} / {pairs.length} matched correctly
          </p>
        )}
        {!checked ? (
          <PrimaryButton disabled={!allMatched} onClick={check}>
            Check Matches
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={onComplete}>
            Continue →
          </PrimaryButton>
        )}
      </Panel>
    </div>
  );
}

// ---------- Investigation Hub ----------
// Shows every not-yet-completed clue/task as a pickable card instead of
// forcing a fixed order. stepOrder still defines *which* steps exist for
// this case (from buildStepOrder), just not the sequence anymore.
function stepMeta(stepKey) {
  if (stepKey.startsWith("clue-")) {
    const n = Number(stepKey.split("-")[1]) + 1;
    return { icon: "🔍", label: `Question ${n}`, sub: "Answer the question" };
  }
  if (stepKey === "dragdrop") {
    return { icon: "🧩", label: "Sequence Task", sub: "Drag & drop activity" };
  }
  if (stepKey === "experiment") {
    return { icon: "🧪", label: "Experiment", sub: "Run a simple experiment" };
  }
  return { icon: "🔗", label: "Matching Task", sub: "Match the pairs" };
}

// ---------- Experiment task ----------
// A single adjustable variable (slider) with a threshold-based outcome.
// Kept deliberately simple per doc guidance — this is not a scientific
// simulator, just enough interaction for the student to discover a
// relationship themselves instead of being told it.
function ExperimentScreen({ task, xp, streak, onBack, onComplete }) {
  const [value, setValue] = useState(
    Math.round((task.min + task.max) / 2),
  );
  const [recorded, setRecorded] = useState(false);

  const isGood = value >= task.threshold;
  const outcomeText = isGood ? task.good_outcome_text : task.bad_outcome_text;

  const record = () => {
    setRecorded(true);
  };

  return (
    <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
      <TopBar label="Experiment" xp={xp} streak={streak} onBack={onBack} />
      <Panel>
        <span className="clue-card__label">EXPERIMENT</span>
        <h2 className="text-lg font-bold mt-1 mb-4">{task.prompt}</h2>
        <ClueCard text={task.clue_text} />
        <p className="text-sm font-semibold mb-2">
          {task.variable_name}: {value} {task.unit}
        </p>
        <input
          type="range"
          min={task.min}
          max={task.max}
          value={value}
          onChange={(e) => {
            setValue(Number(e.target.value));
            setRecorded(false);
          }}
          style={{ accentColor: "var(--accent-color)" }}
          className="w-full mb-4"
          aria-label={`${task.variable_name}${task.unit ? ` (${task.unit})` : ""}`}
          aria-valuetext={`${value}${task.unit ? ` ${task.unit}` : ""}`}
        />
        <div
          className={`feedback-card ${isGood ? "feedback-card--correct" : "feedback-card--incorrect"} mb-4`}
        >
          <p className="feedback-card__explanation">{outcomeText}</p>
        </div>
        {!recorded ? (
          <PrimaryButton onClick={record}>Record Observation</PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => onComplete({ explanation: outcomeText })}>
            Continue →
          </PrimaryButton>
        )}
      </Panel>
    </div>
  );
}

// ---------- Evidence Locker ----------
function EvidenceLockerScreen({ evidence, xp, streak, onBack }) {
  return (
    <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
      <TopBar label="Notes" xp={xp} streak={streak} onBack={onBack} />
      <Panel>
        <h2 className="text-lg font-bold mb-4">Your Notes</h2>
        {evidence.length === 0 ? (
          <p className="hint-text text-sm">
            No notes yet — complete tasks to collect some.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {evidence.map((e) => (
              <div key={e.id} className="clue-card rounded-lg p-4">
                <span className="clue-card__label">
                  {e.icon} {e.label}
                </span>
                <p className="mt-1 text-sm">{e.finding}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function HubScreen({
  caseTitle,
  stepOrder,
  completedSteps,
  evidenceCount,
  xp,
  streak,
  onBack,
  onSelect,
  onOpenLocker,
  onOpenBoard,
}) {
  const doneCount = completedSteps.length;
  const totalSteps = stepOrder.length;
  const pct = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
  const nextStepKey = stepOrder.find((k) => !completedSteps.includes(k));

  return (
    <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
      <TopBar label="Mission Hub" xp={xp} streak={streak} onBack={onBack} />
      <Panel>
        <span className="clue-card__label">{caseTitle}</span>
        <h2 className="text-lg font-bold mt-1 mb-3">What do you want to practice?</h2>

        <div className="hub-progress mb-4">
          <div className="hub-progress__top">
            <span>Progress</span>
            <span className="hub-progress__pct">{doneCount}/{totalSteps}</span>
          </div>
          <div
            className="hub-progress__track"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="hub-progress__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="hub-tools mb-4">
          <button onClick={onOpenLocker} className="hub-tools__card">
            <span className="hub-tools__icon" aria-hidden="true">🗂️</span>
            <span className="hub-tools__label">Notes</span>
            <span className="hub-tools__sub">{evidenceCount} collected</span>
          </button>
          <button onClick={onOpenBoard} className="hub-tools__card">
            <span className="hub-tools__icon" aria-hidden="true">🕵️</span>
            <span className="hub-tools__label">Connections</span>
            <span className="hub-tools__sub">See connections</span>
          </button>
        </div>

        <p className="hub-steps__title">Practice Steps</p>
        <div className="hub-steps__path">
          {stepOrder.map((stepKey, i) => {
            const done = completedSteps.includes(stepKey);
            const isNext = stepKey === nextStepKey;
            const { icon, label, sub } = stepMeta(stepKey);
            return (
              <div key={stepKey} className="hub-steps__row">
                <div className="hub-steps__track">
                  <span
                    className={`hub-steps__node${done ? " hub-steps__node--done" : ""}${isNext ? " hub-steps__node--next" : ""}`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {i < stepOrder.length - 1 && (
                    <span className={`hub-steps__connector${done ? " hub-steps__connector--done" : ""}`} />
                  )}
                </div>
                <button
                  onClick={() => !done && onSelect(stepKey)}
                  disabled={done}
                  className={`hub-item${done ? " hub-item--done" : ""}${isNext ? " hub-item--next" : ""} flex items-center gap-3 text-left px-4 py-3 rounded-lg text-sm flex-1`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="flex flex-col">
                    <span className="font-semibold">{label}</span>
                    <span className="hint-text text-xs">
                      {done ? "Completed" : isNext ? "Up next" : sub}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ---------- Theory screen (only shown when the case has theory data) ----------
function TheoryScreen({ prompt, options, xp, streak, onBack, onSolved }) {
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const pick = (opt) => {
    if (feedback?.correct) return;
    setSelected(opt);
    setFeedback(null);
  };

  const submit = () => {
    if (!selected) return;
    setFeedback({ correct: !!selected.correct, text: selected.feedback });
  };

  return (
    <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
      <TopBar label="Build Your Theory" xp={xp} streak={streak} onBack={onBack} />
      <Panel>
        <span className="clue-card__label">THEORY</span>
        <h2 className="text-lg font-bold mt-1 mb-4">
          {prompt || "What's your conclusion?"}
        </h2>
        <div className="flex flex-col gap-2 mb-4">
          {options.map((opt, i) => {
            const isPicked = selected === opt;
            let optionModifier = "";
            if (feedback && isPicked) {
              optionModifier = feedback.correct
                ? " option--correct"
                : " option--incorrect";
            } else if (isPicked) {
              optionModifier = " option--picked";
            }
            return (
              <button
                key={i}
                onClick={() => pick(opt)}
                className={`option${optionModifier} text-left px-4 py-3 rounded-lg text-sm`}
              >
                {opt.text}
              </button>
            );
          })}
        </div>
        {feedback && (
          <div
            className={`feedback-card ${feedback.correct ? "feedback-card--correct" : "feedback-card--incorrect"} mb-4`}
          >
            <p className="feedback-card__verdict">
              {feedback.correct ? "✓ Theory holds up!" : "✕ Not quite yet."}
            </p>
            {feedback.text && (
              <p className="feedback-card__explanation">{feedback.text}</p>
            )}
          </div>
        )}
        {!feedback?.correct ? (
          <PrimaryButton disabled={!selected} onClick={submit}>
            Test Theory
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={onSolved}>Confirm Answer →</PrimaryButton>
        )}
      </Panel>
    </div>
  );
}

// ---------- Detective Board ----------
// A real (not decorative) evidence-connection system: tap two evidence
// chips to link them, tap an existing connection to remove it. Purely
// client-side/session-scoped, same as the Evidence Locker — no new
// backend field needed.
function BoardScreen({ evidence, connections, xp, streak, onBack, onToggleConnect, onRemoveConnection }) {
  const [firstPick, setFirstPick] = useState(null);

  const findEvidence = (id) => evidence.find((e) => e.id === id);

  const pick = (id) => {
    if (!firstPick) {
      setFirstPick(id);
      return;
    }
    if (firstPick === id) {
      setFirstPick(null);
      return;
    }
    onToggleConnect(firstPick, id);
    setFirstPick(null);
  };

  const isConnected = (id) =>
    connections.some((c) => c[0] === id || c[1] === id);

  const allConnected =
    evidence.length > 1 && evidence.every((e) => isConnected(e.id));

  // Arrange evidence around a circle in an abstract 0-100 coordinate
  // space so cards and the SVG connection lines share the same
  // positions — this is what turns the screen from an empty list
  // into an actual "board".
  const positions = evidence.map((e, i) => {
    const angle = (2 * Math.PI * i) / Math.max(evidence.length, 1) - Math.PI / 2;
    return {
      id: e.id,
      x: 50 + 36 * Math.cos(angle),
      y: 50 + 36 * Math.sin(angle),
    };
  });
  const posFor = (id) => positions.find((p) => p.id === id);

  return (
    <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
      <TopBar label="Connections" xp={xp} streak={streak} onBack={onBack} />
      <Panel>
        <h2 className="text-lg font-bold mb-2">Connect the Ideas</h2>
        <p className="hint-text text-xs mb-4">
          Tap two notes to link them.
        </p>
        {evidence.length === 0 ? (
          <p className="hint-text text-sm mb-4">No notes collected yet.</p>
        ) : (
          <div className="board-canvas mb-4">
            <svg className="canvas-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
              {connections.map(([a, b], i) => {
                const pa = posFor(a);
                const pb = posFor(b);
                if (!pa || !pb) return null;
                return (
                  <line
                    key={i}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    className="board-canvas__line"
                  />
                );
              })}
              {firstPick && (() => {
                const p = posFor(firstPick);
                return p ? (
                  <circle cx={p.x} cy={p.y} r="6" className="board-canvas__pick-ring" />
                ) : null;
              })()}
            </svg>
            {positions.map((p) => {
              const e = findEvidence(p.id);
              const selected = firstPick === p.id;
              const linked = isConnected(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => pick(p.id)}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  className={`board-node${selected ? " board-node--selected" : ""}${linked ? " board-node--linked" : ""}`}
                >
                  <span className="board-node__icon">{e.icon}</span>
                  <span className="board-node__label">{e.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {connections.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            <span className="clue-card__label">LINKS (tap to remove)</span>
            {connections.map(([a, b], i) => (
              <button
                key={i}
                onClick={() => onRemoveConnection(a, b)}
                className="hub-item flex items-center justify-between px-4 py-2 rounded-lg text-sm text-left"
              >
                <span>
                  {findEvidence(a)?.label} ↔ {findEvidence(b)?.label}
                </span>
                <span className="option__icon">✕</span>
              </button>
            ))}
          </div>
        )}
        {allConnected && (
          <div className="feedback-card feedback-card--correct">
            <p className="feedback-card__verdict">
              Your notes point to a possible cause.
            </p>
            <p className="feedback-card__explanation">
              Head back and build your theory.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

function CaseInvestigation() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("loading");
  const [stepOrder, setStepOrder] = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [caseTheory, setCaseTheory] = useState(null);
  const [caseExperiment, setCaseExperiment] = useState(null);
  const [connections, setConnections] = useState([]);
  const [error, setError] = useState("");
  const [activeCase, setActiveCase] = useState(null);
  const [clues, setClues] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [caseTasks, setCaseTasks] = useState(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/cases/recommended"), api.get("/home")])
      .then(([casesRes, homeRes]) => {
        setStreak(homeRes.data.streak_count || 0);
        setXp(homeRes.data.xp_total || 0);
        setActiveCase(casesRes.data.case);
        setStage("intro");
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setStage("empty");
        } else {
          setError(err.response?.data?.message || err.message);
          setStage("error");
        }
      });
  }, []);

  const startCase = () => {
    api
      .post(`/cases/${activeCase._id}/start`)
      .then((res) => {
        const fetchedClues = res.data.clues.map((c) => c.question);
        setSessionId(res.data.sessionId);
        setClues(fetchedClues);
        setCaseTasks({
          dragdrop_task: res.data.case.dragdrop_task,
          matching_task: res.data.case.matching_task,
        });
        const hasTheory =
          Array.isArray(res.data.case.theory_options) &&
          res.data.case.theory_options.length > 0;
        setCaseTheory(
          hasTheory
            ? {
                prompt: res.data.case.theory_prompt,
                options: res.data.case.theory_options,
              }
            : null,
        );
        const hasExperiment = !!res.data.case.experiment?.variable_name;
        setCaseExperiment(hasExperiment ? res.data.case.experiment : null);
        const order = buildStepOrder(fetchedClues.length);
        if (hasExperiment) order.push("experiment");
        setStepOrder(order);
        setCompletedSteps([]);
        setEvidence([]);
        setConnections([]);
        setStage("hub");
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setStage("error");
      });
  };

  // Builds one Evidence Locker entry for a completed step. Clue evidence
  // uses the explanation returned by the answer API; dragdrop/matching
  // evidence uses the task's own clue_text (already part of case data —
  // no new backend field needed).
  const buildEvidenceEntry = (stepKey, feedback) => {
    const meta = stepMeta(stepKey);
    let finding = "Evidence recorded.";
    if (stepKey.startsWith("clue-")) {
      finding = feedback?.explanation || finding;
    } else if (stepKey === "dragdrop") {
      finding = caseTasks?.dragdrop_task?.clue_text || finding;
    } else if (stepKey === "matching") {
      finding = caseTasks?.matching_task?.clue_text || finding;
    } else if (stepKey === "experiment") {
      finding = feedback?.explanation || finding;
    }
    return { id: stepKey, icon: meta.icon, label: meta.label, finding };
  };

  // Called when the student finishes whichever step they picked from the
  // hub. Marks it done, records evidence, and sends them back to the hub
  // — unless that was the last remaining step, in which case the case
  // completes.
  const advance = (stepKey, feedback) => {
    const nextCompleted = completedSteps.includes(stepKey)
      ? completedSteps
      : [...completedSteps, stepKey];
    setCompletedSteps(nextCompleted);

    if (!evidence.some((e) => e.id === stepKey)) {
      setEvidence((prev) => [...prev, buildEvidenceEntry(stepKey, feedback)]);
    }

    const allDone = stepOrder.every((s) => nextCompleted.includes(s));
    if (!allDone) {
      setStage("hub");
    } else if (caseTheory) {
      setStage("theory");
    } else {
      completeCase();
    }
  };

  // Actually finalizes the case (XP/streak/mastery via the existing
  // complete endpoint) and shows the Solved screen. Called directly when
  // a case has no theory data (old behavior), or from the Theory screen
  // once the correct theory is confirmed.
  const completeCase = () => {
    api
      .post(`/quiz/${sessionId}/complete`)
      .then((res) => {
        setResult(res.data);
        setXp((prev) => prev + res.data.xpAwarded);
        setStreak(res.data.newStreak);
        setStage("solved");
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setStage("error");
      });
  };

  // Detective Board: connections are stored as [idA, idB] pairs, order
  // doesn't matter. Toggling an already-connected pair removes it.
  const toggleConnect = (a, b) => {
    const exists = connections.some(
      ([x, y]) => (x === a && y === b) || (x === b && y === a),
    );
    if (exists) {
      setConnections((prev) =>
        prev.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a))),
      );
    } else {
      setConnections((prev) => [...prev, [a, b]]);
    }
  };

  const removeConnection = (a, b) => {
    setConnections((prev) =>
      prev.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a))),
    );
  };

  const restart = () => {
    setStage("loading");
    setClues([]);
    setSessionId(null);
    setCaseTasks(null);
    setResult(null);
    setStepOrder([]);
    setCompletedSteps([]);
    setEvidence([]);
    setCaseTheory(null);
    setCaseExperiment(null);
    setConnections([]);
    api
      .get("/cases/recommended")
      .then((res) => {
        setActiveCase(res.data.case);
        setStage("intro");
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setStage("empty");
        } else {
          setError(err.response?.data?.message || err.message);
          setStage("error");
        }
      });
  };

  if (stage === "loading")
    return <PageLoading />;
  if (stage === "empty")
    return (
      <p className="practice-message p-4">
        No cases available yet. Check back soon!
      </p>
    );
  if (stage === "error")
    return (
      <p className="practice-message practice-message--error p-4">
        Error: {error}
      </p>
    );

  if (stage === "intro") {
    return (
      <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
        <TopBar
          label="Overview"
          xp={xp}
          streak={streak}
          onBack={() => navigate("/home")}
        />
        <Panel>
          <span className="clue-card__label">MISSION BRIEFING</span>
          <h1 className="text-2xl font-bold mt-1 mb-3">{activeCase.title}</h1>
          <p className="hint-text text-sm mb-4">{activeCase.intro_text}</p>
          <div className="clue-card rounded-lg p-4 mb-6">
            <span className="clue-card__label">YOUR MISSION</span>
            <p className="text-sm mt-1 mb-3">{activeCase.mission_text}</p>
            <div className="flex gap-6">
              <div>
                <div className="text-xl font-bold">{activeCase.clue_count}</div>
                <div className="stat-label text-[11px]">Questions</div>
              </div>
              <div>
                <div className="text-xl font-bold">2</div>
                <div className="stat-label text-[11px]">Interactive Tasks</div>
              </div>
            </div>
          </div>
          <PrimaryButton onClick={startCase} investigation>
            Start →
          </PrimaryButton>
        </Panel>
      </div>
    );
  }

  if (stage === "hub") {
    return (
      <HubScreen
        caseTitle={activeCase.title}
        stepOrder={stepOrder}
        completedSteps={completedSteps}
        evidenceCount={evidence.length}
        xp={xp}
        streak={streak}
        onBack={() => navigate("/home")}
        onSelect={(stepKey) => setStage(stepKey)}
        onOpenLocker={() => setStage("locker")}
        onOpenBoard={() => setStage("board")}
      />
    );
  }

  if (stage === "board") {
    return (
      <BoardScreen
        evidence={evidence}
        connections={connections}
        xp={xp}
        streak={streak}
        onBack={() => setStage("hub")}
        onToggleConnect={toggleConnect}
        onRemoveConnection={removeConnection}
      />
    );
  }

  if (stage === "locker") {
    return (
      <EvidenceLockerScreen
        evidence={evidence}
        xp={xp}
        streak={streak}
        onBack={() => setStage("hub")}
      />
    );
  }

  if (stage === "theory") {
    return (
      <TheoryScreen
        prompt={caseTheory.prompt}
        options={caseTheory.options}
        xp={xp}
        streak={streak}
        onBack={() => setStage("hub")}
        onSolved={completeCase}
      />
    );
  }

  if (stage.startsWith("clue-")) {
    const clueIdx = Number(stage.split("-")[1]);
    return (
      <ClueScreen
        label={`Clue ${clueIdx + 1}`}
        question={clues[clueIdx]}
        xp={xp}
        streak={streak}
        sessionId={sessionId}
        onBack={() => setStage("hub")}
        onAnswered={(feedback) => advance(stage, feedback)}
      />
    );
  }

  if (stage === "dragdrop") {
    return (
      <DragDropScreen
        task={caseTasks.dragdrop_task}
        xp={xp}
        streak={streak}
        onBack={() => setStage("hub")}
        onComplete={() => advance("dragdrop")}
      />
    );
  }

  if (stage === "matching") {
    return (
      <MatchingScreen
        task={caseTasks.matching_task}
        xp={xp}
        streak={streak}
        onBack={() => setStage("hub")}
        onComplete={() => advance("matching")}
      />
    );
  }

  if (stage === "experiment") {
    return (
      <ExperimentScreen
        task={caseExperiment}
        xp={xp}
        streak={streak}
        onBack={() => setStage("hub")}
        onComplete={(feedback) => advance("experiment", feedback)}
      />
    );
  }

  if (stage === "solved") {
    return (
      <div className="practice-page min-h-screen max-w-md lg:max-w-3xl mx-auto flex flex-col">
        <TopBar label="Complete" xp={xp} streak={streak} />
        <Panel>
          <div className="text-center">
            <div className="case-closed__badge inline-block px-3 py-1 rounded text-[11px] font-bold tracking-widest mb-3">
              COMPLETE
            </div>
            <h1 className="text-2xl font-bold mb-4">{activeCase.title}</h1>
            <div className="clue-card rounded-lg p-4 mb-4 text-left">
              <span className="clue-card__label">CONCEPT MASTERY</span>
              <p className="text-sm mt-2">
                {result?.masteryUpdates?.[0]?.new_state
                  ? `Updated to: ${result.masteryUpdates[0].new_state}`
                  : "Mastery updated"}
              </p>
            </div>
            <div className="flex justify-center gap-3 mb-6">
              <div className="case-closed__stat px-3 py-1 rounded text-sm font-semibold">
                +{result?.xpAwarded ?? 0} XP
              </div>
              <div className="case-closed__stat px-3 py-1 rounded text-sm font-semibold">
                🔥 Streak {result?.newStreak ?? streak}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <PrimaryButton onClick={restart} secondary>
                Try Another
              </PrimaryButton>
              <PrimaryButton onClick={() => navigate("/home")}>
                Back to Home
              </PrimaryButton>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return null;
}

export default CaseInvestigation;
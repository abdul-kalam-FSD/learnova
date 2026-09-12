import { useEffect, useRef, useState } from "react";

// Shared engine for the "Primitive C — timed" round loop (Phase 1B
// §6-8 of GAMEPLAY_UX_AUDIT_PHASE_1A.md). Extracted verbatim from
// FractionSpeedChallenge's RoundScreen, which was the literal template
// every other timed game was copied from — question order, answer
// validation, timer behavior, and FEEDBACK_PAUSE_MS handling here are
// byte-for-byte the same state machine, just parameterized so each
// game supplies its own answer shape and pause duration instead of
// duplicating the whole effect/timeout dance.
//
// Two answer shapes exist across the 11 timed/boss games this was
// audited against:
//   - option-tap games (Fraction/Angle/AP/PermComb Speed Challenge,
//     Equation/Geometry Boss Challenge): answer is `selectedOptionId`.
//   - typed-numeric games (Equation Speed Calculation, Ohm's Law /
//     Work-Energy-Power / Capacitance Speed Challenge): answer is a
//     typed `answerValue`, and on timeout the *current* typed value
//     (not always null) is submitted.
// `toAnswerPatch` / `toFlash` let each caller supply its own shape
// without this hook knowing about options vs. typed input.
export function useRoundTimer({
  questions,
  perQuestionSeconds,
  feedbackPauseMs,
  toAnswerPatch,
  toFlash,
  onRoundComplete,
  // Typed-input games submit whatever's currently in the input box on
  // timeout rather than always null; option-tap games always submit
  // null on timeout. Defaults to "always null" to match the original
  // option-tap behavior verbatim.
  getTimeoutValue = () => null,
  // Called right before advancing to the next question (e.g. to clear
  // a typed-input field). Not called on the final question, matching
  // the original inline setInputValue("") placement.
  onAdvance,
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(perQuestionSeconds);
  // Set only for the brief correct/wrong flash right after a tap or timeout.
  const [flash, setFlash] = useState(null);
  const advancingRef = useRef(false);

  const question = questions[index];

  const recordAnswerAndAdvance = (value) => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    const nextAnswers = [...answers, { questionId: question.id, ...toAnswerPatch(value) }];
    setAnswers(nextAnswers);
    setFlash(toFlash(value));

    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex((i) => i + 1);
        setTimeLeft(perQuestionSeconds);
        setFlash(null);
        onAdvance?.();
        advancingRef.current = false;
      } else {
        onRoundComplete(nextAnswers);
      }
    }, feedbackPauseMs);
  };

  // Per-question countdown. Resets whenever `index` changes (new
  // question) via the timeLeft reset above / initial state — this
  // effect just ticks it down and, on hitting zero, records a
  // "no answer" (or whatever's currently typed) and moves on same as
  // a wrong tap.
  useEffect(() => {
    if (flash) return; // paused during the feedback flash
    if (timeLeft <= 0) {
      recordAnswerAndAdvance(getTimeoutValue());
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, flash]);

  const timerPct = Math.max(0, Math.min(100, (timeLeft / perQuestionSeconds) * 100));

  return { question, index, timeLeft, timerPct, flash, recordAnswerAndAdvance };
}

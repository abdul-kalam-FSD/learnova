import { useRef, useState } from "react";

// Shared engine for the "Primitive C — lives/boss" round loop (Phase
// 1B §6-8 of GAMEPLAY_UX_AUDIT_PHASE_1A.md). Extracted verbatim from
// FractionBossChallenge's RoundScreen.
//
// Unlike the timed variant (one batch submit at the very end), the
// boss fight needs to know per-question correctness right away to
// drive the health bar / lives. There's no new backend scoring logic
// needed for this — submitGameAttempt already lets a session resubmit
// its answer batch before completeGame is called ("only the latest
// attempt is used"), so each tap just resubmits answers-so-far and
// reads the updated correctCount back. A rising correctCount means the
// tap just made was right; an unchanged one means it was wrong.
//
// Note: despite the "Boss Challenge" naming shared with
// EquationBossChallenge and GeometryBossChallenge, those two turned
// out (on inspection) to be structurally timed, not lives-based — they
// use useRoundTimer instead. FractionBossChallenge is this hook's only
// real current consumer; kept as a separate hook rather than folded
// into useRoundTimer because the two loops resubmit-and-await-server
// vs. purely-client-side-then-batch-at-the-end, a genuinely different
// shape, not just a parameterization.
export function useRoundLives({
  questions,
  maxLives,
  feedbackPauseMs,
  submitAnswers,
  onRoundOver,
  onError,
}) {
  const totalCount = questions.length;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(maxLives);
  // Set only for the brief hit/life-lost flash right after a tap.
  const [flash, setFlash] = useState(null); // { optionId, wrong } | null
  const advancingRef = useRef(false);

  const question = questions[index];

  const recordAnswerAndAdvance = (selectedOptionId) => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    const nextAnswers = [...answers, { questionId: question.id, selectedOptionId }];

    submitAnswers(nextAnswers)
      .then((res) => {
        const wasCorrect = res.data.correctCount > correctCount;
        const nextLives = wasCorrect ? lives : lives - 1;

        setAnswers(nextAnswers);
        setCorrectCount(res.data.correctCount);
        setLives(nextLives);
        setFlash({ optionId: selectedOptionId, wrong: !wasCorrect });

        setTimeout(() => {
          const bossDefeated = res.data.correctCount >= totalCount;
          const bossEscaped = nextLives <= 0;
          const roundFinished = index + 1 >= totalCount;

          if (bossDefeated || bossEscaped || roundFinished) {
            onRoundOver(res.data, { bossDefeated, bossEscaped });
          } else {
            setIndex((i) => i + 1);
            setFlash(null);
            advancingRef.current = false;
          }
        }, feedbackPauseMs);
      })
      .catch((err) => {
        onError(err.response?.data?.message || err.message);
      });
  };

  return { question, index, lives, correctCount, flash, recordAnswerAndAdvance };
}

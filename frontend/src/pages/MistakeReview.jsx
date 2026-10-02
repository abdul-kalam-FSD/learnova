import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import "../Chapters.css";
import "../Practice.css";

// Mistake Review V1 — quiz-type sessions only (weak-concept-targeted,
// case-investigation). Reads GET /api/quiz/:sessionId/review, which
// only exists for sessions that persist structured per-question
// answer data (see backend/src/controllers/quizControllers.js). The
// 54 game-type mechanics are intentionally out of scope for this
// version — see that file's comment on getQuizReview for why.
function MistakeReview() {
  const { sessionId } = useParams();
  const [mistakes, setMistakes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/quiz/${sessionId}/review`)
      .then((res) => {
        // Same malformed-vs-empty distinction used elsewhere
        // (Chapters.jsx, Progress.jsx): a missing/non-array
        // `mistakes` field means the response itself is unexpected,
        // not that there happen to be zero mistakes.
        if (!Array.isArray(res.data?.mistakes)) {
          setError(
            "We couldn't understand the response from the server. Please try again in a moment.",
          );
          return;
        }
        setMistakes(res.data.mistakes);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [sessionId]);

  if (error) return <p className="p-4 chapters-page__error">Error: {error}</p>;
  if (!mistakes) return <PageLoading label="Loading your answers..." />;

  return (
    <div className="chapters-page p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
      <h2 className="chapters-page__title mb-1">Review Your Answers</h2>
      <p className="chapters-page__subtitle mb-5">
        {mistakes.length > 0
          ? "Here's what to go back over."
          : "You got every question right — nothing to review."}
      </p>

      {mistakes.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Perfect score!"
          subtitle="No mistakes to review on this attempt."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {mistakes.map((mistake, index) => (
            <div
              key={mistake.question_id ?? index}
              className="clue-card rounded-lg p-4 text-left"
            >
              {mistake.concept_title && (
                <span className="clue-card__label">{mistake.concept_title}</span>
              )}
              <p className="text-sm font-semibold mt-2 mb-3">
                {mistake.question_text ?? "This question is no longer available."}
              </p>
              <div className="flex flex-col gap-1 text-sm">
                <p style={{ color: "var(--danger-color, #d64545)" }}>
                  ✗ Your answer: {mistake.selected_option?.text ?? "Unknown"}
                </p>
                <p style={{ color: "var(--success-color, #2e8b57)" }}>
                  ✓ Correct answer: {mistake.correct_option?.text ?? "Unknown"}
                </p>
              </div>
              {mistake.explanation && (
                <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
                  {mistake.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link to="/home" className="btn-primary inline-block">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default MistakeReview;

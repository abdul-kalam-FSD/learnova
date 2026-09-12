import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import GameCard from "../components/GameCard";
import PageLoading from "../components/PageLoading";
import { GAME_TYPE_TO_ROUTE, GAME_TYPE_TO_ICON } from "../games/gameRegistry";
import "../Chapters.css";

function ChapterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/chapters/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="p-4 chapters-page__error">Error: {error}</p>;
  if (!data) return <PageLoading />;

  const { chapter, concepts, games } = data;

  const mastered = concepts.filter(
    (c) => c.mastery_state === "strong" || c.mastery_state === "learning",
  ).length;
  const pct = concepts.length > 0 ? Math.round((mastered / concepts.length) * 100) : 0;

  return (
    <div className="chapters-page p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
      <button
        onClick={() => navigate("/chapters")}
        className="chapter-detail__back"
      >
        ← Back to Chapters
      </button>
      <h2 className="chapter-detail__title text-xl font-bold mb-1">
        {chapter.title}
      </h2>
      <p className="chapter-detail__unit text-sm mb-4">{chapter.unit_name}</p>

      <div className="chapter-detail__progress mb-5">
        <div className="chapter-detail__progress-row">
          <span className="chapter-detail__progress-label">Chapter mastery</span>
          <span className="chapter-detail__progress-value">{pct}%</span>
        </div>
        <ProgressBar value={pct} max={100} variant="primary" height={8} />
      </div>

      {concepts.length === 0 ? (
        <EmptyState
          icon="🧬"
          title="No concepts yet"
          subtitle="Concepts for this chapter will appear here soon."
        />
      ) : (
        <div className="concept-list divide-y mb-5">
          {concepts.map((c) => {
            const badgeClass = c.mastery_state
              ? `badge-${c.mastery_state}`
              : "badge-new";
            return (
              <div
                key={c.id}
                className="concept-list__row flex justify-between items-center p-3"
              >
                <span>{c.title}</span>
                <span
                  className={`badge ${badgeClass} text-xs font-semibold px-2 py-1`}
                >
                  {c.mastery_state || "new"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Game Selection Engine at chapter scope: only shows mechanics
          that actually have content for THIS chapter's concepts, so a
          Biology chapter never shows a Math game and vice versa —
          the "MISSION -> SELECT APPROPRIATE GAMEPLAY" principle applied
          one level below the grade-wide Home catalog. */}
      {games && games.length > 0 && (
        <div className="mb-5">
          <p className="chapter-detail__unit text-sm mb-2 font-semibold">
            Play
          </p>
          <div className="flex flex-col gap-2">
            {games.map(({ game_type, label, count }) => (
              <GameCard
                key={game_type}
                icon={GAME_TYPE_TO_ICON[game_type] || "🎮"}
                title={label}
                subtitle={`${count} level${count === 1 ? "" : "s"}`}
                onClick={() =>
                  navigate(GAME_TYPE_TO_ROUTE[game_type], { state: { chapterId: id } })
                }
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate("/practice")}
        className="btn-primary w-full font-bold py-3 rounded-lg"
      >
        Practice This Chapter
      </button>
    </div>
  );
}

export default ChapterDetail;
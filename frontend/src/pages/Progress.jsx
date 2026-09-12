import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import SectionHeader from "../components/SectionHeader";
import PageLoading from "../components/PageLoading";
import EmptyState from "../components/EmptyState";
import { iconFor } from "../utils/chapterIcon";
import "../Progress.css";

/**
 * Standalone Progress tab — chapter-by-chapter mastery breakdown,
 * grouped by unit for consistency with Chapters.jsx.
 * Extracted from Profile.jsx, where this was temporarily folded in
 * under the old 4-tab nav (Home/Chapters/Leaderboard/Profile).
 */
function Progress() {
  const navigate = useNavigate();
  const [unitGroups, setUnitGroups] = useState(null);
  const [error, setError] = useState("");
  const [filterWeak, setFilterWeak] = useState(false);

  useEffect(() => {
    api
      .get("/progress")
      .then((res) => {
        const grouped = {};
        for (const ch of res.data.chapters) {
          const unit = ch.unit_name || "General";
          if (!grouped[unit]) grouped[unit] = [];
          grouped[unit].push(ch);
        }
        setUnitGroups(Object.entries(grouped));
      })
      .catch((err) => setError(err.message));
  }, []);

  const overallPct = (() => {
    if (!unitGroups) return 0;
    const totals = unitGroups
      .flatMap(([, chapters]) => chapters)
      .reduce(
        (acc, ch) => {
          acc.total += ch.total_concepts;
          acc.mastered += ch.breakdown.strong + ch.breakdown.learning;
          return acc;
        },
        { total: 0, mastered: 0 },
      );
    return totals.total > 0
      ? Math.round((totals.mastered / totals.total) * 100)
      : 0;
  })();

  const masteryBadge = (state, count) => (
    <span className={`badge badge-${state} text-xs font-semibold px-2 py-1`}>
      {state[0].toUpperCase() + state.slice(1)}: {count}
    </span>
  );

  if (error) return <p className="p-4 progress-page__error">Error: {error}</p>;
  if (!unitGroups) return <PageLoading />;

  const visibleGroups = filterWeak
    ? unitGroups
        .map(([unit, chapters]) => [
          unit,
          chapters.filter((ch) => ch.breakdown.weak > 0),
        ])
        .filter(([, chapters]) => chapters.length > 0)
    : unitGroups;

  return (
    <div className="progress-page p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-3">
        <h1 className="progress-page__title font-bold text-lg">Your Progress</h1>
        <button
          onClick={() => setFilterWeak(!filterWeak)}
          className={`progress-page__filter${filterWeak ? " progress-page__filter--active" : ""} text-xs font-semibold px-3 py-1`}
        >
          Weak Only
        </button>
      </div>

      <div
        className="progress-overall__track mb-1"
        role="progressbar"
        aria-valuenow={overallPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Overall mastery"
      >
        <div
          className="progress-overall__fill"
          style={{ width: `${overallPct}%` }}
        />
      </div>
      <p className="progress-overall__label mb-4">{overallPct}% overall mastery</p>

      {visibleGroups.length === 0 ? (
        unitGroups.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No chapters available for your grade yet."
          />
        ) : (
          <EmptyState icon="🎉" title="No weak concepts here — nice work!" />
        )
      ) : (
        visibleGroups.map(([unitName, chapters]) => (
          <div key={unitName} className="mb-5">
            <SectionHeader title={unitName} />
            <div className="progress-card__grid">
              {chapters.map((ch) => (
                <div key={ch.chapter_id} className="progress-card mb-3 p-3">
                  <div className="progress-card__header">
                    <span className="progress-card__icon" aria-hidden="true">
                      {iconFor(ch.title, ch.subject_name)}
                    </span>
                    <div>
                      <h4 className="progress-card__chapter-title font-bold">{ch.title}</h4>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-2 mt-2">
                    {masteryBadge("weak", ch.breakdown.weak)}
                    {masteryBadge("learning", ch.breakdown.learning)}
                    {masteryBadge("strong", ch.breakdown.strong)}
                  </div>
                  {ch.breakdown.weak > 0 && (
                    <button
                      onClick={() =>
                        // Phase 2 Batch A: this used to send students into the
                        // legacy /chapters/:id detail page. It now goes to the
                        // canonical /mission/:chapterId page instead — same
                        // chapter, same GET /chapters/:id data underneath, just
                        // consistent with how every other current entry point
                        // (SubjectChapters, ChapterMission itself) reaches a
                        // chapter. /chapters/:id itself is untouched and still
                        // works for any existing bookmark/direct link.
                        navigate(`/mission/${ch.chapter_id}`, {
                          state: { subjectName: ch.subject_name },
                        })
                      }
                      className="progress-page__practice-link"
                    >
                      Practice Weak Concepts →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Progress;


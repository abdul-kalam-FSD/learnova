import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import SectionHeader from "../components/SectionHeader";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import { iconFor } from "../utils/chapterIcon";
import { GAME_TYPE_TO_ICON, GAME_TYPE_TO_ACTION } from "../games/gameRegistry";
import { useBackNavigation } from "../utils/useBackNavigation";
import "../Chapters.css";

// Phase 0B: a single world's chapters, presented as a journey/trail
// (stage-by-stage) rather than a flat card list, plus a dominant
// "Current Mission" hero for the first not-yet-mastered chapter.
// Stage state ("Completed" / "In Progress" / "Not Started") is
// derived only from real mastery breakdown already returned by
// /progress — there is no lock/unlock system in the backend today,
// so this deliberately does NOT invent one; every stage stays
// reachable, same as before this pass.
function stageState(chapter) {
  const mastered = chapter.breakdown.learning + chapter.breakdown.strong;
  if (chapter.total_concepts > 0 && mastered === chapter.total_concepts) {
    return { label: "Completed", icon: "✅", key: "completed" };
  }
  if (mastered > 0) {
    return { label: "In Progress", icon: "▶️", key: "current" };
  }
  return { label: "Not Started", icon: "⚪", key: "not-started" };
}

function SubjectChapters() {
  const { subjectName } = useParams();
  const decodedSubject = decodeURIComponent(subjectName);
  const navigate = useNavigate();
  const goBack = useBackNavigation();
  const [unitGroups, setUnitGroups] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [currentChapterGames, setCurrentChapterGames] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/progress")
      .then((res) => {
        const chaptersInSubject = res.data.chapters.filter(
          (ch) => (ch.subject_name || "General") === decodedSubject,
        );
        const byUnit = {};
        for (const ch of chaptersInSubject) {
          const unit = ch.unit_name || "General";
          if (!byUnit[unit]) byUnit[unit] = [];
          byUnit[unit].push(ch);
        }
        setUnitGroups(Object.entries(byUnit));

        // Current Mission: the first chapter (in real order_index
        // order, preserved through /progress) that isn't fully
        // mastered yet. null when the whole world is complete.
        const next = chaptersInSubject.find((ch) => {
          const mastered = ch.breakdown.learning + ch.breakdown.strong;
          return !(ch.total_concepts > 0 && mastered === ch.total_concepts);
        });
        setCurrentChapter(next || null);

        if (next) {
          // One extra call, scoped to just this one chapter, to show
          // its real available mechanics (not invented) in the
          // mission hero — same endpoint ChapterDetails.jsx already
          // uses for its own "Play" section.
          api
            .get(`/chapters/${next.chapter_id}`)
            .then((detailRes) => setCurrentChapterGames(detailRes.data.games || []))
            .catch(() => setCurrentChapterGames([]));
        }
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedSubject]);

  if (error) return <p className="p-4 chapters-page__error">Error: {error}</p>;
  if (!unitGroups) return <PageLoading />;

  const currentChapterPct = currentChapter
    ? currentChapter.total_concepts > 0
      ? Math.round(
          ((currentChapter.breakdown.learning + currentChapter.breakdown.strong) /
            currentChapter.total_concepts) *
            100,
        )
      : 0
    : 0;
  const recommendedGame =
    currentChapterGames && currentChapterGames.length > 0 ? currentChapterGames[0] : null;

  return (
    <div className="chapters-page p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
      <button onClick={() => goBack("/subjects")} className="chapter-detail__back">
        ← Back to Worlds
      </button>
      <div className="chapters-page__subject-heading mb-1">
        <span className="chapters-page__subject-icon" aria-hidden="true">
          {iconFor(decodedSubject, decodedSubject)}
        </span>
        <h2 className="chapters-page__title">{decodedSubject} World</h2>
      </div>
      <p className="chapters-page__subtitle mb-5">
        Choose a chapter to see its mission.
      </p>

      {currentChapter && (
        <div className="mission-hero mb-6">
          <span className="mission-hero__label">▶ Current Mission</span>
          <p className="mission-hero__title">{currentChapter.title}</p>
          <p className="mission-hero__sub">
            {currentChapter.breakdown.learning + currentChapter.breakdown.strong}/
            {currentChapter.total_concepts} concepts mastered so far.
          </p>
          <div
            className="mission-hero__track"
            role="progressbar"
            aria-valuenow={currentChapterPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Current mission progress"
          >
            <div className="mission-hero__fill" style={{ width: `${currentChapterPct}%` }} />
          </div>

          {recommendedGame ? (
            <div className="mission-hero__recommended">
              <span className="mission-hero__recommended-icon" aria-hidden="true">
                {GAME_TYPE_TO_ICON[recommendedGame.game_type] || "🎮"}
              </span>
              <span>
                <span className="mission-hero__recommended-action">
                  {GAME_TYPE_TO_ACTION[recommendedGame.game_type] || "Play"}
                </span>
                <span className="mission-hero__recommended-label">
                  {" "}
                  · {recommendedGame.label} · {recommendedGame.count} level
                  {recommendedGame.count === 1 ? "" : "s"}
                </span>
              </span>
            </div>
          ) : currentChapterGames !== null ? (
            <p className="world-empty-games mb-3">
              No games for this chapter yet — practice is still available inside.
            </p>
          ) : null}

          <button
            onClick={() =>
              navigate(`/mission/${currentChapter.chapter_id}`, {
                state: { subjectName: decodedSubject },
              })
            }
            className="btn-primary w-full font-bold py-3 rounded-lg"
          >
            Continue Mission →
          </button>
        </div>
      )}

      {unitGroups.length === 0 ? (
        <EmptyState
          icon="🧬"
          title="No chapters yet"
          subtitle="Chapters for this world will show up here soon."
        />
      ) : (
        unitGroups.map(([unitName, chapters]) => (
          <div key={unitName} className="mb-5">
            <SectionHeader title={unitName} />
            <div className="chapter-journey">
              {chapters.map((ch) => {
                const mastered = ch.breakdown.learning + ch.breakdown.strong;
                const pct =
                  ch.total_concepts > 0
                    ? Math.round((mastered / ch.total_concepts) * 100)
                    : 0;
                const stage = stageState(ch);
                const isCurrent = currentChapter?.chapter_id === ch.chapter_id;

                return (
                  <Link
                    key={ch.chapter_id}
                    to={`/mission/${ch.chapter_id}`}
                    state={{ subjectName: decodedSubject }}
                    className={`chapter-journey__stage chapter-journey__stage--${isCurrent ? "current" : stage.key}`}
                  >
                    <span className="chapter-journey__node" aria-hidden="true">
                      {iconFor(ch.title, ch.subject_name)}
                    </span>
                    <div className="chapter-journey__body">
                      <p className="chapter-journey__title">{ch.title}</p>
                      <ProgressBar value={pct} max={100} variant="primary" height={6} />
                      <p className="chapter-journey__meta">
                        {isCurrent ? "▶️ Current Mission" : `${stage.icon} ${stage.label}`} ·{" "}
                        {pct}% mastered
                      </p>
                    </div>
                    <span className="chapter-journey__arrow" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default SubjectChapters;
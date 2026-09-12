import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import SectionHeader from "../components/SectionHeader";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import { iconFor } from "../utils/chapterIcon";
import "../Chapters.css";

function Chapters() {
  const [subjectGroups, setSubjectGroups] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/progress")
      .then((res) => {
        const bySubject = {};
        for (const ch of res.data.chapters) {
          const subject = ch.subject_name || "General";
          if (!bySubject[subject]) bySubject[subject] = {};
          const unit = ch.unit_name || "General";
          if (!bySubject[subject][unit]) bySubject[subject][unit] = [];
          bySubject[subject][unit].push(ch);
        }
        const subjects = Object.entries(bySubject).map(
          ([subjectName, units]) => [subjectName, Object.entries(units)],
        );
        setSubjectGroups(subjects);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  if (error) return <p className="p-4 chapters-page__error">Error: {error}</p>;
  if (!subjectGroups) return <PageLoading />;

  return (
    <div className="chapters-page p-4 max-w-md lg:max-w-3xl mx-auto min-h-screen">
      <h2 className="chapters-page__title mb-1">Choose a Chapter</h2>
      <p className="chapters-page__subtitle mb-5">
        Pick a chapter and start learning.
      </p>

      {subjectGroups.length === 0 ? (
        <EmptyState
          icon="🧬"
          title="No chapters yet"
          subtitle="Chapters for your grade will show up here soon."
        />
      ) : (
        subjectGroups.map(([subjectName, unitGroups]) => {
          const allChaptersInSubject = unitGroups.flatMap(([, ch]) => ch);
          const subjectDoneCount = allChaptersInSubject.filter((ch) => {
            const mastered = ch.breakdown.learning + ch.breakdown.strong;
            return ch.total_concepts > 0 && mastered === ch.total_concepts;
          }).length;
          // Only render a subject-level heading when there's more than
          // one subject to disambiguate — a single-subject grade keeps
          // its existing look (unit headings only, no extra wrapper).
          const showSubjectHeading = subjectGroups.length > 1;

          return (
            <div key={subjectName} className="chapters-page__subject mb-6">
              {showSubjectHeading && (
                <div className="chapters-page__subject-heading">
                  <span
                    className="chapters-page__subject-icon"
                    aria-hidden="true"
                  >
                    {iconFor(subjectName, subjectName)}
                  </span>
                  <h3 className="chapters-page__subject-title">
                    {subjectName}
                  </h3>
                  <span className="chapters-page__unit-count">
                    {subjectDoneCount}/{allChaptersInSubject.length}
                  </span>
                </div>
              )}
              {unitGroups.map(([unitName, chapters]) => {
                const doneCount = chapters.filter((ch) => {
                  const mastered = ch.breakdown.learning + ch.breakdown.strong;
                  return ch.total_concepts > 0 && mastered === ch.total_concepts;
                }).length;

                return (
                  <div key={unitName} className="mb-5">
                    <SectionHeader
                      title={unitName}
                      action={
                        <span className="chapters-page__unit-count">
                          {doneCount}/{chapters.length}
                        </span>
                      }
                    />
                    <div className="chapter-card__grid">
                      {chapters.map((ch) => {
                        const mastered =
                          ch.breakdown.learning + ch.breakdown.strong;
                        const pct =
                          ch.total_concepts > 0
                            ? Math.round((mastered / ch.total_concepts) * 100)
                            : 0;
                        return (
                          <Link
                            key={ch.chapter_id}
                            to={`/chapters/${ch.chapter_id}`}
                            className="chapter-card"
                          >
                            <div
                              className="chapter-card__icon"
                              aria-hidden="true"
                            >
                              {iconFor(ch.title, ch.subject_name)}
                            </div>
                            <div className="chapter-card__body">
                              <p className="chapter-card__title">{ch.title}</p>
                              <ProgressBar
                                value={pct}
                                max={100}
                                variant="primary"
                                height={6}
                              />
                              <p className="chapter-card__meta">
                                {ch.total_concepts} concepts · {pct}% mastered
                              </p>
                              <div className="chapter-card__breakdown">
                                {ch.breakdown.strong > 0 && (
                                  <span className="badge badge-strong chapter-card__breakdown-chip">
                                    🟢 {ch.breakdown.strong}
                                  </span>
                                )}
                                {ch.breakdown.learning > 0 && (
                                  <span className="badge badge-learning chapter-card__breakdown-chip">
                                    🟡 {ch.breakdown.learning}
                                  </span>
                                )}
                                {ch.breakdown.weak > 0 && (
                                  <span className="badge badge-weak chapter-card__breakdown-chip">
                                    🔴 {ch.breakdown.weak}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              className="chapter-card__arrow"
                              aria-hidden="true"
                            >
                              ›
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

export default Chapters;
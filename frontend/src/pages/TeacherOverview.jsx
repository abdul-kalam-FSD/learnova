import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import TeacherTabs from "../components/TeacherTabs";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import "../Teacher.css";
import "../Admin.css";

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="dash-card">
      <div className="dash-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="dash-card__value">{value}</div>
      <div className="dash-card__label">{label}</div>
      {sub && <div className="dash-card__sub">{sub}</div>}
    </div>
  );
}

function PerformanceBar({ label, accuracy }) {
  return (
    <div className="dash-bar">
      <div className="dash-bar__row">
        <span className="dash-bar__label">{label}</span>
        <span className="dash-bar__value">{accuracy}%</span>
      </div>
      <div className="dash-bar__track">
        <div className="dash-bar__fill" style={{ width: `${accuracy}%` }} />
      </div>
    </div>
  );
}

function TeacherOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api
      .get("/teacher/overview")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Same documented "fetch on mount" Effect pattern used throughout
    // this codebase's admin/teacher pages (see AdminStudents.jsx) —
    // the lint rule flags the setState calls inside `load`, but this
    // mirrors react.dev's own Effects guide for data fetching.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <div className="teacher-page p-4">
      <h1 className="teacher-page__title mb-1">Overview</h1>
      <p className="teacher-page__subtitle mb-4">
        {data && !data.isScoped
          ? "Showing platform-wide numbers (admin view)."
          : "Your classes, at a glance."}
      </p>

      <TeacherTabs />

      {loading && <PageLoading label="Loading your dashboard..." />}

      {error && !loading && (
        <div className="dash-error">
          <p className="teacher-page__error mb-2">
            We couldn't load your dashboard. {error}
          </p>
          <button className="btn-primary dash-retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {data.totals.totalStudents === 0 ? (
            <EmptyState
              icon="🍎"
              title="No students assigned yet"
              subtitle="Once students are added to one of your sections, their activity and performance will show up here."
            />
          ) : (
            <>
              <div className="dash-grid mb-5">
                <StatCard icon="🎓" label="My students" value={data.totals.totalStudents} />
                <StatCard icon="🏫" label="My sections" value={data.totals.totalSections} />
                <StatCard
                  icon="📈"
                  label="Avg. performance"
                  value={data.totals.avgPerformance != null ? `${data.totals.avgPerformance}%` : "—"}
                  sub={
                    data.totals.avgPerformance != null
                      ? `${data.totals.avgPerformanceSampleSize} scored sessions`
                      : "No scored sessions yet"
                  }
                />
              </div>

              <div className="dash-two-col mb-5">
                <section className="dash-section">
                  <div className="dash-section__header-row">
                    <h2 className="dash-section__title">Students needing attention</h2>
                    <button className="dash-link-btn" onClick={() => navigate("/teacher/weak-areas")}>
                      View all →
                    </button>
                  </div>
                  {data.weakAreas.length === 0 ? (
                    <EmptyState
                      icon="✨"
                      title="No weak areas identified yet"
                      subtitle="This fills in once your students start attempting concepts."
                    />
                  ) : (
                    <ul className="dash-list">
                      {data.weakAreas.map((w) => (
                        <li key={w.conceptId} className="dash-list__item">
                          <div>
                            <span className="dash-list__title">
                              {w.weak} student{w.weak === 1 ? "" : "s"} struggling with {w.conceptTitle}
                            </span>
                            <span className="dash-list__meta">
                              {w.subject} · {w.chapterTitle}
                            </span>
                          </div>
                          <span className={`mastery-badge mastery-badge--${w.status}`}>
                            {w.status.replace("-", " ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="dash-section">
                  <h2 className="dash-section__title">Subject performance</h2>
                  {data.subjectPerformance.length === 0 ? (
                    <EmptyState
                      icon="📚"
                      title="No graded activity yet"
                      subtitle="Subject-level performance appears once your students complete quizzes or cases."
                    />
                  ) : (
                    data.subjectPerformance.map((s) => (
                      <PerformanceBar key={s.subject} label={s.subject} accuracy={s.accuracy} />
                    ))
                  )}
                </section>

                <section className="dash-section">
                  <h2 className="dash-section__title">Game performance by subject</h2>
                  {(!data.gameSubjectPerformance || data.gameSubjectPerformance.length === 0) ? (
                    <EmptyState
                      icon="🎮"
                      title="No game activity yet"
                      subtitle="Game-level performance appears once your students complete a game."
                    />
                  ) : (
                    data.gameSubjectPerformance.map((s) => (
                      <PerformanceBar key={s.subject} label={s.subject} accuracy={s.accuracy} />
                    ))
                  )}
                </section>
              </div>

              <section className="dash-section mb-4">
                <div className="dash-section__header-row">
                  <h2 className="dash-section__title">Recent student activity</h2>
                  <button className="dash-link-btn" onClick={() => navigate("/teacher/students")}>
                    View all students →
                  </button>
                </div>
                {data.recentActivity.length === 0 ? (
                  <EmptyState
                    icon="🕒"
                    title="No activity yet"
                    subtitle="Completed sessions from your students will appear here."
                  />
                ) : (
                  <div className="teacher-table__wrapper">
                    <table className="teacher-table">
                      <thead>
                        <tr>
                          <th className="teacher-table__head-cell">Student</th>
                          <th className="teacher-table__head-cell">Activity</th>
                          <th className="teacher-table__head-cell">Score</th>
                          <th className="teacher-table__head-cell">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentActivity.map((a) => (
                          <tr key={a.sessionId} className="teacher-table__row">
                            <td className="teacher-table__cell">{a.studentName}</td>
                            <td className="teacher-table__cell">{a.label}</td>
                            <td className="teacher-table__cell">
                              {a.accuracy != null ? `${a.accuracy}%` : "—"}
                            </td>
                            <td className="teacher-table__cell">
                              {new Date(a.completedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default TeacherOverview;

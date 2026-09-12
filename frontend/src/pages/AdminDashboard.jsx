import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminTabs from "../components/AdminTabs";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import "../Admin.css";
// mastery-badge (used for the weak-areas list below) is defined in
// Teacher.css. Imported here too so this page's styling doesn't
// depend on the Teacher pages having been visited first in this
// session.
import "../Teacher.css";

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

function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api
      .get("/admin/stats")
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
    <div className="admin-page p-4">
      <h1 className="admin-page__title mb-1">Dashboard</h1>
      <p className="admin-page__subtitle mb-4">
        Platform-wide overview, updated in real time from live data.
      </p>

      <AdminTabs />

      {loading && <PageLoading label="Loading dashboard..." />}

      {error && !loading && (
        <div className="dash-error">
          <p className="admin-page__error mb-2">
            We couldn't load your learning data. {error}
          </p>
          <button className="btn-primary dash-retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="dash-grid mb-5">
            <StatCard icon="🎓" label="Total students" value={data.totals.totalStudents} />
            <StatCard icon="🍎" label="Total teachers" value={data.totals.totalTeachers} />
            <StatCard
              icon="⚡"
              label={`Active in last ${data.totals.activeWindowDays}d`}
              value={data.totals.activeStudents}
            />
            <StatCard icon="🎮" label="Games played" value={data.totals.gamesPlayed} />
            <StatCard icon="✅" label="Session completion rate" value={`${data.totals.completionRate}%`} />
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
              <h2 className="dash-section__title">Performance by grade</h2>
              {data.gradePerformance.length === 0 ? (
                <EmptyState
                  icon="📊"
                  title="No graded activity yet"
                  subtitle="Once students complete quizzes or cases, grade-level performance will show up here."
                />
              ) : (
                data.gradePerformance.map((g) => (
                  <PerformanceBar key={g.grade} label={`Grade ${g.grade}`} accuracy={g.accuracy} />
                ))
              )}
            </section>

            <section className="dash-section">
              <h2 className="dash-section__title">Performance by subject</h2>
              {data.subjectPerformance.length === 0 ? (
                <EmptyState
                  icon="📚"
                  title="No graded activity yet"
                  subtitle="Subject-level performance appears once quiz or case sessions are completed."
                />
              ) : (
                data.subjectPerformance.map((s) => (
                  <PerformanceBar key={s.subject} label={s.subject} accuracy={s.accuracy} />
                ))
              )}
            </section>
          </div>

          <div className="dash-two-col mb-5">
            <section className="dash-section">
              <h2 className="dash-section__title">Game performance by subject</h2>
              {(!data.gameSubjectPerformance || data.gameSubjectPerformance.length === 0) ? (
                <EmptyState
                  icon="🎮"
                  title="No game activity yet"
                  subtitle="Game-level performance appears once students complete a game."
                />
              ) : (
                data.gameSubjectPerformance.map((s) => (
                  <PerformanceBar key={s.subject} label={s.subject} accuracy={s.accuracy} />
                ))
              )}
            </section>
          </div>

          <div className="dash-two-col mb-5">
            <section className="dash-section">
              <div className="dash-section__header-row">
                <h2 className="dash-section__title">Weak areas overview</h2>
                <button className="dash-link-btn" onClick={() => navigate("/teacher/weak-areas")}>
                  View all →
                </button>
              </div>
              {data.weakAreas.length === 0 ? (
                <EmptyState
                  icon="✨"
                  title="No weak areas identified yet"
                  subtitle="This fills in once students start attempting concepts."
                />
              ) : (
                <ul className="dash-list">
                  {data.weakAreas.map((w) => (
                    <li key={w.conceptId} className="dash-list__item">
                      <div>
                        <span className="dash-list__title">{w.conceptTitle}</span>
                        <span className="dash-list__meta">
                          {w.subject} · Grade {w.grade} · {w.chapterTitle}
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
              <h2 className="dash-section__title">Content status</h2>
              <ul className="dash-list dash-list--plain">
                <li className="dash-list__item">
                  <span className="dash-list__title">Subjects seeded</span>
                  <span className="dash-list__meta">
                    {data.contentStatus.totalSubjects} across grades{" "}
                    {data.contentStatus.gradesCovered.join(", ") || "—"}
                  </span>
                </li>
                <li className="dash-list__item">
                  <span className="dash-list__title">Chapters</span>
                  <span className="dash-list__meta">{data.contentStatus.totalChapters} total</span>
                </li>
                <li className="dash-list__item">
                  <span className="dash-list__title">Game content items</span>
                  <span className="dash-list__meta">{data.contentStatus.totalGameContent} total</span>
                </li>
                {data.contentStatus.subjectsWithNoChapters > 0 && (
                  <li className="dash-list__item dash-list__item--warn">
                    <span className="dash-list__title">⚠ Subjects with no chapters</span>
                    <span className="dash-list__meta">{data.contentStatus.subjectsWithNoChapters}</span>
                  </li>
                )}
                {data.contentStatus.chaptersWithNoConcepts > 0 && (
                  <li className="dash-list__item dash-list__item--warn">
                    <span className="dash-list__title">⚠ Chapters with no concepts</span>
                    <span className="dash-list__meta">{data.contentStatus.chaptersWithNoConcepts}</span>
                  </li>
                )}
              </ul>
            </section>
          </div>

          <section className="dash-section mb-4">
            <h2 className="dash-section__title">Recent activity</h2>
            {data.recentActivity.length === 0 ? (
              <EmptyState
                icon="🕒"
                title="No activity yet"
                subtitle="Completed sessions will appear here as students play."
              />
            ) : (
              <div className="admin-table__wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="admin-table__head-cell">Student</th>
                      <th className="admin-table__head-cell">Grade</th>
                      <th className="admin-table__head-cell">Activity</th>
                      <th className="admin-table__head-cell">Score</th>
                      <th className="admin-table__head-cell">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentActivity.map((a) => (
                      <tr key={a.sessionId} className="admin-table__row">
                        <td className="admin-table__cell">{a.studentName}</td>
                        <td className="admin-table__cell">{a.grade}</td>
                        <td className="admin-table__cell">{a.label}</td>
                        <td className="admin-table__cell admin-table__accuracy">
                          {a.accuracy != null ? `${a.accuracy}%` : "—"}
                        </td>
                        <td className="admin-table__cell">
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
    </div>
  );
}

export default AdminDashboard;

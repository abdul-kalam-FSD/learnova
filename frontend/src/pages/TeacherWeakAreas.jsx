import { useEffect, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import TeacherTabs from "../components/TeacherTabs";
import "../Teacher.css";

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

function TeacherWeakAreas() {
  const [grade, setGrade] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // react-hooks/set-state-in-effect flags this, but it's React's own
    // documented "fetching data in response to a changing dependency"
    // pattern (see react.dev's Effects guide): loading/error reset here
    // so the UI shows a fresh loading state the moment `grade` changes,
    // not stale data from the previous grade while the new request is
    // in flight. Moving the reset out of the effect (e.g. into the
    // grade <select>'s onChange) would miss the initial mount fetch and
    // require duplicating this logic in two places.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    const params = {};
    if (grade) params.grade = grade;

    api
      .get("/teacher/weak-areas", { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [grade]);

  return (
    <div className="teacher-page p-4">
      <h1 className="teacher-page__title mb-1">Weak Areas</h1>
      <p className="teacher-page__subtitle mb-4">
        {data ? `${data.weakAreas.length} concept${data.weakAreas.length === 1 ? "" : "s"} with activity` : "\u00A0"}
      </p>

      <TeacherTabs />

      <div className="teacher-page__toolbar mb-4">
        <select
          className="teacher-page__select"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        >
          <option value="">All grades</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
      </div>

      {loading && <PageLoading label="Loading weak areas..." />}
      {error && <p className="teacher-page__error">{error}</p>}

      {!loading && !error && data && data.weakAreas.length === 0 && (
        <EmptyState
          icon="📊"
          title="No mastery data yet"
          subtitle="Once students start playing, concept-level mastery will show up here."
        />
      )}

      {!loading && !error && data && data.weakAreas.length > 0 && (
        <div className="teacher-table__wrapper">
          <table className="teacher-table">
            <thead>
              <tr>
                <th className="teacher-table__head-cell">Concept</th>
                <th className="teacher-table__head-cell">Subject</th>
                <th className="teacher-table__head-cell">Grade</th>
                <th className="teacher-table__head-cell">Weak</th>
                <th className="teacher-table__head-cell">Learning</th>
                <th className="teacher-table__head-cell">Strong</th>
                <th className="teacher-table__head-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.weakAreas.map((area) => (
                <tr key={area.conceptId} className="teacher-table__row">
                  <td className="teacher-table__cell">{area.conceptTitle}</td>
                  <td className="teacher-table__cell">{area.subject}</td>
                  <td className="teacher-table__cell">{area.grade}</td>
                  <td className="teacher-table__cell">{area.weak}</td>
                  <td className="teacher-table__cell">{area.learning}</td>
                  <td className="teacher-table__cell">{area.strong}</td>
                  <td className="teacher-table__cell">
                    <span className={`mastery-badge mastery-badge--${area.status}`}>
                      {area.status.replace("-", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TeacherWeakAreas;

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import "../Admin.css";

function AdminStudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // react-hooks/set-state-in-effect flags this, but it's React's own
    // documented "fetching data in an Effect" pattern (react.dev's Effects
    // guide): resetting loading/error here shows a fresh loading state
    // immediately when a dependency changes, instead of stale data while
    // the new request is in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    api
      .get(`/admin/students/${id}`)
      .then((res) => setStudent(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="admin-page p-4">
      <button className="admin-detail__back mb-3" onClick={() => navigate("/admin/students")}>
        ← Back to Students
      </button>

      {loading && <PageLoading label="Loading student..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && student && (
        <>
          <div className="admin-detail__header flex items-center gap-3 p-4 mb-4">
            <div className="admin-detail__avatar">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="admin-detail__name">{student.name}</p>
              <p className="admin-detail__email">{student.email}</p>
              <p className="admin-detail__meta">
                Grade {student.grade} · Joined{" "}
                {new Date(student.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="admin-detail__stats-grid mb-5">
            <div className="admin-detail__stat-card">
              <p className="admin-detail__stat-value">{student.xpTotal}</p>
              <p className="admin-detail__stat-label">Total XP</p>
            </div>
            <div className="admin-detail__stat-card">
              <p className="admin-detail__stat-value">{student.quizzesPlayed}</p>
              <p className="admin-detail__stat-label">Quizzes Played</p>
            </div>
            <div className="admin-detail__stat-card">
              <p className="admin-detail__stat-value">{student.accuracy}%</p>
              <p className="admin-detail__stat-label">Accuracy</p>
            </div>
          </div>

          <p className="admin-detail__section-title mb-2">Recent Sessions</p>

          {student.recentQuizzes.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No sessions yet"
              subtitle="This student hasn't completed any quizzes or cases."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {student.recentQuizzes.map((q) => (
                <div
                  key={q.sessionId}
                  className="admin-detail__session-row flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="admin-detail__session-title">{q.title}</p>
                    <p className="admin-detail__session-meta">
                      {new Date(q.date).toLocaleDateString()} · {q.correctCount}/
                      {q.totalQuestions} correct · +{q.xpAwarded} XP
                    </p>
                  </div>
                  <span className="admin-detail__session-accuracy">{q.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminStudentDetail;

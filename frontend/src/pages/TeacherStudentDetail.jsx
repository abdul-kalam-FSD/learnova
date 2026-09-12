import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import Modal from "../components/Modal";
import "../Teacher.css";

function TeacherStudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Assign-to-this-student flow (Section 26): { conceptId, conceptTitle }
  // while the modal is open, plus a small per-concept "✓ Assigned" flag
  // so a teacher assigning several concepts in a row gets feedback on
  // each one without leaving the page.
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignNote, setAssignNote] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [justAssigned, setJustAssigned] = useState({});

  const openAssign = (conceptId, conceptTitle) => {
    setAssignTarget({ conceptId, conceptTitle });
    setAssignNote("");
    setAssignDueDate("");
    setAssignError("");
  };
  const closeAssign = () => {
    if (assignSaving) return;
    setAssignTarget(null);
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    if (!assignTarget) return;
    setAssignSaving(true);
    setAssignError("");
    try {
      await api.post("/assignments", {
        conceptId: assignTarget.conceptId,
        studentIds: [id],
        note: assignNote,
        dueDate: assignDueDate || undefined,
      });
      setJustAssigned((prev) => ({ ...prev, [assignTarget.conceptId]: true }));
      setAssignTarget(null);
    } catch (err) {
      setAssignError(err.response?.data?.message || err.message);
    } finally {
      setAssignSaving(false);
    }
  };

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
      .get(`/teacher/students/${id}`)
      .then((res) => setStudent(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="teacher-page p-4">
      <button className="teacher-detail__back mb-3" onClick={() => navigate("/teacher/students")}>
        ← Back to Students
      </button>

      {loading && <PageLoading label="Loading student..." />}
      {error && <p className="teacher-page__error">{error}</p>}

      {!loading && !error && student && (
        <>
          <div className="teacher-detail__header flex items-center gap-3 p-4 mb-4">
            <div className="teacher-detail__avatar">{student.name.charAt(0).toUpperCase()}</div>
            <div>
              <p className="teacher-detail__name">{student.name}</p>
              <p className="teacher-detail__email">{student.email}</p>
              <p className="teacher-detail__meta">
                Grade {student.grade} · Joined {new Date(student.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="teacher-detail__stats-grid mb-5">
            <div className="teacher-detail__stat-card">
              <p className="teacher-detail__stat-value">{student.xpTotal}</p>
              <p className="teacher-detail__stat-label">Total XP</p>
            </div>
            <div className="teacher-detail__stat-card">
              <p className="teacher-detail__stat-value">{student.quizzesPlayed}</p>
              <p className="teacher-detail__stat-label">Sessions Played</p>
            </div>
            <div className="teacher-detail__stat-card">
              <p className="teacher-detail__stat-value">{student.accuracy}%</p>
              <p className="teacher-detail__stat-label">Accuracy</p>
            </div>
            <div className="teacher-detail__stat-card">
              <p className="teacher-detail__stat-value">{student.gamesPlayed.length}</p>
              <p className="teacher-detail__stat-label">Games Played</p>
            </div>
          </div>

          <p className="teacher-detail__section-title mb-2">Mastery by Subject</p>

          {student.subjects.length === 0 ? (
            <EmptyState
              icon="📚"
              title="No content for this grade yet"
              subtitle="Nothing to show mastery for until content exists for this student's grade."
            />
          ) : (
            <div className="flex flex-col gap-2 mb-5">
              {student.subjects.map((subject) => (
                <div key={subject.subject_id} className="teacher-detail__subject-block">
                  <p className="teacher-detail__subject-title">{subject.name}</p>
                  {subject.chapters.map((chapter) => (
                    <div key={chapter.chapter_id}>
                      <p className="teacher-detail__chapter-title">{chapter.title}</p>
                      {chapter.concepts.map((concept) => (
                        <div key={concept.concept_id} className="teacher-detail__concept-row">
                          <span>{concept.title}</span>
                          <div className="flex items-center gap-2">
                            <span className={`mastery-badge mastery-badge--${concept.mastery_state}`}>
                              {concept.mastery_state}
                            </span>
                            {justAssigned[concept.concept_id] ? (
                              <span className="teacher-detail__assign-done">✓ Assigned</span>
                            ) : (
                              <button
                                type="button"
                                className="teacher-detail__assign-btn"
                                onClick={() => openAssign(concept.concept_id, concept.title)}
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <p className="teacher-detail__section-title mb-2">Recent Performance</p>

          {student.recentPerformance.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No sessions yet"
              subtitle="This student hasn't completed any quizzes, cases, or games."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {student.recentPerformance.map((q) => (
                <div
                  key={q.sessionId}
                  className="teacher-detail__session-row flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="teacher-detail__session-title">{q.title}</p>
                    <p className="teacher-detail__session-meta">
                      {new Date(q.date).toLocaleDateString()} · {q.correctCount}/{q.totalQuestions} correct
                      · +{q.xpAwarded} XP
                    </p>
                  </div>
                  <span className="teacher-detail__session-accuracy">{q.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {assignTarget && (
        <Modal title={`Assign "${assignTarget.conceptTitle}"`} onClose={closeAssign}>
          {assignError && <p className="admin-modal__error">{assignError}</p>}
          <form onSubmit={submitAssign}>
            <div className="admin-modal__field">
              <label className="admin-modal__label">
                Note for student (optional)
                <textarea
                  className="admin-modal__input"
                  rows={3}
                  placeholder="e.g. Focus on this before Friday's quiz"
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  maxLength={500}
                />
              </label>
            </div>
            <div className="admin-modal__field">
              <label className="admin-modal__label">
                Due date (optional)
                <input
                  className="admin-modal__input"
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                />
              </label>
            </div>
            <div className="admin-modal__actions">
              <button className="teacher-page__page-btn" type="button" onClick={closeAssign} disabled={assignSaving}>
                Cancel
              </button>
              <button className="btn-primary" type="submit" disabled={assignSaving}>
                {assignSaving ? "Assigning..." : "Assign Mission"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default TeacherStudentDetail;

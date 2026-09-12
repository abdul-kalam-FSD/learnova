import { useEffect, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import Modal from "../components/Modal";
import TeacherTabs from "../components/TeacherTabs";
import "../Teacher.css";

// Inline expand-to-roster rather than a separate route: an
// assignment's roster is small (one student to one section's worth)
// and teachers mainly want to scan "who's done / who isn't" without
// leaving the list, unlike TeacherStudentDetail which is a full page
// of its own because a student has a lot more to show.
function AssignmentRoster({ assignmentId }) {
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/assignments/teacher/${assignmentId}`)
      .then((res) => setRoster(res.data.roster))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [assignmentId]);

  if (error) return <p className="teacher-page__error">{error}</p>;
  if (!roster) return <p className="teacher-page__loading">Loading roster...</p>;

  return (
    <div className="mt-2">
      {roster.map((s) => (
        <div key={s.studentId} className="teacher-assignments__roster-row">
          <span>{s.name}</span>
          <span
            className={`teacher-assignments__progress-pill${
              s.status === "completed" ? " teacher-assignments__progress-pill--done" : ""
            }`}
          >
            {s.status === "completed" ? "✓ Completed" : "Pending"}
          </span>
        </div>
      ))}
    </div>
  );
}

// New Assignment flow (Section 26 follow-up): assign a concept to an
// entire section at once, rather than one student at a time. Section
// -> grade is fixed by the section itself, so Subject/Chapter/Concept
// cascade from whichever section is picked first.
function NewAssignmentModal({ onClose, onCreated }) {
  const [sections, setSections] = useState(null);
  const [sectionsError, setSectionsError] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [tree, setTree] = useState(null);
  const [treeError, setTreeError] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [conceptId, setConceptId] = useState("");

  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    api
      .get("/teacher/sections")
      .then((res) => setSections(res.data.sections))
      .catch((err) => setSectionsError(err.response?.data?.message || err.message));
  }, []);

  useEffect(() => {
    // Same react.dev "fetching data in an Effect" pattern as the rest
    // of this codebase (see TeacherStudentDetail.jsx) — resetting the
    // dependent selects here avoids showing a stale chapter/concept
    // from the previously selected section while the new grade's
    // content tree loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubjectId("");
    setChapterId("");
    setConceptId("");
    setTree(null);
    if (!sectionId) return;
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    api
      .get("/teacher/content-tree", { params: { grade: section.grade } })
      .then((res) => setTree(res.data.subjects))
      .catch((err) => setTreeError(err.response?.data?.message || err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const subject = tree?.find((s) => s.id === subjectId);
  const chapter = subject?.chapters.find((c) => c.id === chapterId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sectionId || !conceptId) return;
    setSaving(true);
    setSubmitError("");
    try {
      await api.post("/assignments", {
        conceptId,
        sectionId,
        note,
        dueDate: dueDate || undefined,
      });
      onCreated();
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Assignment" onClose={onClose}>
      {sectionsError && <p className="admin-modal__error">{sectionsError}</p>}
      {submitError && <p className="admin-modal__error">{submitError}</p>}

      {sections && sections.length === 0 ? (
        <EmptyState
          icon="🏫"
          title="No sections yet"
          subtitle="Ask an admin to create a section and add your students to it before assigning to a whole class."
        />
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Class / Section
              <select
                className="admin-modal__input"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!sections}
              >
                <option value="">{sections ? "Choose a section..." : "Loading..."}</option>
                {sections?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · Grade {s.grade} · {s.studentCount} student{s.studentCount === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {sectionId && (
            <>
              {treeError && <p className="admin-modal__error">{treeError}</p>}
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Subject
                  <select
                    className="admin-modal__input"
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value);
                      setChapterId("");
                      setConceptId("");
                    }}
                    disabled={!tree}
                  >
                    <option value="">{tree ? "Choose a subject..." : "Loading..."}</option>
                    {tree?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {subject && (
                <div className="admin-modal__field">
                  <label className="admin-modal__label">
                    Chapter
                    <select
                      className="admin-modal__input"
                      value={chapterId}
                      onChange={(e) => {
                        setChapterId(e.target.value);
                        setConceptId("");
                      }}
                    >
                      <option value="">Choose a chapter...</option>
                      {subject.chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {chapter && (
                <div className="admin-modal__field">
                  <label className="admin-modal__label">
                    Concept
                    <select
                      className="admin-modal__input"
                      value={conceptId}
                      onChange={(e) => setConceptId(e.target.value)}
                    >
                      <option value="">Choose a concept...</option>
                      {chapter.concepts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </>
          )}

          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Note for students (optional)
              <textarea
                className="admin-modal__input"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>

          <div className="admin-modal__actions">
            <button className="teacher-page__page-btn" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" type="submit" disabled={saving || !sectionId || !conceptId}>
              {saving ? "Assigning..." : "Assign to Class"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function TeacherAssignments() {
  const [assignments, setAssignments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Separate from `error` above: that one gates the whole page (failed
  // to *load* the list). A failed *cancel* on one assignment shouldn't
  // hide every other assignment in the list — it should surface as an
  // inline message while the list stays exactly as it was.
  const [actionError, setActionError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    api
      .get("/assignments/teacher")
      .then((res) => setAssignments(res.data.assignments))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // react-hooks/set-state-in-effect flags this, but it's React's own
    // documented "fetching data in an Effect" pattern (react.dev's
    // Effects guide) — same convention every other teacher page here
    // already follows (see TeacherStudents.jsx, TeacherWeakAreas.jsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this assignment for every student on it?")) return;
    setCancellingId(id);
    setActionError("");
    try {
      await api.delete(`/assignments/${id}`);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setActionError(err.response?.data?.message || err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="teacher-page p-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="teacher-page__title">Assignments</h1>
        <button type="button" className="btn-primary" onClick={() => setShowNewModal(true)}>
          + New Assignment
        </button>
      </div>
      <p className="teacher-page__subtitle mb-4">
        {assignments ? `${assignments.length} assignment${assignments.length === 1 ? "" : "s"}` : "\u00A0"}
      </p>

      <TeacherTabs />

      {loading && <PageLoading label="Loading assignments..." />}
      {error && <p className="teacher-page__error">{error}</p>}
      {actionError && <p className="teacher-page__error">{actionError}</p>}

      {!loading && !error && assignments && assignments.length === 0 && (
        <EmptyState
          icon="📋"
          title="No missions assigned yet"
          subtitle="Open a student's profile and tap Assign next to any concept to send them a mission."
        />
      )}

      {!loading && !error && assignments && assignments.length > 0 && (
        <div className="flex flex-col gap-3">
          {assignments.map((a) => {
            const allDone = a.completedCount === a.studentCount;
            return (
              <div key={a.id} className="teacher-assignments__card">
                <div className="teacher-assignments__card-top">
                  <div>
                    <p className="teacher-assignments__concept">{a.conceptTitle}</p>
                    <p className="teacher-assignments__meta">
                      {[a.subject, a.chapterTitle].filter(Boolean).join(" · ")}
                      {a.sectionName ? ` · ${a.sectionName}` : ""}
                      {a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <span
                    className={`teacher-assignments__progress-pill${
                      allDone ? " teacher-assignments__progress-pill--done" : ""
                    }`}
                  >
                    {a.completedCount}/{a.studentCount} done
                  </span>
                </div>

                {a.note && <p className="teacher-assignments__note">“{a.note}”</p>}

                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    className="teacher-detail__assign-btn"
                    onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                  >
                    {expandedId === a.id ? "Hide roster" : "View roster"}
                  </button>
                  <button
                    type="button"
                    className="teacher-assignments__cancel"
                    onClick={() => handleCancel(a.id)}
                    disabled={cancellingId === a.id}
                  >
                    {cancellingId === a.id ? "Cancelling..." : "Cancel assignment"}
                  </button>
                </div>

                {expandedId === a.id && <AssignmentRoster assignmentId={a.id} />}
              </div>
            );
          })}
        </div>
      )}

      {showNewModal && (
        <NewAssignmentModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

export default TeacherAssignments;

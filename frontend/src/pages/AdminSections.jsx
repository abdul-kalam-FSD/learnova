import { useEffect, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import Modal from "../components/Modal";
import AdminTabs from "../components/AdminTabs";
import "../Admin.css";

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

function AdminSections() {
  // ---------- Section list ----------
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  // Teachers are fetched once, up front — every create/edit form needs
  // the same dropdown, and /admin/users?role=teacher is cheap (capped
  // at 100 by the backend's parsePagination, which comfortably covers
  // a school's teacher roster).
  const [teachers, setTeachers] = useState([]);
  const [teachersError, setTeachersError] = useState("");

  const loadSections = () => {
    setLoading(true);
    setError("");
    const params = {};
    if (gradeFilter) params.grade = gradeFilter;
    api
      .get("/admin/sections", { params })
      .then((res) => setSections(res.data.sections))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(loadSections, [gradeFilter]);

  useEffect(() => {
    api
      .get("/admin/users", { params: { role: "teacher", limit: 100 } })
      .then((res) => setTeachers(res.data.users))
      .catch((err) => setTeachersError(err.response?.data?.message || err.message));
  }, []);

  // ---------- Create / edit section modal ----------
  // Note: the backend only accepts { name, grade, teacher_id } on
  // create and { name, teacher_id } on update — grade is immutable
  // once a section exists (updateSection ignores it), so the edit
  // form deliberately shows grade as read-only rather than offering
  // a control that would silently do nothing.
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', item }
  const [form, setForm] = useState({ name: "", grade: GRADES[0], teacher_id: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setFormError("");
    setForm({ name: "", grade: GRADES[0], teacher_id: teachers[0]?.id || "" });
    setModal({ mode: "create" });
  };

  const openEdit = (section) => {
    setFormError("");
    setForm({ name: section.name, grade: section.grade, teacher_id: section.teacher_id?._id || "" });
    setModal({ mode: "edit", item: section });
  };

  const closeModal = () => {
    setModal(null);
    setFormError("");
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!form.teacher_id) {
      setFormError("A teacher must be assigned");
      return;
    }
    setSaving(true);
    setFormError("");

    const request =
      modal.mode === "create"
        ? api.post("/admin/sections", {
            name: form.name,
            grade: form.grade,
            teacher_id: form.teacher_id,
          })
        : api.patch(`/admin/sections/${modal.item._id}`, {
            name: form.name,
            teacher_id: form.teacher_id,
          });

    request
      .then(() => {
        closeModal();
        loadSections();
      })
      .catch((err) => setFormError(err.response?.data?.message || err.message))
      .finally(() => setSaving(false));
  };

  const handleDelete = (section) => {
    if (
      !window.confirm(
        `Delete "${section.name}"? Students in it will be unassigned. This cannot be undone.`,
      )
    )
      return;

    setBanner("");
    api
      .delete(`/admin/sections/${section._id}`)
      .then(loadSections)
      .catch((err) => setBanner(err.response?.data?.message || err.message));
  };

  // ---------- Roster modal (add/remove students on one section) ----------
  const [rosterSection, setRosterSection] = useState(null);
  const [rosterCandidates, setRosterCandidates] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterSearchInput, setRosterSearchInput] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterBusyId, setRosterBusyId] = useState(null);
  const [rosterActionError, setRosterActionError] = useState("");

  const openRoster = (section) => {
    setRosterSection(section);
    setRosterSearchInput("");
    setRosterSearch("");
    setRosterActionError("");
  };
  const closeRoster = () => {
    setRosterSection(null);
    setRosterCandidates([]);
  };

  // Debounce roster search the same way AdminStaff debounces its user
  // search, so we're not firing a request on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setRosterSearch(rosterSearchInput), 350);
    return () => clearTimeout(handle);
  }, [rosterSearchInput]);

  // Candidates are students of the section's own grade — the backend
  // rejects a grade mismatch anyway (400), so filtering here up front
  // means the admin never sees a pickable option that would just fail.
  useEffect(() => {
    if (!rosterSection) return;
    // react-hooks/set-state-in-effect flags this, but it's React's own
    // documented "fetching data in an Effect" pattern (react.dev's
    // Effects guide) — same convention every other admin/teacher page
    // here already follows (see TeacherAssignments.jsx, TeacherStudents.jsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRosterLoading(true);
    setRosterError("");
    const params = { role: "student", grade: rosterSection.grade, limit: 100 };
    if (rosterSearch) params.search = rosterSearch;
    api
      .get("/admin/users", { params })
      .then((res) => setRosterCandidates(res.data.users))
      .catch((err) => setRosterError(err.response?.data?.message || err.message))
      .finally(() => setRosterLoading(false));
  }, [rosterSection, rosterSearch]);

  const currentStudentIds = new Set((rosterSection?.student_ids || []).map((s) => s._id));

  const refreshRosterSection = (updatedSection) => {
    setRosterSection(updatedSection);
    setSections((prev) => prev.map((s) => (s._id === updatedSection._id ? updatedSection : s)));
  };

  const handleAddStudent = (studentId) => {
    setRosterBusyId(studentId);
    setRosterActionError("");
    api
      .post(`/admin/sections/${rosterSection._id}/students`, { studentId })
      .then((res) => refreshRosterSection(res.data.section))
      .catch((err) => setRosterActionError(err.response?.data?.message || err.message))
      .finally(() => setRosterBusyId(null));
  };

  const handleRemoveStudent = (studentId) => {
    setRosterBusyId(studentId);
    setRosterActionError("");
    api
      .delete(`/admin/sections/${rosterSection._id}/students/${studentId}`)
      .then((res) => refreshRosterSection(res.data.section))
      .catch((err) => setRosterActionError(err.response?.data?.message || err.message))
      .finally(() => setRosterBusyId(null));
  };

  return (
    <div className="admin-page p-4">
      <h1 className="admin-page__title mb-1">Manage Sections</h1>
      <p className="admin-page__subtitle mb-4">
        {sections.length} section{sections.length === 1 ? "" : "s"}
      </p>

      <AdminTabs />

      <div className="admin-page__toolbar mb-4">
        <select
          className="admin-page__select"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
        >
          <option value="">All grades</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        <button className="admin-page__add-btn" onClick={openCreate} disabled={!teachers.length}>
          + Add Section
        </button>
      </div>

      {teachersError && <p className="admin-page__error mb-3">{teachersError}</p>}
      {!teachersError && !teachers.length && (
        <p className="admin-page__subtitle mb-3">
          No teacher accounts exist yet — create one under Staff before adding a section.
        </p>
      )}
      {banner && <p className="admin-modal__error mb-3">{banner}</p>}
      {loading && <PageLoading label="Loading sections..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && sections.length === 0 && (
        <EmptyState
          icon="🏫"
          title="No sections yet"
          subtitle="Create a section to start scoping a teacher's dashboard to their own students."
        />
      )}

      {!loading && !error && sections.length > 0 && (
        <div className="admin-table__wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-table__head-cell">Name</th>
                <th className="admin-table__head-cell">Grade</th>
                <th className="admin-table__head-cell">Teacher</th>
                <th className="admin-table__head-cell">Students</th>
                <th className="admin-table__head-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s._id} className="admin-table__row">
                  <td className="admin-table__cell">{s.name}</td>
                  <td className="admin-table__cell">{s.grade}</td>
                  <td className="admin-table__cell">{s.teacher_id?.name || "—"}</td>
                  <td className="admin-table__cell">{s.student_ids?.length || 0}</td>
                  <td className="admin-table__cell">
                    <div className="content-row__actions">
                      <button
                        className="content-row__action-btn"
                        onClick={() => openRoster(s)}
                        aria-label="Manage roster"
                      >
                        👥
                      </button>
                      <button
                        className="content-row__action-btn"
                        onClick={() => openEdit(s)}
                        aria-label="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="content-row__action-btn"
                        onClick={() => handleDelete(s)}
                        aria-label="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === "create" ? "Add Section" : "Edit Section"} onClose={closeModal}>
          {formError && <p className="admin-modal__error">{formError}</p>}

          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Name
              <input
                className="admin-modal__input"
                placeholder="e.g. Grade 6 - A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
          </div>

          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Grade
              {modal.mode === "create" ? (
                <select
                  className="admin-modal__input"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              ) : (
                // Backend never updates grade on PATCH, so this is shown
                // read-only rather than as a control that would silently
                // do nothing if changed. To move a section to a different
                // grade, delete and recreate it.
                <input className="admin-modal__input" value={`Grade ${form.grade}`} disabled />
              )}
            </label>
          </div>

          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Teacher
              <select
                className="admin-modal__input"
                value={form.teacher_id}
                onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-modal__actions">
            <button className="admin-page__page-btn" onClick={closeModal} type="button">
              Cancel
            </button>
            <button
              className={`admin-page__export-btn${saving ? " admin-page__export-btn--disabled" : ""}`}
              onClick={handleSave}
              disabled={saving}
              type="button"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {rosterSection && (
        <Modal title={`${rosterSection.name} — Roster`} onClose={closeRoster}>
          {rosterActionError && <p className="admin-modal__error">{rosterActionError}</p>}

          <p className="admin-page__subtitle mb-2">
            {rosterSection.student_ids?.length || 0} student
            {(rosterSection.student_ids?.length || 0) === 1 ? "" : "s"} in this section
          </p>

          {rosterSection.student_ids?.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {rosterSection.student_ids.map((student) => (
                <div key={student._id} className="content-row">
                  <div className="content-row__main">
                    <p className="content-row__title">{student.name}</p>
                    <p className="content-row__meta">{student.email}</p>
                  </div>
                  <div className="content-row__actions">
                    <button
                      className="content-row__action-btn"
                      onClick={() => handleRemoveStudent(student._id)}
                      disabled={rosterBusyId === student._id}
                      aria-label="Remove from section"
                    >
                      {rosterBusyId === student._id ? "…" : "✕"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Add a Grade {rosterSection.grade} student
              <input
                className="admin-modal__input"
                type="text"
                placeholder="Search by name or email"
                aria-label="Search students to add to this section"
                value={rosterSearchInput}
                onChange={(e) => setRosterSearchInput(e.target.value)}
              />
            </label>
          </div>

          {rosterLoading && <p className="admin-page__loading">Loading students...</p>}
          {rosterError && <p className="admin-page__error">{rosterError}</p>}

          {!rosterLoading && !rosterError && (
            <div className="flex flex-col gap-2">
              {rosterCandidates
                .filter((student) => !currentStudentIds.has(student.id))
                .map((student) => (
                  <div key={student.id} className="content-row">
                    <div className="content-row__main">
                      <p className="content-row__title">{student.name}</p>
                      <p className="content-row__meta">{student.email}</p>
                    </div>
                    <div className="content-row__actions">
                      <button
                        className="content-row__action-btn"
                        onClick={() => handleAddStudent(student.id)}
                        disabled={rosterBusyId === student.id}
                        aria-label="Add to section"
                      >
                        {rosterBusyId === student.id ? "…" : "+"}
                      </button>
                    </div>
                  </div>
                ))}
              {rosterCandidates.filter((student) => !currentStudentIds.has(student.id)).length === 0 && (
                <p className="admin-page__subtitle">
                  {rosterSearch ? "No matching students." : `No unassigned Grade ${rosterSection.grade} students found.`}
                </p>
              )}
            </div>
          )}

          <div className="admin-modal__actions">
            <button className="admin-page__page-btn" onClick={closeRoster} type="button">
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminSections;

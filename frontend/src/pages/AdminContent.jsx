import { useEffect, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import Modal from "../components/Modal";
import AdminTabs from "../components/AdminTabs";
import "../Admin.css";

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const DIFFICULTIES = ["easy", "medium", "hard"];

function emptyQuestionForm() {
  return {
    question_text: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
    ],
    correct_option_id: "a",
    explanation_text: "",
    fun_fact: "",
    difficulty: "medium",
  };
}

function AdminContent() {
  const [level, setLevel] = useState("subjects");
  const [subject, setSubject] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [concept, setConcept] = useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', item }
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    let request;
    if (level === "subjects") request = api.get("/admin/subjects");
    else if (level === "chapters")
      request = api.get("/admin/chapters", { params: { subject_id: subject.id } });
    else if (level === "concepts")
      request = api.get("/admin/concepts", { params: { chapter_id: chapter.id } });
    else request = api.get("/admin/questions", { params: { concept_id: concept.id } });

    request
      .then((res) => {
        const list =
          res.data.subjects || res.data.chapters || res.data.concepts || res.data.questions;
        setItems(list.map((i) => ({ ...i, id: i._id || i.id })));
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  // react-hooks/set-state-in-effect flags this, but it's React's own
  // documented "fetching data in an Effect" pattern (react.dev's Effects
  // guide): `load` resets loading/error before fetching so the UI shows
  // a fresh loading state immediately when a dependency changes, instead
  // of stale data while the new request is in flight.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [level, subject, chapter, concept]);

  const goToSubjects = () => {
    setLevel("subjects");
    setSubject(null);
    setChapter(null);
    setConcept(null);
  };
  const goToChapters = (s) => {
    setLevel("chapters");
    setSubject(s);
    setChapter(null);
    setConcept(null);
  };
  const goToConcepts = (c) => {
    setLevel("concepts");
    setChapter(c);
    setConcept(null);
  };
  const goToQuestions = (c) => {
    setLevel("questions");
    setConcept(c);
  };

  const openCreate = () => {
    setFormError("");
    if (level === "subjects") setForm({ name: "", grade: 9 });
    else if (level === "chapters") setForm({ unit_name: "", title: "", order_index: 1 });
    else if (level === "concepts") setForm({ title: "", explanation_text: "" });
    else setForm(emptyQuestionForm());
    setModal({ mode: "create" });
  };

  const openEdit = (item) => {
    setFormError("");
    if (level === "questions") {
      setForm({
        question_text: item.question_text,
        options: item.options,
        correct_option_id: item.correct_option_id,
        explanation_text: item.explanation_text || "",
        fun_fact: item.fun_fact || "",
        difficulty: item.difficulty || "medium",
      });
    } else {
      setForm({ ...item });
    }
    setModal({ mode: "edit", item });
  };

  const closeModal = () => {
    setModal(null);
    setFormError("");
  };

  const handleDelete = (item) => {
    const label = item.name || item.title || item.question_text?.slice(0, 40) || "this item";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;

    const endpoint =
      level === "subjects"
        ? `/admin/subjects/${item.id}`
        : level === "chapters"
          ? `/admin/chapters/${item.id}`
          : level === "concepts"
            ? `/admin/concepts/${item.id}`
            : `/admin/questions/${item.id}`;

    api
      .delete(endpoint)
      .then(() => {
        setBanner("");
        load();
      })
      .catch((err) => setBanner(err.response?.data?.message || err.message));
  };

  const handleSave = () => {
    setSaving(true);
    setFormError("");

    let payload = form;
    let createEndpoint, updateEndpoint;

    if (level === "subjects") {
      createEndpoint = "/admin/subjects";
      updateEndpoint = `/admin/subjects/${modal.item?.id}`;
    } else if (level === "chapters") {
      payload = { ...form, subject_id: subject.id };
      createEndpoint = "/admin/chapters";
      updateEndpoint = `/admin/chapters/${modal.item?.id}`;
    } else if (level === "concepts") {
      payload = { ...form, chapter_id: chapter.id };
      createEndpoint = "/admin/concepts";
      updateEndpoint = `/admin/concepts/${modal.item?.id}`;
    } else {
      payload = { ...form, concept_id: concept.id };
      createEndpoint = "/admin/questions";
      updateEndpoint = `/admin/questions/${modal.item?.id}`;
    }

    const request =
      modal.mode === "create"
        ? api.post(createEndpoint, payload)
        : api.patch(updateEndpoint, payload);

    request
      .then(() => {
        closeModal();
        load();
      })
      .catch((err) => setFormError(err.response?.data?.message || err.message))
      .finally(() => setSaving(false));
  };

  // ---------- Question option helpers ----------
  const nextOptionId = () => {
    const used = new Set((form.options || []).map((o) => o.id));
    for (const c of "abcdefgh") if (!used.has(c)) return c;
    return `opt${(form.options || []).length}`;
  };
  const addOption = () =>
    setForm((f) => ({ ...f, options: [...f.options, { id: nextOptionId(), text: "" }] }));
  const removeOption = (id) =>
    setForm((f) => {
      const remaining = f.options.filter((o) => o.id !== id);
      return {
        ...f,
        options: remaining,
        // Falls back to the *filtered* array's first option, not the
        // pre-filter one — using f.options[0] here would, when the
        // correct option happened to be first, reselect the very id
        // just removed (it was f.options[0] before filtering), leaving
        // correct_option_id pointing at an option that no longer exists.
        correct_option_id: f.correct_option_id === id ? remaining[0]?.id : f.correct_option_id,
      };
    });
  const updateOptionText = (id, text) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o) => (o.id === id ? { ...o, text } : o)),
    }));

  const titleForLevel = {
    subjects: "Subjects",
    chapters: subject ? `${subject.name} — Chapters` : "Chapters",
    concepts: chapter ? `${chapter.title} — Concepts` : "Concepts",
    questions: concept ? `${concept.title} — Questions` : "Questions",
  }[level];

  return (
    <div className="admin-page p-4">
      <AdminTabs />

      <div className="admin-page__breadcrumbs mb-2">
        <button className="admin-page__breadcrumb-link" onClick={goToSubjects}>
          Subjects
        </button>
        {subject && (
          <>
            {" / "}
            <button className="admin-page__breadcrumb-link" onClick={() => goToChapters(subject)}>
              {subject.name}
            </button>
          </>
        )}
        {chapter && (
          <>
            {" / "}
            <button className="admin-page__breadcrumb-link" onClick={() => goToConcepts(chapter)}>
              {chapter.title}
            </button>
          </>
        )}
        {concept && (
          <>
            {" / "}
            <span className="admin-page__breadcrumb-current">{concept.title}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="admin-page__title">{titleForLevel}</h1>
        <button className="admin-page__add-btn" onClick={openCreate}>
          + Add
        </button>
      </div>

      {banner && <p className="admin-modal__error mb-3">{banner}</p>}
      {loading && <PageLoading label="Loading..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon="📚"
          title="Nothing here yet"
          subtitle="Add the first one to get started."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="content-row">
              <button
                className="content-row__main"
                onClick={() => {
                  if (level === "subjects") goToChapters(item);
                  else if (level === "chapters") goToConcepts(item);
                  else if (level === "concepts") goToQuestions(item);
                }}
                disabled={level === "questions"}
              >
                <p className="content-row__title">
                  {item.name || item.title || item.question_text}
                </p>
                <p className="content-row__meta">
                  {level === "subjects" && `Grade ${item.grade}`}
                  {level === "chapters" &&
                    `${item.unit_name ? item.unit_name + " · " : ""}Order ${item.order_index}`}
                  {level === "concepts" && item.explanation_text?.slice(0, 60)}
                  {level === "questions" &&
                    // Optional chaining matters here, not just for polish: when
                    // navigating between levels, there's a render frame where
                    // `items` still holds the previous level's data (e.g.
                    // concepts, which have no `options`) while `level` has
                    // already flipped to "questions" — before the effect's
                    // fetch for the new level resolves. Without the `?.` that
                    // frame throws and takes down the whole page.
                    `${item.options?.length ?? 0} options · ${item.difficulty || "medium"}`}
                </p>
              </button>
              <div className="content-row__actions">
                <button
                  className="content-row__action-btn"
                  onClick={() => openEdit(item)}
                  aria-label="Edit"
                >
                  ✏️
                </button>
                <button
                  className="content-row__action-btn"
                  onClick={() => handleDelete(item)}
                  aria-label="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={`${modal.mode === "create" ? "Add" : "Edit"} ${level.slice(0, -1)}`}
          onClose={closeModal}
        >
          {formError && <p className="admin-modal__error">{formError}</p>}

          {level === "subjects" && (
            <>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Name
                  <input
                    className="admin-modal__input"
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Grade
                  <select
                    className="admin-modal__input"
                    value={form.grade || 9}
                    onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          {level === "chapters" && (
            <>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Unit Name (optional)
                  <input
                    className="admin-modal__input"
                    value={form.unit_name || ""}
                    onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
                  />
                </label>
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Title
                  <input
                    className="admin-modal__input"
                    value={form.title || ""}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </label>
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Order Index
                  <input
                    className="admin-modal__input"
                    type="number"
                    value={form.order_index ?? 1}
                    onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
                  />
                </label>
              </div>
            </>
          )}

          {level === "concepts" && (
            <>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Title
                  <input
                    className="admin-modal__input"
                    value={form.title || ""}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </label>
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Explanation
                  <textarea
                    className="admin-modal__input"
                    rows={4}
                    value={form.explanation_text || ""}
                    onChange={(e) => setForm({ ...form, explanation_text: e.target.value })}
                  />
                </label>
              </div>
            </>
          )}

          {level === "questions" && (
            <>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Question Text
                  <textarea
                    className="admin-modal__input"
                    rows={3}
                    value={form.question_text || ""}
                    onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                  />
                </label>
              </div>

              <fieldset className="admin-modal__field admin-modal__fieldset">
                <legend className="admin-modal__label">Options (select the correct one)</legend>
                {(form.options || []).map((o) => (
                  <div key={o.id} className="admin-modal__option-row">
                    <input
                      type="radio"
                      name="correct_option"
                      checked={form.correct_option_id === o.id}
                      onChange={() => setForm({ ...form, correct_option_id: o.id })}
                      aria-label={`Mark option ${o.id} as the correct answer`}
                    />
                    <input
                      className="admin-modal__input"
                      value={o.text}
                      onChange={(e) => updateOptionText(o.id, e.target.value)}
                      placeholder={`Option ${o.id}`}
                      aria-label={`Option ${o.id} text`}
                    />
                    {form.options.length > 2 && (
                      <button
                        className="admin-modal__remove-option"
                        onClick={() => removeOption(o.id)}
                        aria-label="Remove option"
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {form.options && form.options.length < 8 && (
                  <button className="admin-modal__add-option" onClick={addOption} type="button">
                    + Add option
                  </button>
                )}
              </fieldset>

              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Explanation (shown after answering)
                  <textarea
                    className="admin-modal__input"
                    rows={2}
                    value={form.explanation_text || ""}
                    onChange={(e) => setForm({ ...form, explanation_text: e.target.value })}
                  />
                </label>
              </div>

              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Fun Fact (optional)
                  <textarea
                    className="admin-modal__input"
                    rows={2}
                    value={form.fun_fact || ""}
                    onChange={(e) => setForm({ ...form, fun_fact: e.target.value })}
                  />
                </label>
              </div>

              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Difficulty
                  <select
                    className="admin-modal__input"
                    value={form.difficulty || "medium"}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

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
    </div>
  );
}

export default AdminContent;

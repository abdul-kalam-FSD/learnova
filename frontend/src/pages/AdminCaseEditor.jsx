import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import PageLoading from "../components/PageLoading";
import "../Admin.css";

function emptyForm() {
  return {
    title: "",
    intro_text: "",
    mission_text: "",
    clue_count: 3,
    dragdrop_task: { prompt: "", clue_text: "", items: [""] },
    matching_task: { prompt: "", clue_text: "", pairs: [{ structure: "", role: "" }] },
    theory_prompt: "",
    theory_options: [],
    experiment: {
      prompt: "",
      clue_text: "",
      variable_name: "",
      min: "",
      max: "",
      unit: "",
      threshold: "",
      good_outcome_text: "",
      bad_outcome_text: "",
    },
  };
}

function AdminCaseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState(emptyForm());
  const [selectedConcepts, setSelectedConcepts] = useState([]); // [{id, title}]
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [includeTheory, setIncludeTheory] = useState(false);
  const [includeExperiment, setIncludeExperiment] = useState(false);

  // ---------- Concept picker ----------
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [pickerSubject, setPickerSubject] = useState("");
  const [pickerChapter, setPickerChapter] = useState("");

  useEffect(() => {
    api.get("/admin/subjects").then((res) => setSubjects(res.data.subjects));
  }, []);

  useEffect(() => {
    if (!pickerSubject) {
      // Clearing the subject picker must clear its dependent chapter
      // list synchronously (not on the next fetch), or a stale chapter
      // from the previous subject stays selectable in the dropdown.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChapters([]);
      return;
    }
    api
      .get("/admin/chapters", { params: { subject_id: pickerSubject } })
      .then((res) => setChapters(res.data.chapters));
    setPickerChapter("");
  }, [pickerSubject]);

  useEffect(() => {
    if (!pickerChapter) {
      // Same reasoning as the subject picker above: clear stale
      // downstream concepts synchronously when the chapter is cleared.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConcepts([]);
      return;
    }
    api
      .get("/admin/concepts", { params: { chapter_id: pickerChapter } })
      .then((res) => setConcepts(res.data.concepts));
  }, [pickerChapter]);

  // ---------- Load existing case (edit mode) ----------
  useEffect(() => {
    if (isNew) return;
    // Reset to a loading state on mount for edit mode, matching the
    // documented React "fetch on mount/param change" Effect pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .get(`/admin/cases/${id}`)
      .then((res) => {
        const c = res.data.case;
        setForm({
          title: c.title,
          intro_text: c.intro_text,
          mission_text: c.mission_text || "",
          clue_count: c.clue_count,
          dragdrop_task: c.dragdrop_task?.items?.length
            ? c.dragdrop_task
            : { prompt: "", clue_text: "", items: [""] },
          matching_task: c.matching_task?.pairs?.length
            ? c.matching_task
            : { prompt: "", clue_text: "", pairs: [{ structure: "", role: "" }] },
          theory_prompt: c.theory_prompt || "",
          theory_options: c.theory_options || [],
          experiment: {
            prompt: c.experiment?.prompt || "",
            clue_text: c.experiment?.clue_text || "",
            variable_name: c.experiment?.variable_name || "",
            min: c.experiment?.min ?? "",
            max: c.experiment?.max ?? "",
            unit: c.experiment?.unit || "",
            threshold: c.experiment?.threshold ?? "",
            good_outcome_text: c.experiment?.good_outcome_text || "",
            bad_outcome_text: c.experiment?.bad_outcome_text || "",
          },
        });
        setSelectedConcepts(
          (c.concept_ids || []).map((concept) => ({ id: concept._id, title: concept.title })),
        );
        setIncludeTheory(!!c.theory_prompt);
        setIncludeExperiment(!!c.experiment?.variable_name);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // ---------- Concept selection ----------
  const addConcept = (concept) => {
    if (selectedConcepts.some((c) => c.id === concept._id)) return;
    setSelectedConcepts([...selectedConcepts, { id: concept._id, title: concept.title }]);
  };
  const removeConcept = (conceptId) =>
    setSelectedConcepts(selectedConcepts.filter((c) => c.id !== conceptId));

  // ---------- Drag & drop items ----------
  const updateDragItem = (i, value) => {
    const items = [...form.dragdrop_task.items];
    items[i] = value;
    setForm({ ...form, dragdrop_task: { ...form.dragdrop_task, items } });
  };
  const addDragItem = () =>
    setForm({
      ...form,
      dragdrop_task: { ...form.dragdrop_task, items: [...form.dragdrop_task.items, ""] },
    });
  const removeDragItem = (i) =>
    setForm({
      ...form,
      dragdrop_task: {
        ...form.dragdrop_task,
        items: form.dragdrop_task.items.filter((_, idx) => idx !== i),
      },
    });

  // ---------- Matching pairs ----------
  const updateMatchPair = (i, field, value) => {
    const pairs = [...form.matching_task.pairs];
    pairs[i] = { ...pairs[i], [field]: value };
    setForm({ ...form, matching_task: { ...form.matching_task, pairs } });
  };
  const addMatchPair = () =>
    setForm({
      ...form,
      matching_task: {
        ...form.matching_task,
        pairs: [...form.matching_task.pairs, { structure: "", role: "" }],
      },
    });
  const removeMatchPair = (i) =>
    setForm({
      ...form,
      matching_task: {
        ...form.matching_task,
        pairs: form.matching_task.pairs.filter((_, idx) => idx !== i),
      },
    });

  // ---------- Theory options ----------
  const updateTheoryOption = (i, field, value) => {
    const opts = [...form.theory_options];
    opts[i] = { ...opts[i], [field]: value };
    setForm({ ...form, theory_options: opts });
  };
  const addTheoryOption = () =>
    setForm({
      ...form,
      theory_options: [...form.theory_options, { text: "", correct: false, feedback: "" }],
    });
  const removeTheoryOption = (i) =>
    setForm({ ...form, theory_options: form.theory_options.filter((_, idx) => idx !== i) });
  const setCorrectTheoryOption = (i) =>
    setForm({
      ...form,
      theory_options: form.theory_options.map((o, idx) => ({ ...o, correct: idx === i })),
    });

  const handleSave = () => {
    setSaving(true);
    setError("");

    const payload = {
      title: form.title,
      intro_text: form.intro_text,
      ...(form.mission_text && { mission_text: form.mission_text }),
      concept_ids: selectedConcepts.map((c) => c.id),
      clue_count: Number(form.clue_count),
      dragdrop_task: {
        prompt: form.dragdrop_task.prompt,
        clue_text: form.dragdrop_task.clue_text,
        items: form.dragdrop_task.items.filter((i) => i.trim()),
      },
      matching_task: {
        prompt: form.matching_task.prompt,
        clue_text: form.matching_task.clue_text,
        pairs: form.matching_task.pairs.filter((p) => p.structure.trim() && p.role.trim()),
      },
      ...(includeTheory && {
        theory_prompt: form.theory_prompt,
        theory_options: form.theory_options,
      }),
      ...(includeExperiment && {
        experiment: {
          ...form.experiment,
          min: Number(form.experiment.min),
          max: Number(form.experiment.max),
          threshold: Number(form.experiment.threshold),
        },
      }),
    };

    const request = isNew
      ? api.post("/admin/cases", payload)
      : api.patch(`/admin/cases/${id}`, payload);

    request
      .then(() => navigate("/admin/cases"))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="admin-page p-4">
        <PageLoading label="Loading case..." />
      </div>
    );
  }

  return (
    <div className="admin-page p-4">
      <button className="admin-detail__back mb-3" onClick={() => navigate("/admin/cases")}>
        ← Back to Cases
      </button>

      <h1 className="admin-page__title mb-4">{isNew ? "New Case" : "Edit Case"}</h1>

      {error && <p className="admin-modal__error mb-3">{error}</p>}

      <div className="admin-modal__field">
        <label className="admin-modal__label">
          Title
          <input
            className="admin-modal__input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
      </div>

      <div className="admin-modal__field">
        <label className="admin-modal__label">
          Intro Text
          <textarea
            className="admin-modal__input"
            rows={3}
            value={form.intro_text}
            onChange={(e) => setForm({ ...form, intro_text: e.target.value })}
          />
        </label>
      </div>

      <div className="admin-modal__field">
        <label className="admin-modal__label">
          Mission Text (optional — has a default if left blank)
          <textarea
            className="admin-modal__input"
            rows={2}
            value={form.mission_text}
            onChange={(e) => setForm({ ...form, mission_text: e.target.value })}
          />
        </label>
      </div>

      <div className="admin-modal__field">
        <label className="admin-modal__label">
          Number of Clues (questions)
          <input
            className="admin-modal__input"
            type="number"
            min={1}
            value={form.clue_count}
            onChange={(e) => setForm({ ...form, clue_count: e.target.value })}
          />
        </label>
      </div>

      {/* ---------- Concepts ---------- */}
      <div className="admin-modal__field">
        <p className="admin-modal__label">Concepts covered by this case</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedConcepts.map((c) => (
            <span key={c.id} className="role-badge role-badge--teacher">
              {c.title}{" "}
              <button
                type="button"
                onClick={() => removeConcept(c.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
              >
                ✕
              </button>
            </span>
          ))}
          {selectedConcepts.length === 0 && (
            <span className="admin-page__subtitle">No concepts selected yet</span>
          )}
        </div>
        <div className="admin-page__toolbar mb-2">
          <select
            className="admin-page__select"
            value={pickerSubject}
            onChange={(e) => setPickerSubject(e.target.value)}
          >
            <option value="">Choose a subject...</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} (Grade {s.grade})
              </option>
            ))}
          </select>
          <select
            className="admin-page__select"
            value={pickerChapter}
            onChange={(e) => setPickerChapter(e.target.value)}
            disabled={!pickerSubject}
          >
            <option value="">Choose a chapter...</option>
            {chapters.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        {concepts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {concepts.map((c) => (
              <button
                key={c._id}
                type="button"
                className="admin-page__page-btn"
                onClick={() => addConcept(c)}
                disabled={selectedConcepts.some((sc) => sc.id === c._id)}
              >
                + {c.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Drag & Drop task ---------- */}
      <p className="admin-detail__section-title mt-5 mb-2">Drag &amp; Drop Task (required)</p>
      <div className="admin-modal__field">
        <label className="admin-modal__label">
          Prompt
          <input
            className="admin-modal__input"
            value={form.dragdrop_task.prompt}
            onChange={(e) =>
              setForm({ ...form, dragdrop_task: { ...form.dragdrop_task, prompt: e.target.value } })
            }
          />
        </label>
      </div>
      <div className="admin-modal__field">
        <label className="admin-modal__label">
          Clue Text
          <input
            className="admin-modal__input"
            value={form.dragdrop_task.clue_text}
            onChange={(e) =>
              setForm({
                ...form,
                dragdrop_task: { ...form.dragdrop_task, clue_text: e.target.value },
              })
            }
          />
        </label>
      </div>
      <fieldset className="admin-modal__field admin-modal__fieldset">
        <legend className="admin-modal__label">Items to Order</legend>
        {form.dragdrop_task.items.map((item, i) => (
          <div key={i} className="admin-modal__option-row">
            <input
              className="admin-modal__input"
              value={item}
              onChange={(e) => updateDragItem(i, e.target.value)}
              placeholder={`Item ${i + 1}`}
              aria-label={`Item ${i + 1} text`}
            />
            {form.dragdrop_task.items.length > 1 && (
              <button
                type="button"
                className="admin-modal__remove-option"
                onClick={() => removeDragItem(i)}
                aria-label={`Remove item ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="admin-modal__add-option" onClick={addDragItem}>
          + Add item
        </button>
      </fieldset>

      {/* ---------- Matching task ---------- */}
      <p className="admin-detail__section-title mt-5 mb-2">Matching Task (required)</p>
      <div className="admin-modal__field">
        <label className="admin-modal__label">
          Prompt
          <input
            className="admin-modal__input"
            value={form.matching_task.prompt}
            onChange={(e) =>
              setForm({ ...form, matching_task: { ...form.matching_task, prompt: e.target.value } })
            }
          />
        </label>
      </div>
      <div className="admin-modal__field">
        <label className="admin-modal__label">
          Clue Text
          <input
            className="admin-modal__input"
            value={form.matching_task.clue_text}
            onChange={(e) =>
              setForm({
                ...form,
                matching_task: { ...form.matching_task, clue_text: e.target.value },
              })
            }
          />
        </label>
      </div>
      <fieldset className="admin-modal__field admin-modal__fieldset">
        <legend className="admin-modal__label">Structure ↔ Role Pairs</legend>
        {form.matching_task.pairs.map((pair, i) => (
          <div key={i} className="admin-modal__option-row">
            <input
              className="admin-modal__input"
              value={pair.structure}
              onChange={(e) => updateMatchPair(i, "structure", e.target.value)}
              placeholder="Structure"
              aria-label={`Pair ${i + 1} structure`}
            />
            <input
              className="admin-modal__input"
              value={pair.role}
              onChange={(e) => updateMatchPair(i, "role", e.target.value)}
              placeholder="Role"
              aria-label={`Pair ${i + 1} role`}
            />
            {form.matching_task.pairs.length > 1 && (
              <button
                type="button"
                className="admin-modal__remove-option"
                onClick={() => removeMatchPair(i)}
                aria-label={`Remove pair ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="admin-modal__add-option" onClick={addMatchPair}>
          + Add pair
        </button>
      </fieldset>

      {/* ---------- Theory step (optional) ---------- */}
      <div className="flex items-center gap-2 mt-5 mb-2">
        <input
          type="checkbox"
          checked={includeTheory}
          onChange={(e) => setIncludeTheory(e.target.checked)}
          id="include-theory"
        />
        <label htmlFor="include-theory" className="admin-detail__section-title">
          Include Theory step (optional)
        </label>
      </div>
      {includeTheory && (
        <>
          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Theory Prompt
              <textarea
                className="admin-modal__input"
                rows={2}
                value={form.theory_prompt}
                onChange={(e) => setForm({ ...form, theory_prompt: e.target.value })}
              />
            </label>
          </div>
          <fieldset className="admin-modal__field admin-modal__fieldset">
            <legend className="admin-modal__label">Options (select the correct one)</legend>
            {form.theory_options.map((opt, i) => (
              <div key={i} className="admin-modal__option-row">
                <input
                  type="radio"
                  name="theory_correct"
                  checked={!!opt.correct}
                  onChange={() => setCorrectTheoryOption(i)}
                  aria-label={`Mark option ${i + 1} as the correct answer`}
                />
                <input
                  className="admin-modal__input"
                  value={opt.text}
                  onChange={(e) => updateTheoryOption(i, "text", e.target.value)}
                  placeholder="Option text"
                  aria-label={`Option ${i + 1} text`}
                />
                <button
                  type="button"
                  className="admin-modal__remove-option"
                  onClick={() => removeTheoryOption(i)}
                  aria-label={`Remove option ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="admin-modal__add-option" onClick={addTheoryOption}>
              + Add option
            </button>
          </fieldset>
        </>
      )}

      {/* ---------- Experiment step (optional) ---------- */}
      <div className="flex items-center gap-2 mt-5 mb-2">
        <input
          type="checkbox"
          checked={includeExperiment}
          onChange={(e) => setIncludeExperiment(e.target.checked)}
          id="include-experiment"
        />
        <label htmlFor="include-experiment" className="admin-detail__section-title">
          Include Experiment step (optional)
        </label>
      </div>
      {includeExperiment && (
        <>
          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Prompt
              <input
                className="admin-modal__input"
                value={form.experiment.prompt}
                onChange={(e) =>
                  setForm({ ...form, experiment: { ...form.experiment, prompt: e.target.value } })
                }
              />
            </label>
          </div>
          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Variable Name
              <input
                className="admin-modal__input"
                value={form.experiment.variable_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    experiment: { ...form.experiment, variable_name: e.target.value },
                  })
                }
              />
            </label>
          </div>
          <div className="admin-page__toolbar mb-3">
            <input
              className="admin-modal__input"
              type="number"
              placeholder="Min"
              aria-label="Minimum value"
              value={form.experiment.min}
              onChange={(e) =>
                setForm({ ...form, experiment: { ...form.experiment, min: e.target.value } })
              }
            />
            <input
              className="admin-modal__input"
              type="number"
              placeholder="Max"
              aria-label="Maximum value"
              value={form.experiment.max}
              onChange={(e) =>
                setForm({ ...form, experiment: { ...form.experiment, max: e.target.value } })
              }
            />
            <input
              className="admin-modal__input"
              type="number"
              placeholder="Threshold"
              aria-label="Threshold value"
              value={form.experiment.threshold}
              onChange={(e) =>
                setForm({
                  ...form,
                  experiment: { ...form.experiment, threshold: e.target.value },
                })
              }
            />
            <input
              className="admin-modal__input"
              placeholder="Unit (e.g. °C)"
              aria-label="Unit"
              value={form.experiment.unit}
              onChange={(e) =>
                setForm({ ...form, experiment: { ...form.experiment, unit: e.target.value } })
              }
            />
          </div>
          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Good Outcome Text
              <textarea
                className="admin-modal__input"
                rows={2}
                value={form.experiment.good_outcome_text}
                onChange={(e) =>
                  setForm({
                    ...form,
                    experiment: { ...form.experiment, good_outcome_text: e.target.value },
                  })
                }
              />
            </label>
          </div>
          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Bad Outcome Text
              <textarea
                className="admin-modal__input"
                rows={2}
                value={form.experiment.bad_outcome_text}
                onChange={(e) =>
                  setForm({
                    ...form,
                    experiment: { ...form.experiment, bad_outcome_text: e.target.value },
                  })
                }
              />
            </label>
          </div>
        </>
      )}

      <div className="admin-modal__actions mt-4">
        <button className="admin-page__page-btn" onClick={() => navigate("/admin/cases")}>
          Cancel
        </button>
        <button
          className={`admin-page__export-btn${saving ? " admin-page__export-btn--disabled" : ""}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Case"}
        </button>
      </div>
    </div>
  );
}

export default AdminCaseEditor;

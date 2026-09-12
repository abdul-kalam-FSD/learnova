import { useEffect, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import Modal from "../components/Modal";
import AdminTabs from "../components/AdminTabs";
import { GAME_TYPES as GAME_TYPE_ENTRIES } from "../games/gameRegistry";
import "../Admin.css";

// GAME_TYPES now sourced from games/gameRegistry.js (single list shared
// with Home.jsx's catalog rendering and App.jsx's routes) instead of a
// copy kept here — was previously duplicated in three places.
const GAME_TYPES = GAME_TYPE_ENTRIES.map((g) => g.game_type);
const DIFFICULTIES = ["easy", "medium", "hard"];

function emptyForm() {
  return {
    game_type: GAME_TYPES[0],
    concept_id: "",
    title: "",
    difficulty: "medium",
    order_index: 1,
    payloadText: "{\n  \n}",
  };
}

function AdminGameContent() {
  const [gameTypeFilter, setGameTypeFilter] = useState(GAME_TYPES[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', item }
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    api
      .get("/admin/game-content", { params: { game_type: gameTypeFilter } })
      .then((res) => setItems(res.data.content.map((c) => ({ ...c, id: c._id }))))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  // react-hooks/set-state-in-effect flags this, but it's React's own
  // documented "fetching data in an Effect" pattern (react.dev's Effects
  // guide): `load` resets loading/error before fetching so the UI shows
  // a fresh loading state immediately when a dependency changes, instead
  // of stale data while the new request is in flight.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [gameTypeFilter]);

  const openCreate = () => {
    setFormError("");
    setForm({ ...emptyForm(), game_type: gameTypeFilter });
    setModal({ mode: "create" });
  };

  const openEdit = (item) => {
    setFormError("");
    setForm({
      game_type: item.game_type,
      concept_id: item.concept_id,
      title: item.title,
      difficulty: item.difficulty || "medium",
      order_index: item.order_index || 1,
      payloadText: JSON.stringify(item.payload, null, 2),
    });
    setModal({ mode: "edit", item });
  };

  const closeModal = () => {
    setModal(null);
    setFormError("");
  };

  const handleDelete = (item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    api
      .delete(`/admin/game-content/${item.id}`)
      .then(() => {
        setBanner("");
        load();
      })
      .catch((err) => setBanner(err.response?.data?.message || err.message));
  };

  const handleSave = () => {
    setFormError("");

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(form.payloadText);
    } catch {
      setFormError("Payload must be valid JSON — check for a missing comma or bracket.");
      return;
    }
    if (typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
      setFormError("Payload must be a JSON object, e.g. { \"target\": ... }.");
      return;
    }

    setSaving(true);
    const body = {
      title: form.title,
      difficulty: form.difficulty,
      order_index: Number(form.order_index) || 0,
      payload: parsedPayload,
      // game_type and concept_id only matter (and are only accepted
      // by the backend) on create — see updateGameContent's comment
      // on why those two aren't editable after the fact.
      ...(modal.mode === "create" && {
        game_type: form.game_type,
        concept_id: form.concept_id,
      }),
    };

    const request =
      modal.mode === "create"
        ? api.post("/admin/game-content", body)
        : api.patch(`/admin/game-content/${modal.item.id}`, body);

    request
      .then(() => {
        closeModal();
        load();
      })
      .catch((err) => setFormError(err.response?.data?.message || err.message))
      .finally(() => setSaving(false));
  };

  return (
    <div className="admin-page p-4">
      <AdminTabs />

      <div className="flex items-center justify-between mb-1">
        <h1 className="admin-page__title">Game Content</h1>
        <button className="admin-page__add-btn" onClick={openCreate}>
          + Add Challenge
        </button>
      </div>
      <p className="admin-page__subtitle mb-4">
        Non-quiz game mechanics (Fraction Builder, Circuit Builder, Timeline
        Builder, etc.) — previously seed-script only.
      </p>

      <div className="admin-modal__field mb-4">
        <label className="admin-modal__label">
          Game Type
          <select
            className="admin-modal__input"
            value={gameTypeFilter}
            onChange={(e) => setGameTypeFilter(e.target.value)}
          >
            {GAME_TYPES.map((gt) => (
              <option key={gt} value={gt}>
                {gt}
              </option>
            ))}
          </select>
        </label>
      </div>

      {banner && <p className="admin-modal__error mb-3">{banner}</p>}
      {loading && <PageLoading label="Loading challenges..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon="🎮"
          title="No challenges yet"
          subtitle={`No ${gameTypeFilter} content for this grade's concepts yet.`}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="content-row">
              <button className="content-row__main" onClick={() => openEdit(item)}>
                <p className="content-row__title">{item.title}</p>
                <p className="content-row__meta">
                  {item.difficulty} · order {item.order_index}
                </p>
              </button>
              <div className="content-row__actions">
                <button
                  className="content-row__delete"
                  onClick={() => handleDelete(item)}
                  aria-label={`Delete ${item.title}`}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === "create" ? "New Challenge" : "Edit Challenge"}
          onClose={closeModal}
        >
          {formError && <p className="admin-modal__error">{formError}</p>}

          {modal.mode === "create" && (
            <>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Game Type
                  <select
                    className="admin-modal__input"
                    value={form.game_type}
                    onChange={(e) => setForm({ ...form, game_type: e.target.value })}
                  >
                    {GAME_TYPES.map((gt) => (
                      <option key={gt} value={gt}>
                        {gt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">
                  Concept ID
                  <input
                    className="admin-modal__input"
                    value={form.concept_id}
                    onChange={(e) => setForm({ ...form, concept_id: e.target.value })}
                    placeholder="Paste the concept's _id from the Content tab"
                  />
                </label>
              </div>
            </>
          )}

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
              Difficulty
              <select
                className="admin-modal__input"
                value={form.difficulty}
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

          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Order Index
              <input
                className="admin-modal__input"
                type="number"
                value={form.order_index}
                onChange={(e) => setForm({ ...form, order_index: e.target.value })}
              />
            </label>
          </div>

          <div className="admin-modal__field">
            <label className="admin-modal__label">
              Payload (JSON — shape depends on game_type; see the matching
              seed*.js file for the exact fields this mechanic expects)
              <textarea
                className="admin-modal__input"
                rows={10}
                style={{ fontFamily: "monospace", fontSize: "12px" }}
                value={form.payloadText}
                onChange={(e) => setForm({ ...form, payloadText: e.target.value })}
              />
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
    </div>
  );
}

export default AdminGameContent;

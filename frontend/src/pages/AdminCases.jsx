import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import AdminTabs from "../components/AdminTabs";
import "../Admin.css";

function isComplete(c) {
  return (c.dragdrop_task?.items?.length || 0) > 0 && (c.matching_task?.pairs?.length || 0) > 0;
}

function AdminCases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api
      .get("/admin/cases")
      .then((res) => setCases(res.data.cases))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  // react-hooks/set-state-in-effect flags this, but it's React's own
  // documented "fetching data in an Effect" pattern (react.dev's Effects
  // guide): `load` resets loading/error before fetching so the UI shows
  // a fresh loading state immediately when a dependency changes, instead
  // of stale data while the new request is in flight.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, []);

  const handleDelete = (c) => {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    api
      .delete(`/admin/cases/${c._id}`)
      .then(() => {
        setBanner("");
        load();
      })
      .catch((err) => setBanner(err.response?.data?.message || err.message));
  };

  return (
    <div className="admin-page p-4">
      <AdminTabs />

      <div className="flex items-center justify-between mb-1">
        <h1 className="admin-page__title">Cases</h1>
        <button className="admin-page__add-btn" onClick={() => navigate("/admin/cases/new")}>
          + Add Case
        </button>
      </div>
      <p className="admin-page__subtitle mb-4">
        {cases.length} case{cases.length === 1 ? "" : "s"}
      </p>

      {banner && <p className="admin-modal__error mb-3">{banner}</p>}
      {loading && <PageLoading label="Loading cases..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && cases.length === 0 && (
        <EmptyState
          icon="🕵️"
          title="No cases yet"
          subtitle="Add your first Bio Detective case."
        />
      )}

      {!loading && !error && cases.length > 0 && (
        <div className="flex flex-col gap-2">
          {cases.map((c) => (
            <div key={c._id} className="content-row">
              <button
                className="content-row__main"
                onClick={() => navigate(`/admin/cases/${c._id}`)}
              >
                <p className="content-row__title">{c.title}</p>
                <p className="content-row__meta">
                  {c.concept_ids?.length || 0} concept(s) ·{" "}
                  {isComplete(c) ? (
                    <span style={{ color: "var(--success-color)" }}>
                      ✓ Visible to students
                    </span>
                  ) : (
                    <span style={{ color: "var(--danger-color)" }}>
                      ⚠ Incomplete — hidden from students
                    </span>
                  )}
                </p>
              </button>
              <div className="content-row__actions">
                <button
                  className="content-row__action-btn"
                  onClick={() => navigate(`/admin/cases/${c._id}`)}
                  aria-label="Edit"
                >
                  ✏️
                </button>
                <button
                  className="content-row__action-btn"
                  onClick={() => handleDelete(c)}
                  aria-label="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCases;

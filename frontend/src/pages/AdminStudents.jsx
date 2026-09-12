import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import GameCard from "../components/GameCard";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import AdminTabs from "../components/AdminTabs";
import "../Admin.css";

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

function AdminStudents() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce: only commit the typed text to `search` (which triggers
  // the API call) 350ms after the user stops typing.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    // react-hooks/set-state-in-effect flags this, but it's React's own
    // documented "fetching data in an Effect" pattern (react.dev's Effects
    // guide): resetting loading/error here shows a fresh loading state
    // immediately when a dependency changes, instead of stale data while
    // the new request is in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (grade) params.grade = grade;

    api
      .get("/admin/students", { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [search, grade, page]);

  return (
    <div className="admin-page p-4">
      <h1 className="admin-page__title mb-1">Students</h1>
      <p className="admin-page__subtitle mb-4">
        {data ? `${data.total} student${data.total === 1 ? "" : "s"}` : "\u00A0"}
      </p>

      <AdminTabs />

      <div className="admin-page__toolbar mb-4">
        <input
          className="admin-page__search"
          type="text"
          placeholder="Search by name or email"
          aria-label="Search by name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="admin-page__select"
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All grades</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
      </div>

      {loading && <PageLoading label="Loading students..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && data && data.students.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No students found"
          subtitle="Try a different search or grade filter."
        />
      )}

      {!loading && !error && data && data.students.length > 0 && (
        <>
          <div className="flex flex-col gap-2 mb-4">
            {data.students.map((s) => (
              <GameCard
                key={s.id}
                icon={s.name.charAt(0).toUpperCase()}
                title={s.name}
                subtitle={`Grade ${s.grade} · ${s.email} · ${s.xpTotal} XP`}
                onClick={() => navigate(`/admin/students/${s.id}`)}
              />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="admin-page__pagination">
              <button
                className={`admin-page__page-btn${page <= 1 ? " admin-page__page-btn--disabled" : ""}`}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Prev
              </button>
              <span className="admin-page__page-info">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                className={`admin-page__page-btn${page >= data.totalPages ? " admin-page__page-btn--disabled" : ""}`}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminStudents;

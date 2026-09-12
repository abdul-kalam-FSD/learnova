import { useEffect, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import AdminTabs from "../components/AdminTabs";
import "../Admin.css";

const ROLES = ["student", "teacher", "admin"];

function AdminStaff() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState({ id: null, message: "" });

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
    if (role) params.role = role;

    api
      .get("/admin/users", { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [search, role, page]);

  const handleRoleChange = (userId, newRole) => {
    setSavingId(userId);
    setRowError({ id: null, message: "" });

    api
      .patch(`/admin/users/${userId}/role`, { role: newRole })
      .then(() => {
        // Assigning a role always sets status back to "active" server-
        // side (see adminControllers.setUserRole) — including the
        // "Approve" action below, which re-sends the user's current
        // role for exactly this side effect.
        setData((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId ? { ...u, role: newRole, status: "active" } : u,
          ),
        }));
      })
      .catch((err) =>
        setRowError({
          id: userId,
          message: err.response?.data?.message || err.message,
        }),
      )
      .finally(() => setSavingId(null));
  };

  // A self-registered teacher (Signup.jsx, role: "teacher") starts
  // status: "pending" until approved — this re-sends their existing
  // role rather than a different one, since the approval itself is
  // what setUserRole's status reset is for.
  const handleApprove = (user) => handleRoleChange(user.id, user.role);

  return (
    <div className="admin-page p-4">
      <h1 className="admin-page__title mb-1">Manage Staff</h1>
      <p className="admin-page__subtitle mb-4">
        {data ? `${data.total} user${data.total === 1 ? "" : "s"}` : "\u00A0"}
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
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading && <PageLoading label="Loading users..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && data && data.users.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No users found"
          subtitle="Try a different search or role filter."
        />
      )}

      {!loading && !error && data && data.users.length > 0 && (
        <>
          <div className="admin-table__wrapper mb-4">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-table__head-cell">Name</th>
                  <th className="admin-table__head-cell">Email</th>
                  <th className="admin-table__head-cell">Grade</th>
                  <th className="admin-table__head-cell">Role</th>
                  <th className="admin-table__head-cell">Status</th>
                  <th className="admin-table__head-cell">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="admin-table__row">
                    <td className="admin-table__cell">{u.name}</td>
                    <td className="admin-table__cell">{u.email}</td>
                    <td className="admin-table__cell">{u.grade ?? "—"}</td>
                    <td className="admin-table__cell">
                      <span className={`role-badge role-badge--${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="admin-table__cell">
                      {u.status === "pending" ? (
                        <>
                          <span className="role-badge role-badge--pending">Pending</span>
                          <button
                            type="button"
                            className="admin-page__page-btn"
                            disabled={savingId === u.id}
                            onClick={() => handleApprove(u)}
                            style={{ marginLeft: 8 }}
                          >
                            Approve
                          </button>
                        </>
                      ) : (
                        <span className="role-badge role-badge--active">Active</span>
                      )}
                    </td>
                    <td className="admin-table__cell">
                      <select
                        className={`admin-page__role-select${savingId === u.id ? " admin-page__role-select--saving" : ""}`}
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                      {rowError.id === u.id && (
                        <p className="admin-page__error">{rowError.message}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default AdminStaff;

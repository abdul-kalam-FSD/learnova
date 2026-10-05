import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import AdminTabs from "../components/AdminTabs";
import "../Admin.css";

const ROLES = ["student", "teacher", "admin"];
const cap = (r) => r.charAt(0).toUpperCase() + r.slice(1);

// One table per role so teachers, students and admins are never mixed.
// Each section asks the existing GET /admin/users for ONE role (the
// backend already supports ?role=), keeps its own pagination, and
// refetches when `reloadKey` changes (after a role change/approval, a
// user may need to move to a different section).
function StaffSection({
  title,
  role,
  reloadKey,
  columns,
  renderRow,
  searchable = false,
  hideWhenEmpty = false,
}) {
  // Search is per section (teachers / students). It stays server-side —
  // the existing GET /admin/users ?search= (name + email) — because that
  // list is already paginated; debounced like the previous page-level box.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Page is tied to the search it was chosen under, so a new search
  // starts at page 1 without an effect.
  const [pageState, setPageState] = useState({ search, page: 1 });
  const page = pageState.search === search ? pageState.page : 1;
  const setPage = (fn) =>
    setPageState((prev) => {
      const current = prev.search === search ? prev.page : 1;
      return { search, page: typeof fn === "function" ? fn(current) : fn };
    });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Same documented "fetch in an Effect" pattern as before.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    const params = { page, limit: 20, role };
    if (search) params.search = search;

    api
      .get("/admin/users", { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [search, role, page, reloadKey]);

  if (hideWhenEmpty && !loading && !error && data && data.users.length === 0) return null;

  const headingId = `staff-section-${role}`;

  return (
    <section className="mb-6" aria-labelledby={headingId} data-testid={`staff-section-${role}`}>
      <h2 id={headingId} className="admin-page__title mb-1" style={{ fontSize: "1.25rem" }}>
        {title}
      </h2>
      <p className="admin-page__subtitle mb-3">
        {data ? `${data.total} ${data.total === 1 ? role : `${role}s`}` : "\u00A0"}
      </p>

      {searchable && (
        <div className="admin-page__toolbar mb-3">
          <input
            className="admin-page__search"
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            aria-label={`Search ${title.toLowerCase()}`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      )}

      {loading && <PageLoading label={`Loading ${title.toLowerCase()}...`} />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && data && data.users.length === 0 && (
        <EmptyState
          icon="🔍"
          title={search ? `No matching ${title.toLowerCase()} found.` : `No ${title.toLowerCase()} found.`}
          subtitle={search ? "Try a different name or email." : undefined}
        />
      )}

      {!loading && !error && data && data.users.length > 0 && (
        <>
          <div className="admin-table__wrapper mb-4">
            <table className="admin-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="admin-table__head-cell">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{data.users.map((u) => renderRow(u))}</tbody>
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
    </section>
  );
}

// Totals for the whole role (NOT affected by the section search boxes).
// Derived from the existing GET /admin/users `total` (limit=1 → we only
// need the count), plus its optional status filter for pending teachers.
function StaffSummary({ reloadKey }) {
  const [counts, setCounts] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const count = (params) =>
      api.get("/admin/users", { params: { page: 1, limit: 1, ...params } }).then((r) => r.data.total);
    Promise.all([
      count({ role: "teacher" }),
      count({ role: "student" }),
      count({ role: "teacher", status: "pending" }),
    ])
      .then(([teachers, students, pendingTeachers]) => {
        if (cancelled) return;
        setCounts({ teachers, students, pendingTeachers });
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const show = (v) => (counts ? v : "—");
  const cards = [
    ["Teachers", show(counts?.teachers), "🍎"],
    ["Students", show(counts?.students), "🎓"],
    ["Pending Teachers", show(counts?.pendingTeachers), "⏳"],
  ];

  return (
    <div
      className="dash-grid mb-5"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
      aria-label="Staff summary"
      data-testid="staff-summary"
      title={failed ? "Couldn't load totals" : undefined}
    >
      {cards.map(([label, value, icon]) => (
        <div key={label} className="dash-card">
          <div className="dash-card__icon" aria-hidden="true">
            {icon}
          </div>
          <div className="dash-card__value">{value}</div>
          <div className="dash-card__label">{label}</div>
        </div>
      ))}
    </div>
  );
}

function AdminStaff() {
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState({ id: null, message: "" });

  const handleRoleChange = (userId, newRole) => {
    setSavingId(userId);
    setRowError({ id: null, message: "" });

    api
      .patch(`/admin/users/${userId}/role`, { role: newRole })
      // Assigning a role always sets status back to "active" server-side
      // (adminControllers.setUserRole) — including "Approve", which
      // re-sends the user's current role for exactly that side effect.
      // Refetch every section: a changed role moves the user to another
      // table, and an approved teacher gets its Students/View button.
      .then(() => setReloadKey((k) => k + 1))
      .catch((err) =>
        setRowError({
          id: userId,
          message: err.response?.data?.message || err.message,
        }),
      )
      .finally(() => setSavingId(null));
  };

  // A self-registered teacher (Signup.jsx, role: "teacher") starts
  // status: "pending" until approved — this re-sends their existing role.
  const handleApprove = (user) => handleRoleChange(user.id, user.role);

  const statusBadge = (u) =>
    u.status === "pending" ? (
      <span className="role-badge role-badge--pending">Pending</span>
    ) : (
      <span className="role-badge role-badge--active">Active</span>
    );

  const roleBadge = (u) => <span className={`role-badge role-badge--${u.role}`}>{u.role}</span>;

  const roleSelect = (u) => (
    <>
      <select
        className={`admin-page__role-select${savingId === u.id ? " admin-page__role-select--saving" : ""}`}
        value={u.role}
        aria-label={`Change role for ${u.name}`}
        disabled={savingId === u.id}
        onChange={(e) => handleRoleChange(u.id, e.target.value)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {cap(r)}
          </option>
        ))}
      </select>
      {rowError.id === u.id && <p className="admin-page__error">{rowError.message}</p>}
    </>
  );

  const renderTeacher = (u) => (
    <tr key={u.id} className="admin-table__row">
      <td className="admin-table__cell">{u.name}</td>
      <td className="admin-table__cell">{u.email}</td>
      <td className="admin-table__cell">{roleBadge(u)}</td>
      <td className="admin-table__cell">
        {statusBadge(u)}
        {u.status === "pending" && (
          <button
            type="button"
            className="admin-page__page-btn"
            disabled={savingId === u.id}
            onClick={() => handleApprove(u)}
            style={{ marginLeft: 8 }}
          >
            Approve
          </button>
        )}
      </td>
      <td className="admin-table__cell">
        {/* studentCount comes from the backend (Section-based), never computed here. */}
        <span>
          {u.studentCount ?? 0} Student{(u.studentCount ?? 0) === 1 ? "" : "s"}
        </span>
        {u.status !== "pending" && (
          <button
            type="button"
            className="admin-page__page-btn"
            onClick={() => navigate(`/admin/teachers/${u.id}/students`)}
            style={{ marginLeft: 8 }}
          >
            View Students
          </button>
        )}
      </td>
      <td className="admin-table__cell">{roleSelect(u)}</td>
    </tr>
  );

  const renderStudent = (u) => (
    <tr key={u.id} className="admin-table__row">
      <td className="admin-table__cell">{u.name}</td>
      <td className="admin-table__cell">{u.email}</td>
      <td className="admin-table__cell">{roleBadge(u)}</td>
      <td className="admin-table__cell">{u.grade ?? "—"}</td>
      <td className="admin-table__cell">{statusBadge(u)}</td>
      <td className="admin-table__cell">{roleSelect(u)}</td>
    </tr>
  );

  const renderAdmin = (u) => (
    <tr key={u.id} className="admin-table__row">
      <td className="admin-table__cell">{u.name}</td>
      <td className="admin-table__cell">{u.email}</td>
      <td className="admin-table__cell">{roleBadge(u)}</td>
      <td className="admin-table__cell">{statusBadge(u)}</td>
      <td className="admin-table__cell">{roleSelect(u)}</td>
    </tr>
  );

  return (
    <div className="admin-page p-4">
      <h1 className="admin-page__title mb-1">Manage Staff</h1>
      <p className="admin-page__subtitle mb-4">Teachers, students and admins are listed separately.</p>

      <AdminTabs />

      <StaffSummary reloadKey={reloadKey} />

      <StaffSection
        title="Teachers"
        role="teacher"
        searchable
        reloadKey={reloadKey}
        columns={["Name", "Email", "Role", "Status", "Students", "Change Role"]}
        renderRow={renderTeacher}
      />
      <StaffSection
        title="Students"
        role="student"
        searchable
        reloadKey={reloadKey}
        columns={["Name", "Email", "Role", "Grade", "Status", "Change Role"]}
        renderRow={renderStudent}
      />
      {/* Admins were already listed on this page (All roles / Admin filter);
          kept as their own small table so they land in neither of the two above. */}
      <StaffSection
        title="Admins"
        role="admin"
        reloadKey={reloadKey}
        columns={["Name", "Email", "Role", "Status", "Change Role"]}
        renderRow={renderAdmin}
        hideWhenEmpty
      />
    </div>
  );
}

export default AdminStaff;

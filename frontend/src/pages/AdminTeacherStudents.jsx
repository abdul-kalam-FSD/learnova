import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import AdminTabs from "../components/AdminTabs";
import "../Admin.css";

// Admin view of one teacher's assigned students. Data comes from
// GET /api/admin/teachers/:id/students (Section-based roster, admin-only
// on the server) — the same relationship that produces the "N Students"
// count on Manage Staff, so the two always agree.
function AdminTeacherStudents() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Same documented "fetch in an Effect" pattern as AdminStaff.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    api
      .get(`/admin/teachers/${id}/students`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const teacherName = data?.teacher?.name;

  return (
    <div className="admin-page p-4">
      <h1 className="admin-page__title mb-1">
        {teacherName ? `${teacherName}'s Students` : "Teacher's Students"}
      </h1>
      <p className="admin-page__subtitle mb-4">
        {data ? `Total Students: ${data.total}` : "\u00A0"}
      </p>

      <AdminTabs />

      <button className="admin-detail__back mb-3" onClick={() => navigate("/admin/staff")}>
        ← Back to Staff
      </button>

      {loading && <PageLoading label="Loading students..." />}
      {error && <p className="admin-page__error">{error}</p>}

      {!loading && !error && data && data.students.length === 0 && (
        <EmptyState
          icon="👩‍🏫"
          title="No students assigned"
          subtitle="No students are currently assigned to this teacher."
        />
      )}

      {!loading && !error && data && data.students.length > 0 && (
        <div className="admin-table__wrapper mb-4">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-table__head-cell">Student</th>
                <th className="admin-table__head-cell">Email</th>
                <th className="admin-table__head-cell">Grade</th>
                <th className="admin-table__head-cell">Section</th>
                <th className="admin-table__head-cell">XP</th>
                <th className="admin-table__head-cell">Streak</th>
                <th className="admin-table__head-cell">Last Active</th>
                <th className="admin-table__head-cell">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id} className="admin-table__row">
                  <td className="admin-table__cell">{s.name}</td>
                  <td className="admin-table__cell">{s.email}</td>
                  <td className="admin-table__cell">{s.grade ?? "—"}</td>
                  <td className="admin-table__cell">{s.section?.name ?? "—"}</td>
                  <td className="admin-table__cell">{s.xpTotal ?? 0}</td>
                  <td className="admin-table__cell">{s.streakCount ?? 0}</td>
                  <td className="admin-table__cell">
                    {s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="admin-table__cell">
                    <button
                      type="button"
                      className="admin-page__page-btn"
                      onClick={() => navigate(`/admin/students/${s.id}`)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminTeacherStudents;

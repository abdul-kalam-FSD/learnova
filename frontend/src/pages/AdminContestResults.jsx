import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import AdminTabs from "../components/AdminTabs";
import ContestResultsView from "../components/ContestResultsView";
import "../Admin.css";

// Results for any published contest (admin).
function AdminContestResults() {
  const { contestId } = useParams();
  return (
    <div className="admin-page p-4">
      <h1 className="admin-page__title mb-1">Contest results</h1>
      <p className="admin-page__subtitle mb-4">
        <Link to="/admin/contests">← Back to Contest Review</Link>
      </p>
      <AdminTabs />
      <ContestResultsView
        loadResults={(page) => api.get(`/admin/contests/${contestId}/results`, { params: { page } })}
        loadParticipant={(studentId) => api.get(`/admin/contests/${contestId}/results/${studentId}`)}
        exportUrl={`/admin/contests/${contestId}/results/export`}
        exportButtonClassName="admin-page__export-btn"
      />
    </div>
  );
}

export default AdminContestResults;

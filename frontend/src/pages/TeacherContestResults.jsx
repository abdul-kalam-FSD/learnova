import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import ContestResultsView from "../components/ContestResultsView";
import TeacherTabs from "../components/TeacherTabs";
import "../Teacher.css";

// Results for a contest the teacher owns. The server enforces ownership;
// another teacher's contest simply comes back as "Contest not found".
function TeacherContestResults() {
  const { contestId } = useParams();
  return (
    <div className="teacher-page p-4">
      <h1 className="teacher-page__title">Contest results</h1>
      <p className="teacher-page__subtitle mb-4">
        <Link to="/teacher/contests">← Back to Contests</Link>
      </p>
      <TeacherTabs />
      <ContestResultsView
        loadResults={(page) => api.get(`/contests/${contestId}/results`, { params: { page } })}
        loadParticipant={(studentId) => api.get(`/contests/${contestId}/results/${studentId}`)}
        exportUrl={`/contests/${contestId}/results/export`}
        exportButtonClassName="teacher-page__page-btn"
      />
    </div>
  );
}

export default TeacherContestResults;

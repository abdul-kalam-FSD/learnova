import { Link } from "react-router-dom";
import "../Portal.css";

const ROLE_LABEL = {
  admin: "an administrator",
  teacher: "a teacher",
  student: "a student",
};

// Shown when a logged-in user hits a route their role doesn't cover
// (e.g. a student opening /admin/students, or a student opening
// /teacher/students). Replaces the old silent redirect to /home —
// the user is told exactly why they can't see this page instead of
// just bouncing somewhere else with no explanation.
function AccessDenied({ requiredRole, currentRole }) {
  return (
    <div className="portal-entry">
      <div className="portal-entry__card portal-entry__card--denied">
        <div className="portal-entry__icon" aria-hidden="true">
          🔒
        </div>
        <p className="portal-entry__eyebrow">Access denied</p>
        <h1 className="portal-entry__title">This area requires {ROLE_LABEL[requiredRole] || `${requiredRole} permissions`}</h1>
        <p className="portal-entry__tagline">
          You're signed in{currentRole ? ` as ${ROLE_LABEL[currentRole] || currentRole}` : ""}, so this
          section isn't available on your account. If you believe this is a mistake, contact
          your school administrator.
        </p>

        <div className="portal-entry__actions">
          <Link to="/home" className="btn-primary portal-entry__signin">
            Go to my dashboard
          </Link>
          <Link to="/" className="portal-entry__back">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;

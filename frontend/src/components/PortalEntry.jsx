import { Link, useNavigate } from "react-router-dom";
import "../Portal.css";

const CONFIG = {
  admin: {
    icon: "🛠️",
    label: "Admin Portal",
    tagline: "Manage students, staff, content and results across the whole platform.",
    capabilities: [
      "Oversee every student, teacher and class in one dashboard",
      "Publish and manage grades, subjects, chapters and games",
      "Review platform-wide analytics, weak areas and completion rates",
      "Manage staff accounts and permissions",
    ],
  },
  teacher: {
    icon: "🍎",
    label: "Teacher Portal",
    tagline: "See how your students are doing and where they need help.",
    capabilities: [
      "Track your classes' progress, chapter-by-chapter",
      "Spot students who are struggling with a specific topic",
      "Review individual student performance and activity",
      "Assign missions and recommend next steps",
    ],
  },
};

// Shown when a guest (no token) reaches a protected /admin or /teacher
// route. Replaces the old behavior of silently bouncing them to
// /login or /home with no explanation (Part 3 of the redesign spec).
// The user always lands somewhere that tells them what this area is
// and gives them an explicit way in.
function PortalEntry({ role, returnTo }) {
  const config = CONFIG[role] ?? CONFIG.admin;
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate(`/login?context=${role}&redirect=${encodeURIComponent(returnTo || "/")}`);
  };

  return (
    <div className="portal-entry">
      <div className="portal-entry__card">
        <div className="portal-entry__icon" aria-hidden="true">
          {config.icon}
        </div>
        <p className="portal-entry__eyebrow">Restricted area</p>
        <h1 className="portal-entry__title">{config.label}</h1>
        <p className="portal-entry__tagline">{config.tagline}</p>

        <ul className="portal-entry__capabilities">
          {config.capabilities.map((cap) => (
            <li key={cap}>{cap}</li>
          ))}
        </ul>

        <div className="portal-entry__actions">
          <button type="button" className="btn-primary portal-entry__signin" onClick={handleSignIn}>
            Sign in as {role === "admin" ? "Admin" : "Teacher"}
          </button>
          <Link to="/" className="portal-entry__back">
            ← Back to home
          </Link>
        </div>

        <p className="portal-entry__note">
          Don't have {role} access? Ask your school administrator, or head back and
          continue learning as a student.
        </p>
      </div>
    </div>
  );
}

export default PortalEntry;

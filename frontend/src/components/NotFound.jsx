import { Link } from "react-router-dom";
import "../Portal.css";

// Replaces `<Route path="*" element={<Navigate to="/" />} />` — a
// mistyped or stale URL used to bounce silently to the homepage with
// no acknowledgement anything was wrong. Part 14 of the redesign spec
// calls for a proper 404 explicitly.
function NotFound() {
  return (
    <div className="portal-entry">
      <div className="portal-entry__card">
        <div className="portal-entry__icon" aria-hidden="true">
          🧭
        </div>
        <p className="portal-entry__eyebrow">404</p>
        <h1 className="portal-entry__title">We couldn't find that page</h1>
        <p className="portal-entry__tagline">
          The link might be broken, or the page may have moved. Let's get you back
          on track.
        </p>

        <div className="portal-entry__actions">
          <Link to="/" className="btn-primary portal-entry__signin">
            Go to homepage
          </Link>
          <Link to="/home" className="portal-entry__back">
            Go to my dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;

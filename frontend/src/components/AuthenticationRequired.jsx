import { Link, useLocation } from "react-router-dom";
import "../Portal.css";

// Shown by ProtectedRoute when there's no token at all — typically a
// direct/bookmarked link to a page like /home or a game route, opened
// without ever going through the public home page's "Play as Guest"
// or "Choose Your Grade" flow (which mints a guest token first). Per
// Part 14 of the redesign spec, this replaces a bare
// `<Navigate to="/login" />` with an explicit explanation instead of
// bouncing the user with no context.
function AuthenticationRequired() {
  const location = useLocation();

  return (
    <div className="portal-entry">
      <div className="portal-entry__card">
        <div className="portal-entry__icon" aria-hidden="true">
          🔑
        </div>
        <p className="portal-entry__eyebrow">Sign in required</p>
        <h1 className="portal-entry__title">This page needs an account or guest session</h1>
        <p className="portal-entry__tagline">
          You can play instantly as a guest — no signup needed — or sign in if you
          already have an account.
        </p>

        <div className="portal-entry__actions">
          <Link to="/" className="btn-primary portal-entry__signin">
            Play as Guest
          </Link>
          <Link
            to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
            className="portal-entry__back"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AuthenticationRequired;

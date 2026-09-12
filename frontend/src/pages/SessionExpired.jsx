import { Link, useSearchParams } from "react-router-dom";
import "../Portal.css";

// Landed on by a hard `window.location.assign` from the axios 401
// interceptor (api/axios.js) — a fresh page load, not a client-side
// route change, since the token that just died could have been
// backing state all over the app that's now stale anyway.
function SessionExpired() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  return (
    <div className="portal-entry">
      <div className="portal-entry__card">
        <div className="portal-entry__icon" aria-hidden="true">
          ⏳
        </div>
        <p className="portal-entry__eyebrow">Session expired</p>
        <h1 className="portal-entry__title">You've been signed out</h1>
        <p className="portal-entry__tagline">
          Your session ended, so we've signed you out to keep your account safe.
          Sign back in to pick up where you left off.
        </p>

        <div className="portal-entry__actions">
          <Link
            to={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
            className="btn-primary portal-entry__signin"
          >
            Sign in again
          </Link>
          <Link to="/" className="portal-entry__back">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SessionExpired;

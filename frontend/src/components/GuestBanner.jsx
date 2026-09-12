import { useState } from "react";
import { Link } from "react-router-dom";
import { isGuest } from "../utils/guestSession";
import "../Shell.css";

const DISMISS_KEY = "guestBannerDismissed";

// Non-blocking "want to save your progress?" nudge for guests. Never
// covers content or requires a response — just a thin dismissible
// strip, and dismissing it persists for the browser session so it
// doesn't re-appear on every page.
function GuestBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "true",
  );

  if (!isGuest() || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="guest-banner">
      <span className="guest-banner__text">
        Your progress is saved for this guest session, but can be lost if you
        clear browser data or switch devices. Create an account to keep it.
      </span>
      <div className="guest-banner__actions">
        <Link to="/signup" className="guest-banner__link">
          Create Account
        </Link>
        <button
          className="guest-banner__dismiss"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default GuestBanner;

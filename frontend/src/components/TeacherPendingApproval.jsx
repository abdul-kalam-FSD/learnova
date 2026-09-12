import { Link } from "react-router-dom";
import { clearGuestSession } from "../utils/guestSession";
import "../Portal.css";

// Shown to a logged-in, self-registered teacher (status: "pending",
// see authControllers.register / requireTeacher) who reaches a
// /teacher/* route before an admin has approved their account. This
// is deliberately distinct from AccessDenied — the account isn't
// wrong or unauthorized in a permanent sense, it's just waiting on a
// step outside the user's control, so the copy and the only action
// offered (log out) reflect that rather than implying they did
// something wrong or should contact their own school (an admin has
// to act here, not the user).
function TeacherPendingApproval() {
  const handleLogout = () => {
    localStorage.removeItem("token");
    clearGuestSession();
    window.location.href = "/login";
  };

  return (
    <div className="portal-entry">
      <div className="portal-entry__card">
        <div className="portal-entry__icon" aria-hidden="true">
          ⏳
        </div>
        <p className="portal-entry__eyebrow">Pending approval</p>
        <h1 className="portal-entry__title">Your teacher account is under review</h1>
        <p className="portal-entry__tagline">
          An admin needs to approve your account before you can access the Teacher
          Portal. This usually doesn't take long — check back soon, or reach out to your
          school's Learnova admin if it's been a while.
        </p>

        <div className="portal-entry__actions">
          <button type="button" className="btn-primary portal-entry__signin" onClick={handleLogout}>
            Log out
          </button>
          <Link to="/" className="portal-entry__back">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TeacherPendingApproval;

import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  isPushSupported,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "../utils/push";
import { clearGuestSession } from "../utils/guestSession";
import { useDrawerA11y } from "../utils/useDrawerA11y";
import "../Shell.css";

/**
 * Secondary/global navigation drawer. Bottom nav handles the primary
 * product tabs (Home/Chapters/Practice/Progress); this handles the
 * rest (Grade info, Notifications, Profile, Logout).
 */
function HamburgerDrawer({ open, onClose, grade, role }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [subscribed, setSubscribed] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifError, setNotifError] = useState("");

  useDrawerA11y(panelRef, open, onClose);

  useEffect(() => {
    if (!isPushSupported()) return;
    getExistingSubscription()
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, []);

  const handleLogout = () => {
    clearGuestSession();
    onClose();
    navigate("/");
  };

  const toggleNotifications = async () => {
    setNotifError("");
    setNotifBusy(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        await subscribeToPush();
        setSubscribed(true);
      }
    } catch (err) {
      setNotifError(err.message || "Couldn't update notifications");
    } finally {
      setNotifBusy(false);
    }
  };

  return (
    <>
      <div
        className={`drawer__backdrop${open ? " drawer__backdrop--open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <nav
        ref={panelRef}
        className={`drawer${open ? " drawer--open" : ""}`}
        aria-label="Secondary"
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
      >
        <div className="drawer__header">
          <span className="drawer__title">Menu</span>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {grade && (
          <div className="drawer__info-row">
            <span>Grade</span>
            <span className="drawer__info-value">{grade}</span>
          </div>
        )}

        <NavLink to="/profile" className="drawer__link" onClick={onClose}>
          👤 Profile
        </NavLink>

        {role === "admin" && (
          <NavLink to="/admin/students" className="drawer__link" onClick={onClose}>
            🛠️ Admin Panel
          </NavLink>
        )}

        {(role === "teacher" || role === "admin") && (
          <NavLink to="/teacher/students" className="drawer__link" onClick={onClose}>
            🧑‍🏫 Teacher Dashboard
          </NavLink>
        )}

        {isPushSupported() && (
          <button
            className="drawer__link"
            onClick={toggleNotifications}
            disabled={notifBusy}
          >
            🔔 Notifications: {subscribed ? "On" : "Off"}
          </button>
        )}
        {notifError && <p className="drawer__notif-error">{notifError}</p>}

        <button className="drawer__link drawer__link--danger" onClick={handleLogout}>
          ⎋ Logout
        </button>
      </nav>
    </>
  );
}

export default HamburgerDrawer;

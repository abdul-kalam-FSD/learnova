import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../api/axios";
import { clearGuestSession } from "../utils/guestSession";
import "../Auth.css";
import "../Portal.css";

const CONTEXT_COPY = {
  admin: "Sign in with your administrator account to continue to the Admin Portal.",
  teacher: "Sign in with your teacher account to continue to the Teacher Portal.",
};

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = searchParams.get("context");
  const redirectTo = searchParams.get("redirect");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const res = await api.post("/auth/login", form);
      // Logging into a real, separate account intentionally does NOT
      // carry over a prior guest session's progress (see
      // authControllers.upgradeGuest for the case this app DOES
      // support — turning the guest's own session into an account).
      // What it must not do is leave the stale `isGuest` flag behind,
      // which would keep misidentifying this now-real login as a
      // guest everywhere the app checks isGuest().
      clearGuestSession();
      localStorage.setItem("token", res.data.token);
      // Arriving here from a Portal Entry page (Part 3): return the
      // user to the admin/teacher page they originally asked for
      // instead of always dropping them on the student home. If their
      // account turns out not to have that role, the destination
      // route's own guard shows a clear Access Denied page rather
      // than failing silently.
      //
      // Without an explicit redirect, route by role rather than
      // always assuming "/home": that page is the student dashboard
      // and fetches grade-scoped content, which a teacher/admin
      // account (no grade at all — see models/User.js) has no
      // business landing on. A pending teacher still goes to
      // /teacher, same as an approved one — TeacherRoute itself is
      // what shows the pending-approval screen there.
      if (redirectTo) {
        navigate(redirectTo);
      } else if (res.data.user?.role === "teacher") {
        navigate("/teacher");
      } else if (res.data.user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="auth-page__card w-full max-w-sm p-6">
        <div className="auth-page__brand-row">
          <span className="auth-page__brand-badge" aria-hidden="true">
            🎓
          </span>
          <span className="auth-page__brand-wordmark">Learnova</span>
        </div>
        <h2 className="auth-page__title text-2xl font-bold mb-1">Welcome back</h2>
        <p className="auth-page__subtitle text-sm mb-5">
          Log in to keep learning, playing, and leveling up.
        </p>

        {context && CONTEXT_COPY[context] && (
          <p className="portal-context-banner">{CONTEXT_COPY[context]}</p>
        )}

        {error && <p className="auth-page__error text-sm mb-4 px-3 py-2">{error}</p>}

        <label htmlFor="login-email" className="auth-page__label block text-xs font-semibold mb-1">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          onChange={handleChange}
          required
          className="auth-page__input w-full mb-4 px-3 py-2 text-sm outline-none"
        />

        <label htmlFor="login-password" className="auth-page__label block text-xs font-semibold mb-1">
          Password
        </label>
        <div className="auth-page__password-row mb-2">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            onChange={handleChange}
            required
            className="auth-page__input w-full px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            className="auth-page__password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <div className="auth-page__forgot-row">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="btn-primary auth-page__submit w-full py-3 font-semibold text-sm"
        >
          {isSubmitting ? "Logging in..." : "Log In"}
        </button>

        <div className="auth-page__divider" role="presentation">
          or
        </div>

        {/* Guest play doesn't need a password — it needs a grade, which
            is picked on the public hub, not here. Sending someone here
            to "Continue as Guest" and then straight into a grade picker
            they haven't seen yet would be two steps that feel like one
            broken one, so this links to the hub itself rather than
            trying to re-implement grade selection on the login page. */}
        <Link to="/" className="auth-page__guest-link">
          Continue as Guest
        </Link>

        <p className="auth-page__footer text-sm text-center mt-4">
          New to Learnova? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
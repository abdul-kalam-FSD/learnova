import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../Auth.css";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("default"); // default | loading | success

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "loading") return;
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setStatus("loading");
    try {
      await api.post("/auth/reset-password", { token, password });
      setStatus("success");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "We couldn't connect right now. Please try again.",
      );
      setStatus("default");
    }
  };

  if (!token) {
    return (
      <div className="auth-page min-h-screen flex items-center justify-center p-4">
        <div className="auth-page__card w-full max-w-sm p-6 text-center">
          <h2 className="auth-page__title text-2xl font-bold mb-2">
            This reset link is invalid
          </h2>
          <p className="auth-page__subtitle text-sm mb-4">
            It looks like this link is missing its token. Request a new one below.
          </p>
          <Link
            to="/forgot-password"
            className="btn-primary auth-page__submit w-full py-3 font-semibold text-sm inline-block"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="auth-page min-h-screen flex items-center justify-center p-4">
        <div className="auth-page__card w-full max-w-sm p-6 text-center">
          <h2 className="auth-page__title text-2xl font-bold mb-2">Password updated</h2>
          <p className="auth-page__success text-sm mb-4 px-3 py-3">
            You can now log in with your new password.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="btn-primary auth-page__submit w-full py-3 font-semibold text-sm"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="auth-page__card w-full max-w-sm p-6">
        <div className="auth-page__brand-row">
          <span className="auth-page__brand-badge" aria-hidden="true">
            🎓
          </span>
          <span className="auth-page__brand-wordmark">Learnova</span>
        </div>
        <h2 className="auth-page__title text-2xl font-bold mb-1">Create new password</h2>
        <p className="auth-page__subtitle text-sm mb-5">
          Choose a new password for your account. This link is only valid for a short
          time and can only be used once.
        </p>

        {error && <p className="auth-page__error text-sm mb-4 px-3 py-2">{error}</p>}

        <label htmlFor="reset-password" className="auth-page__label block text-xs font-semibold mb-1">
          New password
        </label>
        <div className="auth-page__password-row mb-4">
          <input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
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

        <label
          htmlFor="reset-confirm-password"
          className="auth-page__label block text-xs font-semibold mb-1"
        >
          Confirm new password
        </label>
        <input
          id="reset-confirm-password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="auth-page__input w-full mb-5 px-3 py-2 text-sm outline-none"
        />

        <button
          type="submit"
          disabled={status === "loading"}
          aria-busy={status === "loading"}
          className="btn-primary auth-page__submit w-full py-3 font-semibold text-sm"
        >
          {status === "loading" ? "Updating..." : "Update password"}
        </button>

        <p className="auth-page__footer text-sm text-center mt-4">
          <Link to="/login">Back to Login</Link>
        </p>
      </form>
    </div>
  );
}

export default ResetPassword;

import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "../Auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [status, setStatus] = useState("default"); // default | loading | success | network-error
  const [serverMessage, setServerMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "loading") return;
    setFieldError("");

    if (!EMAIL_RE.test(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }

    setStatus("loading");
    try {
      const res = await api.post("/auth/forgot-password", { email });
      // Backend always returns the same generic message whether or
      // not the email is registered — this is intentional (see
      // authControllers.forgotPassword) and the UI mirrors it exactly
      // rather than trying to be more specific, which would leak
      // which emails exist.
      setServerMessage(
        res.data?.message ||
          "If that email is registered, we've sent password reset instructions.",
      );
      setStatus("success");
    } catch {
      setStatus("network-error");
    }
  };

  if (status === "success") {
    return (
      <div className="auth-page min-h-screen flex items-center justify-center p-4">
        <div className="auth-page__card w-full max-w-sm p-6 text-center">
          <div className="auth-page__brand-row" style={{ justifyContent: "center" }}>
            <span className="auth-page__brand-badge" aria-hidden="true">
              🎓
            </span>
            <span className="auth-page__brand-wordmark">Learnova</span>
          </div>
          <h2 className="auth-page__title text-2xl font-bold mb-2">Check your email</h2>
          <p className="auth-page__success text-sm mb-4 px-3 py-3">{serverMessage}</p>
          <Link to="/login" className="auth-page__footer text-sm">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="auth-page__card w-full max-w-sm p-6"
      >
        <div className="auth-page__brand-row">
          <span className="auth-page__brand-badge" aria-hidden="true">
            🎓
          </span>
          <span className="auth-page__brand-wordmark">Learnova</span>
        </div>
        <h2 className="auth-page__title text-2xl font-bold mb-1">Reset your password</h2>
        <p className="auth-page__subtitle text-sm mb-5">
          Enter the email on your account and we'll send you a link to reset it.
        </p>

        {fieldError && <p className="auth-page__error text-sm mb-4 px-3 py-2">{fieldError}</p>}
        {status === "network-error" && (
          <p className="auth-page__error text-sm mb-4 px-3 py-2">
            We couldn't connect right now. Please try again.
          </p>
        )}

        <label htmlFor="forgot-email" className="auth-page__label block text-xs font-semibold mb-1">
          Email
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="auth-page__input w-full mb-5 px-3 py-2 text-sm outline-none"
        />

        <button
          type="submit"
          disabled={status === "loading"}
          aria-busy={status === "loading"}
          className="btn-primary auth-page__submit w-full py-3 font-semibold text-sm"
        >
          {status === "loading" ? "Sending..." : "Send reset link"}
        </button>

        <p className="auth-page__footer text-sm text-center mt-4">
          Remembered it? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export default ForgotPassword;

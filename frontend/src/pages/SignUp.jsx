import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { isGuest, clearGuestSession } from "../utils/guestSession";
import "../Auth.css";

function Signup() {
  // A guest who reaches this page already has a grade (picked on the
  // public hub) and real progress tied to their existing account —
  // see authControllers.upgradeGuest. Upgrading keeps that grade
  // fixed rather than asking again, since changing it here would
  // desync the account from the mastery/XP records already earned
  // under the original grade. A guest is always a student (guest
  // sessions are only ever minted for grade-scoped play), so the
  // student/teacher choice below never applies to an upgrade.
  const upgrading = isGuest();
  const guestGrade = localStorage.getItem("guestGrade");

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    grade: "",
    streamId: "",
  });
  const [streams, setStreams] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Set once a teacher signup succeeds — teachers don't land on the
  // student dashboard like a student signup does (there's nothing for
  // them there yet, since the account is pending), so this replaces
  // the form with a confirmation screen instead of navigating away.
  const [teacherPending, setTeacherPending] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Grade 11/12 may have stream combinations (PCM/PCB/etc) — fetch
    // them the moment a qualifying grade is picked, same public
    // endpoint the guest hub uses. Any other grade just clears the
    // stream field, since it doesn't apply there.
    if (name === "grade") {
      setForm((prev) => ({ ...prev, streamId: "" }));
      const gradeNum = Number(value);
      if (gradeNum === 11 || gradeNum === 12) {
        api
          .get(`/public/standards/${gradeNum}/streams`)
          .then((res) => setStreams(res.data.streams || []))
          .catch(() => setStreams([]));
      } else {
        setStreams([]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const res = upgrading
        ? await api.post("/auth/upgrade-guest", {
            name: form.name,
            email: form.email,
            password: form.password,
          })
        : await api.post("/auth/register", {
            name: form.name,
            email: form.email,
            password: form.password,
            role,
            ...(role === "student"
              ? { grade: form.grade, streamId: form.streamId || undefined }
              : {}),
          });
      // Clears the guest markers either way: on upgrade the account
      // is now real and shouldn't keep showing as a guest; on a
      // brand-new registration there's nothing to clear, but doing it
      // unconditionally is cheap insurance against a stale flag from
      // an earlier session in this same browser.
      clearGuestSession();
      localStorage.setItem("token", res.data.token);

      if (!upgrading && role === "teacher") {
        // A self-registered teacher account is created with
        // status: "pending" (see authControllers.register /
        // requireTeacher) — every teacher-only route will reject them
        // until an admin approves the account, so there's nowhere
        // useful to navigate them yet. Show that plainly instead of
        // dropping them on a dashboard that will immediately bounce.
        setIsSubmitting(false);
        setTeacherPending(true);
        return;
      }

      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
      setIsSubmitting(false);
    }
  };

  if (teacherPending) {
    return (
      <div className="auth-page min-h-screen flex items-center justify-center p-4">
        <div className="auth-page__card w-full max-w-sm p-6 text-center">
          <div className="auth-page__brand-row" style={{ justifyContent: "center" }}>
            <span className="auth-page__brand-badge" aria-hidden="true">
              🎓
            </span>
            <span className="auth-page__brand-wordmark">Learnova</span>
          </div>
          <h2 className="auth-page__title text-2xl font-bold mb-2">Account created</h2>
          <p className="auth-page__success text-sm mb-4 px-3 py-3">
            Your teacher account is pending admin approval. You can log in any time to
            check your status — once approved, you'll get full access to the Teacher
            Portal.
          </p>
          <Link
            to="/login"
            className="btn-primary auth-page__submit w-full py-3 font-semibold text-sm inline-block"
          >
            Back to Login
          </Link>
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
        <h2 className="auth-page__title text-2xl font-bold mb-1">
          {upgrading ? "Save your progress" : "Start leveling up"}
        </h2>
        <p className="auth-page__subtitle text-sm mb-5">
          {upgrading
            ? `Create an account to keep the XP and progress you've already earned as a guest${guestGrade ? ` in Standard ${guestGrade}` : ""}.`
            : "Create your Learnova account."}
        </p>

        {error && <p className="auth-page__error text-sm mb-4 px-3 py-2">{error}</p>}

        {!upgrading && (
          <div className="auth-page__role-group" role="radiogroup" aria-label="I am a">
            <button
              type="button"
              role="radio"
              aria-checked={role === "student"}
              className={`auth-page__role-option${role === "student" ? " auth-page__role-option--active" : ""}`}
              onClick={() => setRole("student")}
            >
              Student
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === "teacher"}
              className={`auth-page__role-option${role === "teacher" ? " auth-page__role-option--active" : ""}`}
              onClick={() => setRole("teacher")}
            >
              Teacher
            </button>
          </div>
        )}

        <label htmlFor="signup-name" className="auth-page__label block text-xs font-semibold mb-1">
          Name
        </label>
        <input
          id="signup-name"
          name="name"
          placeholder="Your name"
          onChange={handleChange}
          required
          className="auth-page__input w-full mb-4 px-3 py-2 text-sm outline-none"
        />

        <label htmlFor="signup-email" className="auth-page__label block text-xs font-semibold mb-1">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          onChange={handleChange}
          required
          className="auth-page__input w-full mb-4 px-3 py-2 text-sm outline-none"
        />

        <label htmlFor="signup-password" className="auth-page__label block text-xs font-semibold mb-1">
          Password
        </label>
        <div className="auth-page__password-row mb-4">
          <input
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            onChange={handleChange}
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

        {!upgrading && role === "student" && (
          <>
            <label htmlFor="signup-grade" className="auth-page__label block text-xs font-semibold mb-1">
              Grade
            </label>
            <select
              id="signup-grade"
              name="grade"
              onChange={handleChange}
              required
              value={form.grade}
              className="auth-page__input w-full mb-5 px-3 py-2 text-sm outline-none"
            >
              <option value="" disabled>
                Select Grade
              </option>
              <option value="4">Grade 4</option>
              <option value="5">Grade 5</option>
              <option value="6">Grade 6</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>

            {streams.length > 0 && (
              <>
                <label
                  htmlFor="signup-stream"
                  className="auth-page__label block text-xs font-semibold mb-1"
                >
                  Stream
                </label>
                <select
                  id="signup-stream"
                  name="streamId"
                  onChange={handleChange}
                  value={form.streamId}
                  className="auth-page__input w-full mb-5 px-3 py-2 text-sm outline-none"
                >
                  <option value="">Not sure yet / skip for now</option>
                  {streams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.core_subjects.join(", ")})
                    </option>
                  ))}
                </select>
              </>
            )}
          </>
        )}

        {!upgrading && role === "teacher" && (
          <p className="auth-page__hint text-xs mb-5">
            Teacher accounts are reviewed by an admin before you get full access to the
            Teacher Portal. You'll be able to log in right away to check your status.
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="btn-primary auth-page__submit w-full py-3 font-semibold text-sm"
        >
          {isSubmitting
            ? upgrading
              ? "Saving..."
              : "Signing up..."
            : upgrading
              ? "Save My Progress"
              : "Sign Up"}
        </button>

        <p className="auth-page__footer text-sm text-center mt-4">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;

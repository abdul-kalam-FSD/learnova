import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Requests that are ALLOWED to return a 401 as a normal, expected
// outcome the calling page already displays inline (wrong password,
// duplicate email) — these must not be treated as "your session
// expired".
//
// BUGFIX (routing audit): this previously listed "/auth/signup",
// which doesn't match any real endpoint — Signup.jsx actually posts
// to "/auth/register" for a new account. That typo meant the one
// case this list exists to protect never worked for signups. It also
// didn't cover "/auth/upgrade-guest", the *other* call Signup.jsx
// makes (when a guest is converting to a real account) — and that
// one genuinely can 401, since it goes through `protect` and a
// guest's token can go stale mid-form. Without this entry, that 401
// was hijacked by the interceptor below: token/guest-flags wiped and
// a hard `window.location.assign` to /session-expired, silently
// destroying whatever the user had just typed into the signup form
// instead of Signup.jsx's own inline `catch { setError(...) }`.
const AUTH_ATTEMPT_PATHS = ["/auth/login", "/auth/register", "/auth/upgrade-guest"];

// Part 14 of the redesign spec calls out "Session Expired" as its own
// state, distinct from a generic error: previously an expired/invalid
// token just made every API call fail, and each page's own catch
// block showed a generic "couldn't load" message with a retry button
// that would loop forever, never explaining what actually happened.
// This intercepts every 401 exactly once, clears the dead token
// (inlined rather than importing clearGuestSession from
// utils/guestSession.js, which itself imports this file), and sends
// the user to a dedicated explanation screen instead.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthAttempt = AUTH_ATTEMPT_PATHS.some((p) => url.includes(p));
    const alreadyOnSessionExpired = window.location.pathname === "/session-expired";

    if (status === 401 && !isAuthAttempt && !alreadyOnSessionExpired) {
      localStorage.removeItem("token");
      localStorage.removeItem("isGuest");
      localStorage.removeItem("guestGrade");
      localStorage.removeItem("guestStream");
      const redirectTo = encodeURIComponent(window.location.pathname);
      window.location.assign(`/session-expired?redirect=${redirectTo}`);
    }

    return Promise.reject(error);
  },
);

export default api;

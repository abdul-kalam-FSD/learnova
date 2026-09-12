import api from "../api/axios";

// Public "play without login" support. A guest never sees a signup
// form — the first time they try to actually open a chapter or play
// a game, we silently mint an anonymous account scoped to the
// standard they picked and store its token exactly like a normal
// login. Every existing ProtectedRoute / protect-middleware-gated
// page then just works, since it only ever checks for a token.
const GUEST_GRADE_KEY = "guestGrade";
const GUEST_STREAM_KEY = "guestStream";

export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

export function isGuest() {
  return localStorage.getItem("isGuest") === "true";
}

// Ensures a usable session (real login OR guest) exists for the given
// grade before navigating into a protected page. If the visitor is
// already logged in (real account or an existing guest session for
// this same grade), does nothing. If they're a guest for a
// *different* grade than the one just selected, starts a fresh guest
// session for the new grade rather than reusing the stale one.
export async function ensureGuestSession(grade, streamId) {
  const existingToken = localStorage.getItem("token");
  const existingGrade = localStorage.getItem(GUEST_GRADE_KEY);
  const existingStream = localStorage.getItem(GUEST_STREAM_KEY);
  const sameContext =
    Number(existingGrade) === Number(grade) &&
    (existingStream || null) === (streamId || null);

  if (existingToken && (!isGuest() || sameContext)) {
    return { alreadySignedIn: !isGuest() };
  }

  const res = await api.post("/auth/guest", { grade, streamId });
  localStorage.setItem("token", res.data.token);
  localStorage.setItem("isGuest", "true");
  localStorage.setItem(GUEST_GRADE_KEY, String(grade));
  if (streamId) {
    localStorage.setItem(GUEST_STREAM_KEY, streamId);
  } else {
    localStorage.removeItem(GUEST_STREAM_KEY);
  }
  return { alreadySignedIn: false, isNewGuest: true };
}

export function clearGuestSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("isGuest");
  localStorage.removeItem(GUEST_GRADE_KEY);
  localStorage.removeItem(GUEST_STREAM_KEY);
}

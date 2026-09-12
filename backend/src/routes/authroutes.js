const express = require("express");
const router = express.Router();
const {
  register,
  login,
  guestLogin,
  upgradeGuest,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authControllers");
const { protect } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

// Integration test suites legitimately register/login many accounts
// in quick succession from a single IP (Supertest talking to the app
// directly) — that's real test traffic, not brute-forcing, so the
// limiter is a no-op under NODE_ENV=test (which Jest sets
// automatically) and unchanged in every other environment.
const isTestEnv = process.env.NODE_ENV === "test";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 attempts per IP per window
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

// Guests hit this once per public-play session (not once per login
// attempt like /login or /register), and there's no password to
// brute-force here, so a separate, more generous limiter avoids
// locking out a classroom of students behind the same school IP.
const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/guest", guestLimiter, guestLogin);
// Requires the guest's own JWT (protect), not a fresh unauthenticated
// request — this is "turn my current session into an account", not a
// second registration path, so it needs `protect` to know *which*
// guest session is upgrading. Same rate-limit sensitivity as
// register/login (a real password gets set here).
router.post("/upgrade-guest", authLimiter, protect, upgradeGuest);
router.get("/me", protect, getMe);
// Same rate-limit sensitivity as login/register: an attacker could
// otherwise use an unlimited forgot-password endpoint to mass-probe
// which emails are registered via response timing, or to spam a
// target's inbox once real email sending is wired in.
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
module.exports = router;

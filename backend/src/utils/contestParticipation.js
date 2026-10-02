const mongoose = require("mongoose");
const Contest = require("../models/Contest");
const User = require("../models/User");
const { computeContestPhase } = require("./contestLifecycle");

// Server-side rules for a student taking part in a contest, shared by the
// student contest endpoints and by the existing game endpoints
// (startGame / getGameContentList / submitGameAttempt / completeGame).
//
// Everything here is decided from the database and the SERVER clock. The
// only things the client contributes are ids, and every id is re-checked.
//
// Failures are returned as { error: { status, message, code } } so callers
// can respond with the project's usual `res.status(x).json({ message })`
// shape (`code` is additive, like TEACHER_PENDING elsewhere).

const fail = (status, message, code) => ({ error: { status, message, code } });

const idOf = (v) => (v == null ? null : v.toString());

// Only real (non-guest) students take part in teacher contests. Guests
// are throw-away "play without login" accounts; teachers/admins manage
// contests through their own portals. Role is read fresh from the DB
// (same reasoning as requireTeacher/requireAdmin).
async function loadEligibleStudent(userId) {
  const user = await User.findById(userId).select("role grade is_guest");
  if (!user) return fail(401, "Not authorized");
  if (user.role !== "student") {
    return fail(403, "Only students can take part in contests", "STUDENT_ONLY");
  }
  if (user.is_guest) {
    return fail(403, "Create a free account to join contests", "GUEST_NOT_ALLOWED");
  }
  return { user };
}

// What a student is allowed to SEE: PUBLISHED contests for their own
// grade, taken from the database (never from the request).
const isVisibleToStudent = (contest, user) =>
  Boolean(contest) &&
  contest.status === "PUBLISHED" &&
  user.grade != null &&
  Number(contest.grade) === Number(user.grade);

// Full "may this student start playing this contest right now" check.
// Order matters for what is revealed: an invisible contest (draft,
// pending, rejected, other grade, unknown id) is always a plain 404 so
// its existence isn't leaked; only a contest the student can legitimately
// see gets the more specific upcoming/ended messages.
//
// `contentId` (optional) additionally requires that GameContent to be one
// of the contest's challenges — this is what stops a student pairing a
// real contest id with an unrelated game.
async function resolveContestForPlay({ userId, contestId, contentId, now = new Date() }) {
  if (typeof contestId !== "string" || !mongoose.Types.ObjectId.isValid(contestId)) {
    return fail(400, "Invalid contestId");
  }

  const eligible = await loadEligibleStudent(userId);
  if (eligible.error) return eligible;
  const { user } = eligible;

  const contest = await Contest.findById(contestId);
  if (!isVisibleToStudent(contest, user)) {
    return fail(404, "Contest not found");
  }

  // Server time only — never the browser's clock.
  const phase = computeContestPhase(contest, now);
  if (phase === "UPCOMING") {
    return fail(403, "This contest hasn't started yet", "CONTEST_NOT_STARTED");
  }
  if (phase !== "ACTIVE") {
    return fail(403, "This contest has ended", "CONTEST_ENDED");
  }

  if (contentId !== undefined) {
    const isChallenge = contest.challenges.some((c) => idOf(c.game_content_id) === idOf(contentId));
    if (!isChallenge) {
      return fail(403, "That game is not part of this contest", "CONTEST_CHALLENGE_MISMATCH");
    }
  }

  return { contest, user, phase };
}

// Used when a contest session is already open and the student submits an
// answer or claims completion: the contest must still be published and
// inside its window. Returns null when scoring is still allowed.
//
// A session that is ALREADY completed is never checked here (its stored
// result is simply returned), so a finished result can't be lost when
// the window closes afterwards.
async function checkContestSessionOpen(contestId, now = new Date()) {
  const contest = await Contest.findById(contestId).select("status start_at end_at");
  if (!contest || contest.status !== "PUBLISHED") {
    return fail(409, "This contest is no longer available", "CONTEST_UNAVAILABLE");
  }
  if (computeContestPhase(contest, now) !== "ACTIVE") {
    return fail(409, "This contest has ended, so this game can no longer be scored", "CONTEST_ENDED");
  }
  return null;
}

// MongoDB duplicate-key error (the unique contest-session index).
const isDuplicateKeyError = (err) => Boolean(err) && (err.code === 11000 || err.code === 11001);

module.exports = {
  loadEligibleStudent,
  isVisibleToStudent,
  resolveContestForPlay,
  checkContestSessionOpen,
  isDuplicateKeyError,
};

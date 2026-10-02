// Contest lifecycle + pure input validation (no DB access, so it is
// unit-testable without MongoDB — see tests/unit/contestLifecycle.test.js).
//
// STORED status is deliberately the smallest set that supports
// "teacher creates -> admin approves -> students participate":
//
//   DRAFT             teacher saved it, not yet sent for review
//   PENDING_APPROVAL  teacher submitted it; waits for the admin-approval
//                     task (NOT built yet — nothing moves a contest past
//                     this state today)
//   PUBLISHED         approved and visible to students
//   REJECTED          admin sent it back; teacher can fix + resubmit
//
// ACTIVE / COMPLETED are intentionally NOT stored. For a PUBLISHED
// contest they are pure functions of the clock and start_at/end_at, so
// storing them would need a cron to flip them and could drift out of
// sync. computeContestPhase() derives them on read instead.

const CONTEST_STATUSES = ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED"];

// Statuses a teacher may put a contest into through the API. PUBLISHED
// and REJECTED are reserved for the future admin-approval task.
const TEACHER_SETTABLE_STATUSES = ["DRAFT", "PENDING_APPROVAL"];

// The ONE place lifecycle rules live. Every endpoint that changes a
// contest's status must ask canTransition() first and must then apply
// the change with a conditional update on the expected current status
// (so two racing requests can't both win).
//
//   DRAFT ------teacher submit-----> PENDING_APPROVAL
//   REJECTED ---teacher resubmit---> PENDING_APPROVAL
//   PENDING_APPROVAL --admin approve--> PUBLISHED   (terminal for now)
//   PENDING_APPROVAL --admin reject---> REJECTED
//
// Anything not listed is invalid: DRAFT -> PUBLISHED, REJECTED ->
// PUBLISHED (must be resubmitted first), PUBLISHED -> anything, and any
// teacher/student attempt to publish or reject.
const TRANSITIONS = [
  { from: "DRAFT", to: "PENDING_APPROVAL", role: "teacher" },
  { from: "REJECTED", to: "PENDING_APPROVAL", role: "teacher" },
  { from: "PENDING_APPROVAL", to: "PUBLISHED", role: "admin" },
  { from: "PENDING_APPROVAL", to: "REJECTED", role: "admin" },
];

// "teacher" transitions are the owner's own action (enforced by the
// caller checking ownership); "admin" transitions require the admin
// role. An admin acting as the owner of their own contest may also
// perform the owner ("teacher") transitions.
const canTransition = (from, to, actorRole) =>
  TRANSITIONS.some(
    (t) => t.from === from && t.to === to && (t.role === actorRole || (t.role === "teacher" && actorRole === "admin")),
  );

// Statuses an admin can see in the review queue. DRAFTs are the
// teacher's private work-in-progress and are deliberately not listed.
const ADMIN_VISIBLE_STATUSES = ["PENDING_APPROVAL", "PUBLISHED", "REJECTED"];

const REVIEW_NOTE_MIN = 5;
const REVIEW_NOTE_MAX = 500; // matches Contest.review_note maxlength

// Validates an admin's review note. Rejection requires a meaningful
// reason (teachers need to know what to fix); approval accepts an
// optional note. Returns { error } or { value } (trimmed string).
const validateReviewNote = (note, { required }) => {
  if (note !== undefined && note !== null && typeof note !== "string") {
    return { error: "Review note must be text" };
  }
  const trimmed = (note || "").trim();
  if (required && trimmed.length < REVIEW_NOTE_MIN) {
    return { error: `Please give a reason of at least ${REVIEW_NOTE_MIN} characters` };
  }
  if (trimmed.length > REVIEW_NOTE_MAX) {
    return { error: `Review note must be ${REVIEW_NOTE_MAX} characters or fewer` };
  }
  return { value: trimmed };
};

const VALID_GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000;
const MAX_CHALLENGES = 20;
// Tolerance so "start now" from a browser with a slightly-behind clock
// isn't rejected as "in the past".
const START_GRACE_MS = 5 * 60 * 1000;

// Time-derived phase, only meaningful for PUBLISHED contests.
//   UPCOMING -> before start_at
//   ACTIVE   -> start_at <= now < end_at
//   ENDED    -> now >= end_at
// Any non-PUBLISHED contest has no phase (null) — it isn't live yet.
const computeContestPhase = (contest, now = new Date()) => {
  if (!contest || contest.status !== "PUBLISHED") return null;
  const t = now.getTime();
  if (t < new Date(contest.start_at).getTime()) return "UPCOMING";
  if (t < new Date(contest.end_at).getTime()) return "ACTIVE";
  return "ENDED";
};

const isValidObjectIdString = (value) => typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

// Validates the SHAPE of a create-contest body. Does not touch the DB —
// the controller separately verifies that subject/chapter/games really
// exist and belong together. Returns { error } (a 400 message) or
// { value } (normalised fields).
const validateContestInput = (body = {}, now = new Date()) => {
  const { title, description, grade, subjectId, chapterId, challengeIds, startAt, endAt, submitForApproval } = body;

  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "A contest title is required" };
  }
  if (title.trim().length > TITLE_MAX) {
    return { error: `Title must be ${TITLE_MAX} characters or fewer` };
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    return { error: "Description must be text" };
  }
  if ((description || "").trim().length > DESCRIPTION_MAX) {
    return { error: `Description must be ${DESCRIPTION_MAX} characters or fewer` };
  }

  const gradeNum = Number(grade);
  if (!Number.isInteger(gradeNum) || !VALID_GRADES.includes(gradeNum)) {
    return { error: "A valid grade (4-12) is required" };
  }

  if (!isValidObjectIdString(subjectId)) {
    return { error: "A valid subjectId is required" };
  }
  if (chapterId !== undefined && chapterId !== null && chapterId !== "" && !isValidObjectIdString(chapterId)) {
    return { error: "Invalid chapterId" };
  }

  if (!Array.isArray(challengeIds) || challengeIds.length === 0) {
    return { error: "Select at least one game/challenge for the contest" };
  }
  if (!challengeIds.every(isValidObjectIdString)) {
    return { error: "Invalid challenge id in challengeIds" };
  }
  const uniqueChallengeIds = [...new Set(challengeIds)];
  if (uniqueChallengeIds.length > MAX_CHALLENGES) {
    return { error: `A contest can have at most ${MAX_CHALLENGES} challenges` };
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (!startAt || Number.isNaN(start.getTime())) {
    return { error: "A valid start date/time is required" };
  }
  if (!endAt || Number.isNaN(end.getTime())) {
    return { error: "A valid end date/time is required" };
  }
  if (end.getTime() <= start.getTime()) {
    return { error: "End time must be after start time" };
  }
  if (start.getTime() < now.getTime() - START_GRACE_MS) {
    return { error: "Start time cannot be in the past" };
  }

  return {
    value: {
      title: title.trim(),
      description: (description || "").trim(),
      grade: gradeNum,
      subjectId,
      chapterId: chapterId || null,
      challengeIds: uniqueChallengeIds,
      startAt: start,
      endAt: end,
      status: submitForApproval === true ? "PENDING_APPROVAL" : "DRAFT",
    },
  };
};

module.exports = {
  CONTEST_STATUSES,
  TEACHER_SETTABLE_STATUSES,
  TRANSITIONS,
  ADMIN_VISIBLE_STATUSES,
  REVIEW_NOTE_MIN,
  REVIEW_NOTE_MAX,
  canTransition,
  validateReviewNote,
  VALID_GRADES,
  TITLE_MAX,
  DESCRIPTION_MAX,
  MAX_CHALLENGES,
  START_GRACE_MS,
  computeContestPhase,
  validateContestInput,
};

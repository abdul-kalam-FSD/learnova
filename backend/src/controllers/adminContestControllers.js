const mongoose = require("mongoose");
const { sendError } = require("../utils/sendError");
const Contest = require("../models/Contest");
const User = require("../models/User");
const GameContent = require("../models/GameContent");
const { buildContestResponses } = require("./contestControllers");
const { ADMIN_VISIBLE_STATUSES, canTransition, validateReviewNote } = require("../utils/contestLifecycle");

// Admin contest review. Mounted under /api/admin (adminroutes.js), which
// already runs protect + requireAdmin for every route, so nothing here
// re-implements auth. The teacher-facing contest routes are separate and
// remain teacher-scoped.
//
// Security notes:
//  * Status, reviewed_by and reviewed_at are decided ENTIRELY here. The
//    only thing read from the request body is the review `note`; any
//    `status` / `reviewed_by` / `reviewed_at` a client sends is ignored.
//  * The status change is a conditional update on the expected current
//    status, so a repeated or racing approve/reject can't apply twice.
//  * Responses never include GameContent.payload (answer keys) — only
//    title / type / difficulty, via buildContestResponses.

const DEFAULT_PAGE_SIZE = 20;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE));
  return { page, limit, skip: (page - 1) * limit };
}

const idOf = (v) => (v == null ? null : v.toString());

// Adds who made / reviewed each contest to the shared teacher-side shape.
async function buildAdminResponses(contests) {
  const base = await buildContestResponses(contests);
  const userIds = [
    ...new Set(contests.flatMap((c) => [idOf(c.teacher_id), idOf(c.reviewed_by)]).filter(Boolean)),
  ];
  const users = userIds.length ? await User.find({ _id: { $in: userIds } }).select("name email") : [];
  const userById = {};
  for (const u of users) userById[idOf(u._id)] = u;

  return base.map((row, i) => {
    const c = contests[i];
    const teacher = userById[idOf(c.teacher_id)];
    const reviewer = c.reviewed_by ? userById[idOf(c.reviewed_by)] : null;
    return {
      ...row,
      teacher: teacher
        ? { id: teacher._id, name: teacher.name, email: teacher.email }
        : { id: c.teacher_id, name: "Deleted user", email: null },
      reviewedBy: c.reviewed_by
        ? { id: c.reviewed_by, name: reviewer ? reviewer.name : "Deleted user" }
        : null,
    };
  });
}

// GET /api/admin/contests?status=PENDING_APPROVAL|PUBLISHED|REJECTED&page=&limit=
// Contests teachers have submitted for review. DRAFTs are private to the
// teacher and never listed. Also returns per-status counts for the tabs.
const listContests = async (req, res) => {
  try {
    const { status } = req.query;
    if (status !== undefined && status !== "" && !ADMIN_VISIBLE_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Use one of: ${ADMIN_VISIBLE_STATUSES.join(", ")}` });
    }
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { status: status ? status : { $in: ADMIN_VISIBLE_STATUSES } };
    // Review queue: longest-waiting first. Everything else: most recent activity first.
    const sort = status === "PENDING_APPROVAL" ? { submitted_at: 1, createdAt: 1 } : { updatedAt: -1 };

    const [contests, total, ...statusCounts] = await Promise.all([
      Contest.find(filter).sort(sort).skip(skip).limit(limit),
      Contest.countDocuments(filter),
      ...ADMIN_VISIBLE_STATUSES.map((s) => Contest.countDocuments({ status: s })),
    ]);

    const rows = await buildAdminResponses(contests);
    const counts = {};
    ADMIN_VISIBLE_STATUSES.forEach((s, i) => {
      counts[s] = statusCounts[i];
    });

    res.status(200).json({
      // The list only needs a count; the full challenge list comes from
      // the detail endpoint when the admin opens a contest.
      contests: rows.map(({ challenges, ...rest }) => ({ ...rest, challengeCount: challenges.length })),
      counts,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Shared lookup: validates the id and loads an admin-visible contest.
// Returns { contest } or { status, message }.
async function loadReviewableContest(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { status: 400, message: "Invalid contest id" };
  const contest = await Contest.findById(id);
  // DRAFTs are the teacher's private work; from the admin's side they
  // don't exist yet.
  if (!contest || !ADMIN_VISIBLE_STATUSES.includes(contest.status)) {
    return { status: 404, message: "Contest not found" };
  }
  return { contest };
}

// GET /api/admin/contests/:id
const getContestDetail = async (req, res) => {
  try {
    const loaded = await loadReviewableContest(req.params.id);
    if (!loaded.contest) return res.status(loaded.status).json({ message: loaded.message });
    const [detail] = await buildAdminResponses([loaded.contest]);
    res.status(200).json(detail);
  } catch (err) {
    sendError(res, err);
  }
};

const conflictMessage = (contest, verb) =>
  contest.status === "PUBLISHED" || contest.status === "REJECTED"
    ? `This contest has already been ${contest.status === "PUBLISHED" ? "published" : "rejected"}, so it cannot be ${verb}`
    : `Only contests awaiting approval can be ${verb} (current status: ${contest.status})`;

// Applies a review decision. `to` is PUBLISHED or REJECTED — chosen by
// the endpoint, never by the client.
async function applyReview(req, res, { to, verb, noteRequired, extraChecks }) {
  const loaded = await loadReviewableContest(req.params.id);
  if (!loaded.contest) return res.status(loaded.status).json({ message: loaded.message });
  const { contest } = loaded;

  const noteResult = validateReviewNote(req.body?.note, { required: noteRequired });
  if (noteResult.error) return res.status(400).json({ message: noteResult.error });

  // Centralised lifecycle rule (utils/contestLifecycle.js).
  if (!canTransition(contest.status, to, "admin")) {
    return res.status(409).json({ message: conflictMessage(contest, verb) });
  }

  if (extraChecks) {
    const failure = await extraChecks(contest);
    if (failure) return res.status(failure.status).json({ message: failure.message });
  }

  // Conditional on the status we just validated: if another admin acted
  // in the meantime this matches nothing instead of overwriting them.
  const updated = await Contest.findOneAndUpdate(
    { _id: contest._id, status: contest.status },
    {
      $set: {
        status: to,
        reviewed_by: req.userId, // from the verified token, never the body
        reviewed_at: new Date(), // server clock, never the body
        // Overwritten on every decision so a stale rejection reason can
        // never linger on a later-approved contest.
        review_note: noteResult.value,
      },
    },
    { new: true },
  );
  if (!updated) {
    return res.status(409).json({ message: "This contest was just reviewed by someone else. Please refresh." });
  }

  const [detail] = await buildAdminResponses([updated]);
  return res.status(200).json(detail);
}

// POST /api/admin/contests/:id/approve   body: { note? }
// PENDING_APPROVAL -> PUBLISHED
const approveContest = async (req, res) => {
  try {
    await applyReview(req, res, {
      to: "PUBLISHED",
      verb: "approved",
      noteRequired: false,
      extraChecks: async (contest) => {
        // Don't publish something students could never play.
        if (new Date(contest.end_at).getTime() <= Date.now()) {
          return {
            status: 400,
            message: "This contest's end time has already passed. Reject it with a note so the teacher can reschedule.",
          };
        }
        // Games can be deleted by an admin after the teacher picked them.
        const ids = contest.challenges.map((ch) => idOf(ch.game_content_id));
        const existing = await GameContent.find({ _id: { $in: ids } }).select("_id");
        if (existing.length !== new Set(ids).size) {
          return {
            status: 409,
            message: "One or more games in this contest no longer exist. Reject it with a note so the teacher can fix it.",
          };
        }
        return null;
      },
    });
  } catch (err) {
    sendError(res, err);
  }
};

// POST /api/admin/contests/:id/reject   body: { note }  (note required)
// PENDING_APPROVAL -> REJECTED
const rejectContest = async (req, res) => {
  try {
    await applyReview(req, res, { to: "REJECTED", verb: "rejected", noteRequired: true });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { listContests, getContestDetail, approveContest, rejectContest };

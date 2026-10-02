const { sendError } = require("../utils/sendError");
const { loadEligibleStudent } = require("../utils/contestParticipation");

// Must run after `protect` (needs req.userId). Mirrors requireTeacher /
// requireAdmin: the role is read fresh from the DB, not trusted from the
// JWT. Only real (non-guest) students pass; teachers/admins use their
// own portals, guests can't join teacher contests.
//
// Attaches the freshly-loaded user as req.studentUser so handlers use the
// server-side grade and never anything sent by the client.
const requireStudent = async (req, res, next) => {
  try {
    const eligible = await loadEligibleStudent(req.userId);
    if (eligible.error) {
      const { status, message, code } = eligible.error;
      return res.status(status).json({ message, ...(code ? { code } : {}) });
    }
    req.studentUser = eligible.user;
    next();
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { requireStudent };

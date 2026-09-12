const User = require("../models/User");
const { sendError } = require("../utils/sendError");

// Must run after `protect` (needs req.userId). Mirrors requireAdmin's
// pattern — reads the role fresh from the DB rather than trusting the
// JWT payload, so a role change takes effect on the very next request.
//
// Admins pass too: they already have full access via /api/admin, and
// nothing about the teacher analytics endpoints should be off-limits
// to them.
const requireTeacher = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("role status");

    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (user.role !== "teacher" && user.role !== "admin") {
      return res.status(403).json({ message: "Teacher access required" });
    }

    // A self-registered teacher (see authControllers.register) starts
    // "pending" and stays that way until an admin approves them
    // (adminControllers.setUserRole). Admins are never "pending", so
    // this only ever blocks the self-signup path, not the pre-existing
    // admin-promotion path. `code` lets the frontend show a distinct
    // "your account is awaiting approval" screen instead of a generic
    // Access Denied.
    if (user.role === "teacher" && user.status === "pending") {
      return res.status(403).json({
        message: "Your teacher account is pending admin approval",
        code: "TEACHER_PENDING",
      });
    }

    req.userRole = user.role;
    next();
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { requireTeacher };

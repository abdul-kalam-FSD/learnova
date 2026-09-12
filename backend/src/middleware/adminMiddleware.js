const User = require("../models/User");
const { sendError } = require("../utils/sendError");

// Must run after `protect` (needs req.userId). Checks the role by
// reading the user fresh from the DB rather than trusting anything
// from the JWT payload, so revoking admin access takes effect on the
// very next request instead of waiting for the token to expire.
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("role");

    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { requireAdmin };

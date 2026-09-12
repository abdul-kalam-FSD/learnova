const { sendError } = require("../utils/sendError");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Stream = require("../models/Stream");
const { sendPasswordResetEmail } = require("../utils/mailer");

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

const hashToken = (rawToken) =>
  crypto.createHash("sha256").update(rawToken).digest("hex");

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const register = async (req, res) => {
  try {
    const { name, email, password, grade, streamId, role } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Public signup may only self-select "student" or "teacher" — never
    // "admin". Anything else in the body (missing, unrecognized, or an
    // attempted "admin") silently falls back to "student" rather than
    // erroring, since that's the safe default and the pre-existing
    // behavior for every caller that never sent a role at all (e.g. the
    // current frontend Signup form, existing tests).
    const requestedRole = role === "teacher" ? "teacher" : "student";

    let gradeNum = null;
    let stream_id = null;

    if (requestedRole === "student") {
      gradeNum = Number(grade);
      if (!gradeNum || gradeNum < 4 || gradeNum > 12) {
        return res.status(400).json({ message: "A valid grade (4-12) is required" });
      }
      if (streamId) {
        if (gradeNum !== 11 && gradeNum !== 12) {
          return res.status(400).json({ message: "Streams only apply to Grade 11 or 12" });
        }
        if (!mongoose.Types.ObjectId.isValid(streamId)) {
          return res.status(400).json({ message: "Invalid stream id" });
        }
        const stream = await Stream.findById(streamId);
        if (!stream || stream.grade !== gradeNum) {
          return res.status(404).json({ message: "Stream not found for this grade" });
        }
        stream_id = stream._id;
      }
    }
    // Teachers don't have a grade/stream at all — a self-registered
    // teacher account never has this data collected or invented, and
    // the schema no longer requires it for non-student roles (see
    // models/User.js).

    const password_hash = await bcrypt.hash(password, 12);

    // A self-registered teacher account cannot use the platform's
    // teacher features (rosters, other students' data) until an
    // existing admin approves them — see requireTeacher and
    // adminControllers.setUserRole. Students are active immediately;
    // there's no comparable trust boundary for a student account.
    const status = requestedRole === "teacher" ? "pending" : "active";

    const user = await User.create({
      name,
      email,
      password_hash,
      role: requestedRole,
      status,
      grade: gradeNum,
      stream_id,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        status: user.status,
        grade: user.grade,
        stream_id: user.stream_id,
      },
      token,
    });
  } catch (err) {
    sendError(res, err);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        status: user.status,
        grade: user.grade,
      },
      token,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Public "play without login": creates an anonymous student account
// (name only, no email/password) scoped to the grade the guest picked
// on the public Home hub, and issues the same JWT shape as a real
// login. This is deliberately NOT a parallel auth system — reusing
// `protect` + a normal User document means every existing
// chapters/games/mastery/XP route keeps working for guests with zero
// changes, instead of forking that logic. Grade is fixed at creation
// (matches the standard the guest selected); if they later switch
// standards on the public hub, a fresh guest session is created for
// the new grade rather than mutating this one.
const guestLogin = async (req, res) => {
  try {
    const { grade, streamId } = req.body;
    const gradeNum = Number(grade);

    if (!gradeNum || gradeNum < 4 || gradeNum > 12) {
      return res.status(400).json({ message: "A valid standard (4-12) is required" });
    }

    let stream_id = null;
    if (streamId) {
      if (gradeNum !== 11 && gradeNum !== 12) {
        return res.status(400).json({ message: "Streams only apply to standard 11 or 12" });
      }
      if (!mongoose.Types.ObjectId.isValid(streamId)) {
        return res.status(400).json({ message: "Invalid stream id" });
      }
      // Re-validate server-side rather than trusting the client's
      // streamId at face value — a guest could otherwise hand-craft
      // a stream_id from a different grade to see content they
      // shouldn't (resolveUserSubjects.js trusts stream.grade ===
      // user.grade, so this check has to happen here, not there).
      const stream = await Stream.findById(streamId);
      if (!stream || stream.grade !== gradeNum) {
        return res.status(404).json({ message: "Stream not found for this standard" });
      }
      stream_id = stream._id;
    }

    const user = await User.create({
      name: "Guest",
      role: "student",
      grade: gradeNum,
      stream_id,
      is_guest: true,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        grade: user.grade,
        stream_id: user.stream_id,
        is_guest: true,
      },
      token,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Section 18 (Guest -> Registered User Path): converts the current
// guest session's own User document into a real account in place,
// rather than creating a second document and copying data over. This
// is deliberately an "upgrade", not a "merge" — since a guest's _id
// never changes, every QuizSession/UserConceptMastery row that
// already points at this user keeps working with zero migration
// needed, and there's no risk of picking the wrong record to keep or
// double-counting XP the way a two-account merge would have.
//
// This only covers "guest turns their own play into an account" — it
// deliberately does NOT cover "guest logs into a different, already-
// existing account" (that's just POST /auth/login, and it correctly
// abandons the guest's anonymous progress rather than pretending to
// merge two people's XP/mastery together, which would need conflict
// resolution this app doesn't attempt).
const upgradeGuest = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Guards against a real registered account calling this route to
    // silently reset its own password/email — this endpoint is only
    // for turning a guest session into an account, never for editing
    // an existing one.
    if (!user.is_guest) {
      return res.status(400).json({ message: "This account is already registered" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    user.name = name;
    user.email = email;
    user.password_hash = await bcrypt.hash(password, 12);
    user.is_guest = false;
    // grade/stream_id/xp_total/streak_count are left untouched on
    // purpose — that's the guest's real progress, and the entire
    // point of an in-place upgrade instead of a fresh registration.
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        grade: user.grade,
        stream_id: user.stream_id,
        is_guest: false,
      },
      token,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Step 1 of password reset: always responds with the same generic
// success message whether or not the email is registered, and takes
// the same rough amount of work either way (a real bcrypt-speed
// operation isn't in this path, but we still await the email-account
// lookup before responding) — this is the standard defense against
// using "forgot password" as an account-existence oracle. Guests are
// excluded on purpose: they have no email/password to reset.
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const generic = {
      message: "If that email is registered, we've sent password reset instructions.",
    };

    if (!email) {
      return res.status(200).json(generic);
    }

    const user = await User.findOne({ email, is_guest: { $ne: true } });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.reset_password_token_hash = hashToken(rawToken);
      user.reset_password_expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
      // See utils/mailer.js: no email provider is wired in yet, so
      // this currently only logs the link server-side rather than
      // actually emailing the user — a documented deployment
      // requirement, not a silent gap.
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    // Same response whether or not `user` was found.
    res.status(200).json(generic);
  } catch (err) {
    sendError(res, err);
  }
};

// Step 2: exchanges a valid, unexpired reset token for a new password.
// The token itself is never stored — only its SHA-256 hash — so a
// database compromise alone can't hand out a usable reset link, the
// same principle as password_hash for the login password itself.
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      reset_password_token_hash: tokenHash,
      reset_password_expires: { $gt: new Date() },
    }).select("+reset_password_token_hash +reset_password_expires");

    if (!user) {
      return res.status(400).json({ message: "This reset link is invalid or has expired" });
    }

    user.password_hash = await bcrypt.hash(password, 12);
    user.reset_password_token_hash = null;
    user.reset_password_expires = null;
    await user.save();

    res.status(200).json({ message: "Password updated. You can now log in." });
  } catch (err) {
    sendError(res, err);
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password_hash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Match the same explicit response shape every other auth endpoint
    // (register/login/guestLogin/upgradeGuest) already uses -- this was
    // previously the only endpoint returning the raw Mongoose doc
    // (only `_id`, no `id` virtual, since the User schema doesn't set
    // toJSON:{virtuals:true}), which silently broke any caller relying
    // on `user.id` after a reconnect. No known frontend caller reads
    // `_id`/`id` off this response today, so this is purely additive.
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        is_guest: user.is_guest,
        grade: user.grade,
        stream_id: user.stream_id,
        xp_total: user.xp_total,
        streak_count: user.streak_count,
        last_active_date: user.last_active_date,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  register,
  login,
  guestLogin,
  upgradeGuest,
  getMe,
  forgotPassword,
  resetPassword,
};

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Guests never provide an email/password — only required for a
    // real registered account. `sparse: true` on the unique index
    // lets many guest documents omit email at once without violating
    // uniqueness (a plain unique index would only allow ONE doc with
    // email: undefined).
    email: {
      type: String,
      required: function () {
        return !this.is_guest;
      },
      unique: true,
      sparse: true,
    },
    password_hash: {
      type: String,
      required: function () {
        return !this.is_guest;
      },
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    // Approval gate for self-registered teacher accounts (see
    // authControllers.register). Students and admins are always
    // "active" — only a public teacher signup starts "pending" until
    // an existing admin approves them (adminControllers.setUserRole
    // flips this back to "active"). requireTeacher middleware checks
    // this so a pending teacher's JWT is valid (they can log in and
    // see a "pending approval" state) but cannot reach real
    // teacher/student-data routes until approved.
    status: {
      type: String,
      enum: ["active", "pending"],
      default: "active",
    },
    // Public "play without login" support: a guest is a normal User
    // document (so it plugs into every existing XP/mastery/session
    // flow unchanged) but flagged so the UI and any future
    // guest -> real-account upgrade flow can tell it apart. No PII
    // is collected to create one.
    is_guest: { type: Boolean, default: false },
    // Grade only applies to students (teachers/admins don't have a
    // standard) — required only when this is a real student account,
    // so public teacher signup can create a User document without a
    // grade at all instead of forcing a fake/placeholder value into a
    // field that means something specific elsewhere in the app.
    grade: {
      type: Number,
      enum: [4, 5, 6, 7, 8, 9, 10, 11, 12],
      required: function () {
        return !this.is_guest && this.role === "student";
      },
    },
    // Only meaningful for grade 11/12 (see models/Stream.js). Left
    // null for grades 4-10, and for 11/12 users who haven't picked a
    // stream yet — in that case content queries fall back to the old
    // flat "every subject for this grade" behaviour so nothing breaks
    // for existing accounts.
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
    xp_total: { type: Number, default: 0 },
    streak_count: { type: Number, default: 0 },
    last_active_date: { type: Date },
    // Forgot-password flow (authControllers.forgotPassword/resetPassword).
    // Only the SHA-256 hash of the reset token is ever stored — same
    // principle as password_hash, so a database read alone can never
    // hand out a usable reset link. 30-minute expiry enforced in the
    // controller, not here.
    reset_password_token_hash: { type: String, default: null, select: false },
    reset_password_expires: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);

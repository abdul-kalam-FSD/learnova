// Every controller in this app already routes errors through
// utils/sendError.js (verified during the audit — no stack traces or
// DB internals found leaking anywhere). These two are a safety net
// for the cases that bypass a controller entirely: an unmatched
// route, or a thrown error in middleware/routing itself.

const notFound = (req, res) => {
  res.status(404).json({ message: "Route not found" });
};

// Must be registered with all 4 args (err, req, res, next) — that's
// how Express recognizes it as an error-handling middleware.
const globalErrorHandler = (err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ message: "Something went wrong" });
};

module.exports = { notFound, globalErrorHandler };

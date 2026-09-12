// Central place for the "don't leak internals" catch-block pattern.
// Logs the real error server-side, sends a message to the client.
//
// Mongoose validation/cast/duplicate-key errors are a normal result of
// bad input (e.g. an out-of-range grade), not a server fault — they're
// surfaced as 400s with their own message so the frontend can show
// something actionable instead of a blank "Something went wrong",
// while everything else still collapses to a generic 500 so internals
// (stack traces, DB details) never leak to the client.
const sendError = (res, err, status = 500, publicMessage = "Something went wrong") => {
  console.error(err);

  if (status === 500) {
    if (err?.name === "ValidationError") {
      const firstMessage = Object.values(err.errors || {})[0]?.message || "Invalid input";
      return res.status(400).json({ message: firstMessage });
    }
    if (err?.name === "CastError") {
      return res.status(400).json({ message: "Invalid value provided" });
    }
    if (err?.code === 11000) {
      return res.status(400).json({ message: "This record already exists" });
    }
  }

  res.status(status).json({ message: publicMessage });
};

module.exports = { sendError };

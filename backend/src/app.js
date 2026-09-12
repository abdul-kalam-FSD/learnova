const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config({ quiet: true });
const connectDB = require("./config/db");

connectDB();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Learnova API running" });
});

// Route mounting lives here (not server.js) so that requiring this
// file directly — as every integration test does via
// require("../../src/app") — gets a fully wired app without needing
// a listening HTTP server. server.js now only calls app.listen().
const { protect } = require("./middleware/authMiddleware");

app.use("/api/auth", require("./routes/authroutes"));
app.use("/api/quiz", require("./routes/quizroutes"));

const { getHome } = require("./controllers/quizControllers");
app.get("/api/home", protect, getHome);

app.use("/api/chapters", require("./routes/chapterroutes"));

// Public, unauthenticated catalog browsing (Standard -> Subject ->
// Chapter -> Game preview) for guests who haven't played yet — see
// routes/publicroutes.js. Deliberately separate from /api/chapters
// above, which stays user-grade-scoped and protected.
app.use("/api/public", require("./routes/publicroutes"));

const { getProgress } = require("./controllers/chapterControllers");
app.get("/api/progress", protect, getProgress);

app.use("/api/notifications", require("./routes/notificationroutes"));
app.use("/api/cases", require("./routes/caseroutes"));
app.use("/api/profile", require("./routes/profileroutes"));
app.use("/api/leaderboard", require("./routes/leaderboardroutes"));
app.use("/api/admin", require("./routes/adminroutes"));
app.use("/api/games", require("./routes/gameroutes"));
app.use("/api/teacher", require("./routes/teacherroutes"));
app.use("/api/assignments", require("./routes/assignmentroutes"));
app.use("/api/maintenance", require("./routes/maintenanceroutes"));

// Must be registered last — after every route above — so they only
// catch requests nothing else handled.
const { notFound, globalErrorHandler } = require("./middleware/errorHandler");
app.use(notFound);
app.use(globalErrorHandler);

module.exports = app;

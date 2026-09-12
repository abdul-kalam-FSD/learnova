const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const User = require("../models/User");
const Stream = require("../models/Stream");
const { computeUserQuizStats } = require("../utils/quizStats");

const getProfileStats = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("xp_total");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { quizzesPlayed, accuracy, recentQuizzes } =
      await computeUserQuizStats(userId);

    res.status(200).json({
      quizzesPlayed,
      accuracy,
      totalScore: user.xp_total,
      recentQuizzes,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Lets a Grade 11/12 student set or change their stream after
// registration — signup only asks for it up front on a best-effort
// basis (see authControllers.register), and a student's real stream
// sometimes isn't finalised until after they've enrolled. Passing
// streamId: null clears it, which falls back to the old flat
// "every subject for this grade" view via resolveUserSubjects.js.
const updateStream = async (req, res) => {
  try {
    const { streamId } = req.body;
    const user = await User.findById(req.userId).select("grade stream_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (streamId === null) {
      user.stream_id = null;
      await user.save();
      return res.status(200).json({ stream_id: null });
    }

    if (user.grade !== 11 && user.grade !== 12) {
      return res.status(400).json({ message: "Streams only apply to Grade 11 or 12" });
    }
    if (!streamId || !mongoose.Types.ObjectId.isValid(streamId)) {
      return res.status(400).json({ message: "Invalid stream id" });
    }

    // Re-validate server-side — never trust that a streamId sent by
    // the client actually belongs to this student's own grade.
    const stream = await Stream.findById(streamId);
    if (!stream || stream.grade !== user.grade) {
      return res.status(404).json({ message: "Stream not found for your grade" });
    }

    user.stream_id = stream._id;
    await user.save();
    res.status(200).json({ stream_id: user.stream_id });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { getProfileStats, updateStream };

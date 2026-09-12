const mongoose = require("mongoose");

// A Stream represents a Grade 11/12 subject combination (e.g. CBSE's
// Science-PCM, Science-PCB, Commerce, Humanities). Grades 4-10 don't
// use this at all — every student at those grades sees the same
// subject set. From Grade 11 onward, CBSE students choose a stream
// and only see that stream's subjects, so a flat Subject.find({grade})
// is no longer correct on its own; the app must first resolve the
// student's stream, then resolve that stream's subject_ids.
const streamSchema = new mongoose.Schema({
  // e.g. "Science (PCM)", "Science (PCB)", "Commerce", "Humanities"
  name: { type: String, required: true },
  grade: { type: Number, required: true, enum: [11, 12] },
  board: { type: String, default: "CBSE" },
  // Subjects every student in this stream takes (e.g. PCM's core is
  // Physics, Chemistry, Mathematics, English).
  core_subject_ids: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  ],
  // Subjects available as electives within this stream (e.g. PCM's
  // electives include Computer Science, Physical Education,
  // Economics). A student picks a subset per school rules — which
  // electives a specific student takes is tracked on User, not here.
  elective_subject_ids: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  ],
});

streamSchema.index({ grade: 1, board: 1 });

module.exports = mongoose.model("Stream", streamSchema);

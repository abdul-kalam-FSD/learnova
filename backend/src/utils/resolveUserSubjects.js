const Subject = require("../models/Subject");
const Stream = require("../models/Stream");

// Grades 4-10: every subject at that grade is visible to everyone,
// same as before streams existed. Grades 11/12: if the user has
// picked a stream, only that stream's core + elective subjects are
// visible (a PCB student shouldn't see Computer Science chapters from
// the PCM stream). If an 11/12 user has no stream_id yet, fall back
// to the flat grade list so existing accounts (and any grade 11/12
// content with no streams seeded yet) keep working exactly as before.
async function resolveSubjectIdsForUser(user) {
  if ((user.grade === 11 || user.grade === 12) && user.stream_id) {
    const stream = await Stream.findById(user.stream_id);
    if (stream && stream.grade === user.grade) {
      return [...stream.core_subject_ids, ...stream.elective_subject_ids];
    }
    // Stream was deleted or doesn't match the user's grade anymore —
    // don't 500, just fall through to the flat list below.
  }

  const subjects = await Subject.find({ grade: user.grade }).select("_id");
  return subjects.map((s) => s._id);
}

module.exports = { resolveSubjectIdsForUser };

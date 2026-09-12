const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema({
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  unit_name: { type: String },
  title: { type: String, required: true },
  order_index: { type: Number, required: true },
  // Optional internal discipline tag for chapters that live inside an
  // integrated subject (e.g. a Grade-8 "Science" subject containing a
  // "Life Processes" chapter tagged strand: "Biology", a "Chemical
  // Reactions" chapter tagged strand: "Chemistry"). This lets mastery
  // tracking and analytics still distinguish Biology/Chemistry/Physics
  // (or History/Geography/Civics/Economics inside Social Science)
  // WITHOUT making them separate top-level Subjects, which is what
  // the curriculum-accuracy fix requires for Grades 4-10. Left
  // undefined for subjects that are already discipline-specific
  // (e.g. Grade 11-12 standalone Physics/Chemistry/Biology).
  strand: { type: String },
});

// PERFORMANCE: Chapter.find({ subject_id }) runs on every getChapters
// call and every grade-scope walk.
chapterSchema.index({ subject_id: 1 });

module.exports = mongoose.model("Chapter", chapterSchema);

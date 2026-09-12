const mongoose = require("mongoose");
const { sendError } = require("../utils/sendError");
const Assignment = require("../models/Assignment");
const User = require("../models/User");
const Section = require("../models/Section");
const Concept = require("../models/Concept");
const Chapter = require("../models/Chapter");
const Subject = require("../models/Subject");
const GameContent = require("../models/GameContent");
const { KNOWN_GAME_TYPES, GAME_TYPE_TO_LABEL, GAME_TYPE_TO_SUBJECT } = require("../utils/gameTypeRegistry");

// Same scoping rule teacherControllers.resolveScopedStudentIds uses —
// duplicated rather than imported since that function isn't exported
// from teacherControllers.js (mirrors how teacherControllers itself
// duplicates adminControllers' escapeRegex rather than reaching into
// another controller's private internals).
async function resolveScopedStudentIds(req) {
  if (req.userRole === "admin") return null;
  const sections = await Section.find({ teacher_id: req.userId }).select("student_ids");
  const ids = new Set();
  for (const section of sections) {
    for (const sid of section.student_ids) ids.add(sid.toString());
  }
  return [...ids];
}

// Concept -> { chapterTitle, subjectName, grade }, used to enrich
// every assignment response the same way teacherControllers already
// enriches mastery trees, without a full buildSubjectMasteryTree walk
// (we only need one concept's ancestry, not the whole grade's).
async function describeConcept(conceptId) {
  const concept = await Concept.findById(conceptId).select("title chapter_id");
  if (!concept) return null;
  const chapter = await Chapter.findById(concept.chapter_id).select("title subject_id");
  if (!chapter) return { title: concept.title, chapterTitle: null, subjectName: null, grade: null };
  const subject = await Subject.findById(chapter.subject_id).select("name grade");
  return {
    title: concept.title,
    chapterTitle: chapter.title,
    subjectName: subject?.name || null,
    grade: subject?.grade ?? null,
  };
}

// Any playable content for this concept, regardless of mastery tier —
// unlike getRecommendedGame's adaptive tier logic, an assignment is a
// fixed, teacher-chosen target, so the student should always be able
// to find *something* to play for it as soon as content exists.
async function findPlayableContent(conceptId) {
  return GameContent.findOne({
    concept_id: conceptId,
    game_type: { $in: KNOWN_GAME_TYPES },
  })
    .sort({ createdAt: -1 })
    .select("game_type title difficulty");
}

// POST /api/assignments
// body: { conceptId, studentIds?: [id], sectionId?: id, note?, dueDate? }
// Exactly one of studentIds/sectionId targets the assignment. Teachers
// may only target students/sections within their own scope; admins
// are unrestricted (same rule as every other teacher-portal endpoint).
const createAssignment = async (req, res) => {
  try {
    const { conceptId, studentIds, sectionId, note, dueDate } = req.body;

    if (!conceptId || !mongoose.Types.ObjectId.isValid(conceptId)) {
      return res.status(400).json({ message: "A valid conceptId is required" });
    }
    const concept = await Concept.findById(conceptId).select("_id");
    if (!concept) {
      return res.status(404).json({ message: "Concept not found" });
    }

    if (!sectionId && (!Array.isArray(studentIds) || studentIds.length === 0)) {
      return res.status(400).json({ message: "Provide studentIds or a sectionId to assign to" });
    }
    if (sectionId && Array.isArray(studentIds) && studentIds.length > 0) {
      return res.status(400).json({ message: "Provide either studentIds or a sectionId, not both" });
    }

    let targetStudentIds = [];
    let resolvedSectionId = null;

    if (sectionId) {
      if (!mongoose.Types.ObjectId.isValid(sectionId)) {
        return res.status(400).json({ message: "Invalid sectionId" });
      }
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({ message: "Section not found" });
      }
      if (req.userRole !== "admin" && section.teacher_id.toString() !== req.userId) {
        // Same "look like not-found" rationale teacherControllers uses
        // for out-of-scope students — a teacher shouldn't be able to
        // probe which section IDs exist by watching 403 vs 404.
        return res.status(404).json({ message: "Section not found" });
      }
      if (section.student_ids.length === 0) {
        return res.status(400).json({ message: "This section has no students yet" });
      }
      targetStudentIds = section.student_ids.map((id) => id.toString());
      resolvedSectionId = section._id;
    } else {
      const invalidId = studentIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidId) {
        return res.status(400).json({ message: "Invalid student id in studentIds" });
      }

      const scopedStudentIds = await resolveScopedStudentIds(req);
      if (scopedStudentIds !== null) {
        const outOfScope = studentIds.find((id) => !scopedStudentIds.includes(id));
        if (outOfScope) {
          return res.status(404).json({ message: "One or more students were not found" });
        }
      }

      const existing = await User.find({ _id: { $in: studentIds }, role: "student" }).select("_id");
      if (existing.length !== new Set(studentIds).size) {
        return res.status(404).json({ message: "One or more students were not found" });
      }
      targetStudentIds = [...new Set(studentIds)];
    }

    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ message: "Invalid dueDate" });
      }
    }

    const assignment = await Assignment.create({
      teacher_id: req.userId,
      concept_id: conceptId,
      section_id: resolvedSectionId,
      note: (note || "").slice(0, 500),
      due_date: parsedDueDate,
      students: targetStudentIds.map((id) => ({ student_id: id, status: "pending" })),
    });

    const conceptInfo = await describeConcept(conceptId);

    res.status(201).json({
      id: assignment._id,
      conceptId,
      conceptTitle: conceptInfo?.title || null,
      chapterTitle: conceptInfo?.chapterTitle || null,
      subject: conceptInfo?.subjectName || null,
      sectionId: resolvedSectionId,
      note: assignment.note,
      dueDate: assignment.due_date,
      studentCount: targetStudentIds.length,
      createdAt: assignment.createdAt,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/assignments/teacher
// Assignments this teacher created (admins see every assignment on
// the platform, same unscoped rule as the rest of the teacher portal),
// newest first, with a completion count so the list reads like a
// tracker rather than a plain log.
const listTeacherAssignments = async (req, res) => {
  try {
    const filter = req.userRole === "admin" ? {} : { teacher_id: req.userId };
    const assignments = await Assignment.find(filter).sort({ createdAt: -1 }).limit(200);

    const conceptCache = {};
    const results = await Promise.all(
      assignments.map(async (a) => {
        const key = a.concept_id.toString();
        if (!conceptCache[key]) {
          conceptCache[key] = await describeConcept(a.concept_id);
        }
        const conceptInfo = conceptCache[key];
        const completedCount = a.students.filter((s) => s.status === "completed").length;

        let sectionName = null;
        if (a.section_id) {
          const section = await Section.findById(a.section_id).select("name");
          sectionName = section?.name || null;
        }

        return {
          id: a._id,
          conceptId: a.concept_id,
          conceptTitle: conceptInfo?.title || "Unknown concept",
          chapterTitle: conceptInfo?.chapterTitle || null,
          subject: conceptInfo?.subjectName || null,
          sectionId: a.section_id,
          sectionName,
          note: a.note,
          dueDate: a.due_date,
          studentCount: a.students.length,
          completedCount,
          createdAt: a.createdAt,
        };
      }),
    );

    res.status(200).json({ assignments: results });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/assignments/teacher/:id
// Full roster with per-student status, for the assignment detail view.
const getAssignmentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    if (req.userRole !== "admin" && assignment.teacher_id.toString() !== req.userId) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const conceptInfo = await describeConcept(assignment.concept_id);
    const students = await User.find({ _id: { $in: assignment.students.map((s) => s.student_id) } }).select(
      "name email",
    );
    const studentMap = {};
    for (const s of students) studentMap[s._id.toString()] = s;

    const roster = assignment.students.map((s) => {
      const student = studentMap[s.student_id.toString()];
      return {
        studentId: s.student_id,
        name: student?.name || "Unknown student",
        email: student?.email || null,
        status: s.status,
        completedAt: s.completed_at,
      };
    });

    res.status(200).json({
      id: assignment._id,
      conceptId: assignment.concept_id,
      conceptTitle: conceptInfo?.title || "Unknown concept",
      chapterTitle: conceptInfo?.chapterTitle || null,
      subject: conceptInfo?.subjectName || null,
      note: assignment.note,
      dueDate: assignment.due_date,
      createdAt: assignment.createdAt,
      roster,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// DELETE /api/assignments/:id
const cancelAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    if (req.userRole !== "admin" && assignment.teacher_id.toString() !== req.userId) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    await assignment.deleteOne();
    res.status(200).json({ message: "Assignment cancelled" });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/assignments/mine
// Student-facing: every assignment targeting the logged-in user, with
// a resolved "what to play" pointer so the dashboard can go straight
// to Start Mission without a second round trip per assignment.
const listMyAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({ "students.student_id": req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const conceptCache = {};
    const results = await Promise.all(
      assignments.map(async (a) => {
        const mine = a.students.find((s) => s.student_id.toString() === req.userId);
        const key = a.concept_id.toString();
        if (!conceptCache[key]) {
          conceptCache[key] = await describeConcept(a.concept_id);
        }
        const conceptInfo = conceptCache[key];

        let suggestedGame = null;
        if (mine.status === "pending") {
          const content = await findPlayableContent(a.concept_id);
          if (content) {
            suggestedGame = {
              gameType: content.game_type,
              label: GAME_TYPE_TO_LABEL[content.game_type] || content.game_type,
              subject: GAME_TYPE_TO_SUBJECT[content.game_type] || null,
            };
          }
        }

        const teacher = await User.findById(a.teacher_id).select("name");

        return {
          id: a._id,
          conceptId: a.concept_id,
          conceptTitle: conceptInfo?.title || "Practice",
          chapterTitle: conceptInfo?.chapterTitle || null,
          subject: conceptInfo?.subjectName || null,
          note: a.note,
          dueDate: a.due_date,
          teacherName: teacher?.name || "Your teacher",
          status: mine.status,
          completedAt: mine.completed_at,
          suggestedGame,
        };
      }),
    );

    // Pending first (soonest due date first within that), then
    // completed — so the thing the student still needs to do never
    // gets buried under things they've already finished.
    results.sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    res.status(200).json({ assignments: results });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  createAssignment,
  listTeacherAssignments,
  getAssignmentDetail,
  cancelAssignment,
  listMyAssignments,
};

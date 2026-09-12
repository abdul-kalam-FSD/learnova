const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const Subject = require("../models/Subject");
const Chapter = require("../models/Chapter");
const Concept = require("../models/Concept");
const Question = require("../models/Question");
const GameContent = require("../models/GameContent");
const Stream = require("../models/Stream");
const User = require("../models/User");
const { KNOWN_GAME_TYPES } = require("../utils/gameTypeRegistry");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ---------- Subjects ----------

const listSubjects = async (req, res) => {
  try {
    const filter = {};
    if (req.query.grade) filter.grade = Number(req.query.grade);
    const subjects = await Subject.find(filter).sort({ grade: 1, name: 1 });
    res.status(200).json({ subjects });
  } catch (err) {
    sendError(res, err);
  }
};

const createSubject = async (req, res) => {
  try {
    const { name, grade } = req.body;
    if (!name || !grade) {
      return res.status(400).json({ message: "name and grade are required" });
    }
    const subject = await Subject.create({ name, grade });
    res.status(201).json({ subject });
  } catch (err) {
    sendError(res, err);
  }
};

const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const { name, grade } = req.body;
    const subject = await Subject.findByIdAndUpdate(
      id,
      { ...(name && { name }), ...(grade && { grade }) },
      { new: true, runValidators: true },
    );
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.status(200).json({ subject });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const chapterCount = await Chapter.countDocuments({ subject_id: id });
    if (chapterCount > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${chapterCount} chapter(s) still reference this subject. Delete those first.`,
      });
    }

    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.status(200).json({ message: "Subject deleted" });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- Streams (grade 11/12 subject combinations) ----------

const listStreams = async (req, res) => {
  try {
    const filter = {};
    if (req.query.grade) filter.grade = Number(req.query.grade);
    const streams = await Stream.find(filter)
      .populate("core_subject_ids", "name grade")
      .populate("elective_subject_ids", "name grade")
      .sort({ grade: 1, name: 1 });
    res.status(200).json({ streams });
  } catch (err) {
    sendError(res, err);
  }
};

const createStream = async (req, res) => {
  try {
    const { name, grade, board, core_subject_ids, elective_subject_ids } = req.body;
    if (!name || !grade) {
      return res.status(400).json({ message: "name and grade are required" });
    }
    if (grade !== 11 && grade !== 12) {
      return res.status(400).json({ message: "Streams only apply to grade 11 or 12" });
    }
    for (const id of [...(core_subject_ids || []), ...(elective_subject_ids || [])]) {
      if (!isValidId(id)) {
        return res.status(400).json({ message: `Invalid subject id: ${id}` });
      }
    }
    const stream = await Stream.create({
      name,
      grade,
      board,
      core_subject_ids: core_subject_ids || [],
      elective_subject_ids: elective_subject_ids || [],
    });
    res.status(201).json({ stream });
  } catch (err) {
    sendError(res, err);
  }
};

const updateStream = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const { name, board, core_subject_ids, elective_subject_ids } = req.body;
    const stream = await Stream.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(board && { board }),
        ...(core_subject_ids && { core_subject_ids }),
        ...(elective_subject_ids && { elective_subject_ids }),
      },
      { new: true, runValidators: true },
    );
    if (!stream) return res.status(404).json({ message: "Stream not found" });
    res.status(200).json({ stream });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteStream = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    // Don't strand users mid-stream — block deletion instead of
    // silently leaving their stream_id dangling (resolveUserSubjects
    // already falls back gracefully if that ever happens some other
    // way, but no reason to create it on purpose here).
    const studentCount = await User.countDocuments({ stream_id: id });
    if (studentCount > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${studentCount} student(s) are currently in this stream.`,
      });
    }

    const stream = await Stream.findByIdAndDelete(id);
    if (!stream) return res.status(404).json({ message: "Stream not found" });
    res.status(200).json({ message: "Stream deleted" });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- Chapters ----------

const listChapters = async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject_id) filter.subject_id = req.query.subject_id;
    const chapters = await Chapter.find(filter).sort({ order_index: 1 });
    res.status(200).json({ chapters });
  } catch (err) {
    sendError(res, err);
  }
};

const createChapter = async (req, res) => {
  try {
    const { subject_id, unit_name, title, order_index } = req.body;
    if (!subject_id || !title || order_index === undefined) {
      return res
        .status(400)
        .json({ message: "subject_id, title, and order_index are required" });
    }
    if (!isValidId(subject_id)) {
      return res.status(400).json({ message: "Invalid subject_id" });
    }
    const subjectExists = await Subject.exists({ _id: subject_id });
    if (!subjectExists) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const chapter = await Chapter.create({ subject_id, unit_name, title, order_index });
    res.status(201).json({ chapter });
  } catch (err) {
    sendError(res, err);
  }
};

const updateChapter = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const { unit_name, title, order_index } = req.body;
    const update = {};
    if (unit_name !== undefined) update.unit_name = unit_name;
    if (title !== undefined) update.title = title;
    if (order_index !== undefined) update.order_index = order_index;

    const chapter = await Chapter.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    res.status(200).json({ chapter });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteChapter = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const conceptCount = await Concept.countDocuments({ chapter_id: id });
    if (conceptCount > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${conceptCount} concept(s) still reference this chapter. Delete those first.`,
      });
    }

    const chapter = await Chapter.findByIdAndDelete(id);
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    res.status(200).json({ message: "Chapter deleted" });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- Concepts ----------

const listConcepts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.chapter_id) filter.chapter_id = req.query.chapter_id;
    const concepts = await Concept.find(filter).sort({ title: 1 });
    res.status(200).json({ concepts });
  } catch (err) {
    sendError(res, err);
  }
};

const createConcept = async (req, res) => {
  try {
    const { chapter_id, title, explanation_text } = req.body;
    if (!chapter_id || !title || !explanation_text) {
      return res
        .status(400)
        .json({ message: "chapter_id, title, and explanation_text are required" });
    }
    if (!isValidId(chapter_id)) {
      return res.status(400).json({ message: "Invalid chapter_id" });
    }
    const chapterExists = await Chapter.exists({ _id: chapter_id });
    if (!chapterExists) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const concept = await Concept.create({ chapter_id, title, explanation_text });
    res.status(201).json({ concept });
  } catch (err) {
    sendError(res, err);
  }
};

const updateConcept = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const { title, explanation_text } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (explanation_text !== undefined) update.explanation_text = explanation_text;

    const concept = await Concept.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!concept) return res.status(404).json({ message: "Concept not found" });
    res.status(200).json({ concept });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteConcept = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const questionCount = await Question.countDocuments({ concept_id: id });
    if (questionCount > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${questionCount} question(s) still reference this concept. Delete those first.`,
      });
    }

    // GameContent is a separate child collection from Question (one
    // concept can have game challenges, quiz questions, or both) —
    // this guard was missing, which let a concept with only
    // GameContent (the common case now that most subjects are
    // game-first, not quiz-first) be deleted while orphaning its
    // GameContent docs underneath it.
    const gameContentCount = await GameContent.countDocuments({ concept_id: id });
    if (gameContentCount > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${gameContentCount} game content item(s) still reference this concept. Delete those first.`,
      });
    }

    const concept = await Concept.findByIdAndDelete(id);
    if (!concept) return res.status(404).json({ message: "Concept not found" });
    res.status(200).json({ message: "Concept deleted" });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- Questions ----------

function validateOptionsShape(options, correct_option_id) {
  if (!Array.isArray(options) || options.length < 2) {
    return "options must be an array of at least 2 items";
  }
  const ids = options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) {
    return "option ids must be unique";
  }
  if (!ids.includes(correct_option_id)) {
    return "correct_option_id must match one of the option ids";
  }
  return null;
}

const listQuestions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.concept_id) filter.concept_id = req.query.concept_id;
    const questions = await Question.find(filter);
    res.status(200).json({ questions });
  } catch (err) {
    sendError(res, err);
  }
};

const createQuestion = async (req, res) => {
  try {
    const {
      concept_id,
      question_text,
      options,
      correct_option_id,
      explanation_text,
      fun_fact,
      difficulty,
    } = req.body;

    if (!concept_id || !question_text || !options || !correct_option_id) {
      return res.status(400).json({
        message: "concept_id, question_text, options, and correct_option_id are required",
      });
    }
    if (!isValidId(concept_id)) {
      return res.status(400).json({ message: "Invalid concept_id" });
    }
    const conceptExists = await Concept.exists({ _id: concept_id });
    if (!conceptExists) {
      return res.status(404).json({ message: "Concept not found" });
    }
    const shapeError = validateOptionsShape(options, correct_option_id);
    if (shapeError) return res.status(400).json({ message: shapeError });

    const question = await Question.create({
      concept_id,
      question_text,
      options,
      correct_option_id,
      explanation_text,
      fun_fact,
      difficulty,
    });
    res.status(201).json({ question });
  } catch (err) {
    sendError(res, err);
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const {
      question_text,
      options,
      correct_option_id,
      explanation_text,
      fun_fact,
      difficulty,
    } = req.body;

    if (options || correct_option_id) {
      const existing = await Question.findById(id);
      if (!existing) return res.status(404).json({ message: "Question not found" });
      const finalOptions = options || existing.options;
      const finalCorrectId = correct_option_id || existing.correct_option_id;
      const shapeError = validateOptionsShape(finalOptions, finalCorrectId);
      if (shapeError) return res.status(400).json({ message: shapeError });
    }

    const update = {};
    if (question_text !== undefined) update.question_text = question_text;
    if (options !== undefined) update.options = options;
    if (correct_option_id !== undefined) update.correct_option_id = correct_option_id;
    if (explanation_text !== undefined) update.explanation_text = explanation_text;
    if (fun_fact !== undefined) update.fun_fact = fun_fact;
    if (difficulty !== undefined) update.difficulty = difficulty;

    const question = await Question.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.status(200).json({ question });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    // Not blocked by dependents: past QuizSessions reference a
    // question_id as a historical record (like an order referencing a
    // since-discontinued product) and are fine to keep pointing at a
    // deleted question.
    const question = await Question.findByIdAndDelete(id);
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.status(200).json({ message: "Question deleted" });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- Game Content (Section 15/16: generic content container
// for every non-quiz mechanic — Fraction Builder, Circuit Builder,
// Equation Balancer, Timeline Builder, etc. `payload` shape depends
// entirely on game_type, so this stays free-form; the only guard here
// is that game_type must be one the backend actually knows how to
// score (see gameControllers.checkAttempt) — an unknown game_type
// would let content get created that can never be completed. ----------

// KNOWN_GAME_TYPES now lives in utils/gameTypeRegistry.js (single
// source of truth shared with gameControllers' selection engine and
// the frontend's AdminGameContent/gameRegistry). Keep new mechanics
// in sync with gameControllers.checkAttempt when adding entries there.

const listGameContent = async (req, res) => {
  try {
    const filter = {};
    if (req.query.game_type) filter.game_type = req.query.game_type;
    if (req.query.concept_id) filter.concept_id = req.query.concept_id;
    const content = await GameContent.find(filter).sort({
      game_type: 1,
      order_index: 1,
    });
    res.status(200).json({ content });
  } catch (err) {
    sendError(res, err);
  }
};

const createGameContent = async (req, res) => {
  try {
    const { game_type, concept_id, title, difficulty, payload, order_index } = req.body;

    if (!game_type || !concept_id || !title || !payload) {
      return res.status(400).json({
        message: "game_type, concept_id, title, and payload are required",
      });
    }
    if (!KNOWN_GAME_TYPES.includes(game_type)) {
      return res.status(400).json({
        message: `Unknown game_type. Must be one of: ${KNOWN_GAME_TYPES.join(", ")}`,
      });
    }
    if (!isValidId(concept_id)) {
      return res.status(400).json({ message: "Invalid concept_id" });
    }
    if (typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({ message: "payload must be a JSON object" });
    }
    const conceptExists = await Concept.exists({ _id: concept_id });
    if (!conceptExists) {
      return res.status(404).json({ message: "Concept not found" });
    }

    const content = await GameContent.create({
      game_type,
      concept_id,
      title,
      difficulty,
      payload,
      order_index,
    });
    res.status(201).json({ content });
  } catch (err) {
    sendError(res, err);
  }
};

const updateGameContent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const { title, difficulty, payload, order_index } = req.body;
    // game_type and concept_id are intentionally not editable here —
    // changing either after content exists would silently orphan past
    // sessions/mastery links or send the payload down the wrong
    // checkAttempt branch. Delete and recreate instead.
    if (payload !== undefined && (typeof payload !== "object" || Array.isArray(payload))) {
      return res.status(400).json({ message: "payload must be a JSON object" });
    }

    const update = {};
    if (title !== undefined) update.title = title;
    if (difficulty !== undefined) update.difficulty = difficulty;
    if (payload !== undefined) update.payload = payload;
    if (order_index !== undefined) update.order_index = order_index;

    const content = await GameContent.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!content) return res.status(404).json({ message: "Game content not found" });
    res.status(200).json({ content });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteGameContent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    // Same as deleteQuestion: past QuizSessions keep their
    // content_id as a historical record even after this is deleted.
    const content = await GameContent.findByIdAndDelete(id);
    if (!content) return res.status(404).json({ message: "Game content not found" });
    res.status(200).json({ message: "Game content deleted" });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  listStreams,
  createStream,
  updateStream,
  deleteStream,
  listChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  listConcepts,
  createConcept,
  updateConcept,
  deleteConcept,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listGameContent,
  createGameContent,
  updateGameContent,
  deleteGameContent,
};

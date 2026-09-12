const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const Case = require("../models/Case");
const Concept = require("../models/Concept");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Mirrors what actually matters at runtime:
// - getCases/getRecommendedCase only ever surface a case to students
//   if it has at least one dragdrop item AND one matching pair
//   (COMPLETE_CASE_FILTER in caseControllers.js) — so those aren't
//   truly optional even though the schema allows omitting them.
// - Practice.jsx only shows the Theory step if theory_options is a
//   non-empty array, and only shows the Experiment step if
//   experiment.variable_name is set — so a half-filled theory/
//   experiment block would silently never appear to students.
async function validateCasePayload(body) {
  const errors = [];

  if (!body.title) errors.push("title is required");
  if (!body.intro_text) errors.push("intro_text is required");

  if (!Array.isArray(body.concept_ids) || body.concept_ids.length === 0) {
    errors.push("concept_ids must be a non-empty array");
  } else {
    const badIds = body.concept_ids.filter((id) => !isValidId(id));
    if (badIds.length > 0) {
      errors.push("concept_ids contains invalid id(s)");
    } else {
      const count = await Concept.countDocuments({ _id: { $in: body.concept_ids } });
      if (count !== body.concept_ids.length) {
        errors.push("one or more concept_ids do not exist");
      }
    }
  }

  if (body.clue_count !== undefined && (!Number.isInteger(body.clue_count) || body.clue_count < 1)) {
    errors.push("clue_count must be a positive integer");
  }

  const dragdrop = body.dragdrop_task;
  if (!dragdrop || !Array.isArray(dragdrop.items) || dragdrop.items.length === 0) {
    errors.push(
      "dragdrop_task.items must have at least 1 item — cases without it never appear to students",
    );
  } else if (dragdrop.items.some((i) => !i || !i.trim())) {
    errors.push("dragdrop_task.items cannot contain empty strings");
  }

  const matching = body.matching_task;
  if (!matching || !Array.isArray(matching.pairs) || matching.pairs.length === 0) {
    errors.push(
      "matching_task.pairs must have at least 1 pair — cases without it never appear to students",
    );
  } else if (matching.pairs.some((p) => !p.structure?.trim() || !p.role?.trim())) {
    errors.push("every matching_task.pair needs both structure and role");
  }

  // Theory step: optional overall, but if any part is provided, it must
  // be complete enough to actually render (Practice.jsx gates the step
  // on theory_options.length > 0).
  const hasTheoryPrompt = !!body.theory_prompt?.trim();
  const hasTheoryOptions = Array.isArray(body.theory_options) && body.theory_options.length > 0;
  if (hasTheoryPrompt !== hasTheoryOptions) {
    errors.push(
      "theory_prompt and theory_options must both be provided together, or both left empty",
    );
  } else if (hasTheoryOptions) {
    if (body.theory_options.length < 2) {
      errors.push("theory_options needs at least 2 choices");
    } else if (!body.theory_options.some((o) => o.correct === true)) {
      errors.push("theory_options must have at least one option marked correct");
    } else if (body.theory_options.some((o) => !o.text?.trim())) {
      errors.push("every theory option needs text");
    }
  }

  // Experiment step: optional overall, but Practice.jsx only activates
  // it when variable_name is set — so if any experiment field is
  // provided, the ones that matter for it to actually work must all
  // be present.
  const exp = body.experiment;
  const hasAnyExperimentField = exp && Object.values(exp).some((v) => v !== undefined && v !== "");
  if (hasAnyExperimentField) {
    if (!exp.variable_name?.trim()) {
      errors.push("experiment.variable_name is required for the experiment step to appear");
    }
    if (exp.min === undefined || exp.max === undefined || exp.threshold === undefined) {
      errors.push("experiment needs min, max, and threshold");
    } else if (exp.min >= exp.max) {
      errors.push("experiment.min must be less than experiment.max");
    } else if (exp.threshold < exp.min || exp.threshold > exp.max) {
      errors.push("experiment.threshold must be between min and max");
    }
    if (!exp.good_outcome_text?.trim() || !exp.bad_outcome_text?.trim()) {
      errors.push("experiment needs both good_outcome_text and bad_outcome_text");
    }
  }

  return errors;
}

const listCases = async (req, res) => {
  try {
    const filter = {};
    if (req.query.concept_id) filter.concept_ids = req.query.concept_id;
    const cases = await Case.find(filter).sort({ created_at: -1 });
    res.status(200).json({ cases });
  } catch (err) {
    sendError(res, err);
  }
};

const getCaseDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const caseDoc = await Case.findById(id).populate("concept_ids", "title chapter_id");
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });
    res.status(200).json({ case: caseDoc });
  } catch (err) {
    sendError(res, err);
  }
};

const createCase = async (req, res) => {
  try {
    const errors = await validateCasePayload(req.body);
    if (errors.length > 0) return res.status(400).json({ message: errors.join("; ") });

    const caseDoc = await Case.create(req.body);
    res.status(201).json({ case: caseDoc });
  } catch (err) {
    sendError(res, err);
  }
};

const updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    const existing = await Case.findById(id);
    if (!existing) return res.status(404).json({ message: "Case not found" });

    // Validate the merged result, not just the partial patch, since
    // e.g. patching only theory_prompt without theory_options would
    // otherwise slip past validation.
    const merged = { ...existing.toObject(), ...req.body };
    const errors = await validateCasePayload(merged);
    if (errors.length > 0) return res.status(400).json({ message: errors.join("; ") });

    const caseDoc = await Case.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ case: caseDoc });
  } catch (err) {
    sendError(res, err);
  }
};

const deleteCase = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid id" });

    // Not blocked by history: past QuizSessions reference case_id as a
    // historical record and are fine to keep pointing at a deleted
    // case, same policy as deleting a Question.
    const caseDoc = await Case.findByIdAndDelete(id);
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });
    res.status(200).json({ message: "Case deleted" });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { listCases, getCaseDetail, createCase, updateCase, deleteCase };

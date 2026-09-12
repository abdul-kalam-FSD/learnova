const { sendError } = require("../utils/sendError");
const mongoose = require("mongoose");
const Subject = require("../models/Subject");
const Chapter = require("../models/Chapter");
const Concept = require("../models/Concept");
const GameContent = require("../models/GameContent");
const Stream = require("../models/Stream");
const { GAME_TYPE_TO_LABEL, GAME_TYPE_TO_TIER } = require("../utils/gameTypeRegistry");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Friendly copy for GAME_TYPE_TO_TIER, used on the public chapter/game
// selection cards (Part 6 spec: show a "mechanic" and difficulty, not
// just a bare "Play" button). Derived from the same tier every
// adaptive-selection call already uses server-side, so the label a
// guest sees always matches how the game actually behaves.
const TIER_LABEL = {
  GUIDED: "Guided",
  PRACTICE: "Practice",
  ADVANCED: "Challenge",
};

// No chapter/game document stores a difficulty or time estimate
// directly (Chapter/Concept have neither field) — rather than
// fabricate one, both are derived from real content: difficulty from
// the actual GameContent.difficulty values backing that chapter's
// games, and time from how many playable items exist. This keeps the
// "8 minutes" a guest sees tied to real seeded content instead of an
// invented number.
const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };
const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };
const MINUTES_PER_ITEM = 3;
const MIN_MINUTES = 5;

function modeDifficulty(difficulties) {
  if (!difficulties.length) return null;
  const counts = {};
  for (const d of difficulties) counts[d] = (counts[d] || 0) + 1;
  return Object.keys(counts).sort(
    (a, b) => counts[b] - counts[a] || DIFFICULTY_RANK[b] - DIFFICULTY_RANK[a],
  )[0];
}

function estimateMinutes(itemCount) {
  if (!itemCount) return null;
  return Math.max(MIN_MINUTES, itemCount * MINUTES_PER_ITEM);
}

// Public "Choose Your Standard" step. Distinct grades that actually
// have at least one Subject — avoids advertising a standard (e.g.
// Grade 12) that has no content behind it yet.
const getStandards = async (req, res) => {
  try {
    const grades = await Subject.distinct("grade");
    grades.sort((a, b) => a - b);
    res.status(200).json({ standards: grades });
  } catch (err) {
    sendError(res, err);
  }
};

// Public "Choose Your Stream" step — only meaningful for grade 11/12
// (see models/Stream.js). Returns an empty array for every other
// grade, and also for an 11/12 grade with no streams seeded yet, so
// the frontend's rule is simple: streams.length === 0 means skip
// straight to subjects, exactly like it always did.
const getStreamsByGrade = async (req, res) => {
  try {
    const grade = Number(req.params.grade);
    if (!grade || grade < 4 || grade > 12) {
      return res.status(400).json({ message: "Invalid standard" });
    }
    if (grade !== 11 && grade !== 12) {
      return res.status(200).json({ grade, streams: [] });
    }

    const streams = await Stream.find({ grade })
      .populate("core_subject_ids", "name")
      .populate("elective_subject_ids", "name")
      .sort({ name: 1 });

    res.status(200).json({
      grade,
      streams: streams.map((s) => ({
        id: s._id,
        name: s.name,
        core_subjects: s.core_subject_ids.map((sub) => sub.name),
        elective_subjects: s.elective_subject_ids.map((sub) => sub.name),
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Public "Choose a Subject" step, scoped to whichever standard was
// selected. Mirrors chapterControllers.getChapters' Subject.find({
// grade }) lookup, just without a logged-in user to read the grade
// from. For grade 11/12 with a streamId given, scope to that
// stream's core+elective subjects instead of the flat grade list —
// same rule resolveUserSubjects.js applies for a logged-in user.
const getSubjectsByGrade = async (req, res) => {
  try {
    const grade = Number(req.params.grade);
    if (!grade || grade < 4 || grade > 12) {
      return res.status(400).json({ message: "Invalid standard" });
    }

    const { streamId } = req.query;
    if (streamId) {
      if (!isValidId(streamId)) {
        return res.status(400).json({ message: "Invalid stream id" });
      }
      const stream = await Stream.findById(streamId);
      if (!stream || stream.grade !== grade) {
        return res.status(404).json({ message: "Stream not found for this standard" });
      }
      const subjectIds = [...stream.core_subject_ids, ...stream.elective_subject_ids];
      const subjects = await Subject.find({ _id: { $in: subjectIds } }).sort({ name: 1 });
      return res.status(200).json({
        grade,
        stream: { id: stream._id, name: stream.name },
        subjects: subjects.map((s) => ({ id: s._id, name: s.name })),
      });
    }

    const subjects = await Subject.find({ grade }).sort({ name: 1 });
    res.status(200).json({
      grade,
      subjects: subjects.map((s) => ({ id: s._id, name: s.name })),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Public "Choose a Chapter" step for a given subject, grouped by unit
// like the authenticated getChapters, plus a game count per chapter
// so the chapter card can show "3 Interactive Games" per the brief.
const getChaptersBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const chapters = await Chapter.find({ subject_id: subjectId }).sort({
      order_index: 1,
    });
    const chapterIds = chapters.map((c) => c._id);

    const concepts = await Concept.find({ chapter_id: { $in: chapterIds } });
    const conceptsByChapter = {};
    for (const c of concepts) {
      const key = c.chapter_id.toString();
      (conceptsByChapter[key] ||= []).push(c._id);
    }

    const allConceptIds = concepts.map((c) => c._id);
    // Fetched as full docs (not just an aggregate count) because we
    // also need each item's difficulty to derive a chapter-level
    // difficulty/time estimate below.
    const gameContentItems = await GameContent.find({
      concept_id: { $in: allConceptIds },
    }).select("concept_id difficulty");

    const gamesByConcept = {};
    const difficultyByConcept = {};
    for (const item of gameContentItems) {
      const key = item.concept_id.toString();
      gamesByConcept[key] = (gamesByConcept[key] || 0) + 1;
      (difficultyByConcept[key] ||= []).push(item.difficulty);
    }

    const grouped = {};
    for (const ch of chapters) {
      const unit = ch.unit_name || "General";
      const conceptIds = conceptsByChapter[ch._id.toString()] || [];
      const gameCount = conceptIds.reduce(
        (sum, cid) => sum + (gamesByConcept[cid.toString()] || 0),
        0,
      );
      const difficulties = conceptIds.flatMap((cid) => difficultyByConcept[cid.toString()] || []);
      const difficulty = modeDifficulty(difficulties);

      (grouped[unit] ||= []).push({
        id: ch._id,
        title: ch.title,
        order_index: ch.order_index,
        concept_count: conceptIds.length,
        game_count: gameCount,
        difficulty,
        difficulty_label: difficulty ? DIFFICULTY_LABEL[difficulty] : null,
        estimated_minutes: estimateMinutes(gameCount),
      });
    }

    const units = Object.keys(grouped).map((unit_name) => ({
      unit_name,
      chapters: grouped[unit_name],
    }));

    res.status(200).json({
      subject: { id: subject._id, name: subject.name, grade: subject.grade },
      units,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Public "Choose a Game" step — chapter preview with its concepts
// (titles only, no mastery state since there's no user yet) and the
// game_types that actually have content for this chapter, same
// aggregation chapterControllers.getChapterDetail uses.
const getChapterPreview = async (req, res) => {
  try {
    const { id } = req.params;
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const concepts = await Concept.find({ chapter_id: id });
    const conceptIds = concepts.map((c) => c._id);
    const conceptTitleById = {};
    for (const c of concepts) conceptTitleById[c._id.toString()] = c.title;

    // Full docs (not an aggregate count) so each game can be tied back
    // to the specific concept(s) it teaches — used for the "Learning
    // objective" line below — and so difficulty is available for a
    // per-game estimate, same derivation getChaptersBySubject uses.
    const gameContentItems = await GameContent.find({
      concept_id: { $in: conceptIds },
    }).select("game_type concept_id difficulty");

    const byGameType = {};
    for (const item of gameContentItems) {
      (byGameType[item.game_type] ||= { count: 0, conceptIds: new Set(), difficulties: [] });
      byGameType[item.game_type].count += 1;
      byGameType[item.game_type].conceptIds.add(item.concept_id.toString());
      byGameType[item.game_type].difficulties.push(item.difficulty);
    }

    const games = Object.keys(byGameType).map((gameType) => {
      const entry = byGameType[gameType];
      const objectiveConcepts = [...entry.conceptIds].map((cid) => conceptTitleById[cid]).filter(Boolean);
      const difficulty = modeDifficulty(entry.difficulties);
      return {
        game_type: gameType,
        label: GAME_TYPE_TO_LABEL[gameType] || gameType,
        count: entry.count,
        mechanic: TIER_LABEL[GAME_TYPE_TO_TIER[gameType]] || "Interactive",
        difficulty,
        difficulty_label: difficulty ? DIFFICULTY_LABEL[difficulty] : null,
        estimated_minutes: estimateMinutes(entry.count),
        objective: objectiveConcepts[0] || null,
      };
    });

    res.status(200).json({
      chapter: {
        id: chapter._id,
        title: chapter.title,
        unit_name: chapter.unit_name,
      },
      concepts: concepts.map((c) => ({ id: c._id, title: c.title })),
      games,
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  getStandards,
  getStreamsByGrade,
  getSubjectsByGrade,
  getChaptersBySubject,
  getChapterPreview,
};

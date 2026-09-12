const { sendError } = require("../utils/sendError");
const Chapter = require("../models/Chapter");
const Subject = require("../models/Subject");
const User = require("../models/User");
const { resolveSubjectIdsForUser } = require("../utils/resolveUserSubjects");

const getChapters = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("grade stream_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const subjectIds = await resolveSubjectIdsForUser(user);

    const chapters = await Chapter.find({
      subject_id: { $in: subjectIds },
    }).sort({ order_index: 1 });

    const grouped = {};
    for (const ch of chapters) {
      const unit = ch.unit_name || "General";
      if (!grouped[unit]) grouped[unit] = [];
      grouped[unit].push({
        id: ch._id,
        title: ch.title,
        order_index: ch.order_index,
      });
    }

    const result = Object.keys(grouped).map((unitName) => ({
      unit_name: unitName,
      chapters: grouped[unitName],
    }));

    res.status(200).json({ grade: user.grade, units: result });
  } catch (err) {
    sendError(res, err);
  }
};
const Concept = require("../models/Concept");
const UserConceptMastery = require("../models/UserConceptMastery");
const GameContent = require("../models/GameContent");
const { GAME_TYPE_TO_LABEL, KNOWN_GAME_TYPES } = require("../utils/gameTypeRegistry");
const { sortGamesByRegistryOrder } = require("../utils/chapterGameOrder");

const getChapterDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const chapter = await Chapter.findById(id);

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // SECURITY: getChapters already scopes the *list* to the
    // student's own grade (and, for grade 11/12, their stream), but
    // this detail endpoint previously trusted any chapterId — a
    // Grade 6 student could view a Grade 12 chapter's concepts just
    // by knowing/guessing its ID, and (before streams existed) any
    // 11/12 student could view any other stream's chapter the same
    // way. Confirmed with Team Lead: content should be grade- AND
    // stream-locked, not fully open.
    const user = await User.findById(userId).select("grade stream_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const allowedSubjectIds = await resolveSubjectIdsForUser(user);
    const isAllowed = allowedSubjectIds.some(
      (id) => id.toString() === chapter.subject_id.toString(),
    );
    if (!isAllowed) {
      return res
        .status(403)
        .json({ message: "This chapter is not available for your grade" });
    }

    // Phase 4D note: Concept has no order_index (or any other
    // ordering) field in its schema (../models/Concept.js) — there is
    // no legitimate curriculum-order signal to sort by here, so no
    // .sort() is added. Left exactly as before; see
    // PHASE_4D_DETERMINISTIC_GAME_ORDER_REPORT.md Section 8.
    const concepts = await Concept.find({ chapter_id: id });

    const conceptIds = concepts.map((c) => c._id);

    const masteries = await UserConceptMastery.find({
      user_id: userId,
      concept_id: { $in: conceptIds },
    });

    const masteryMap = {};
    for (const m of masteries) {
      masteryMap[m.concept_id.toString()] = m.state;
    }

    const conceptList = concepts.map((c) => ({
      id: c._id,
      title: c.title,
      mastery_state: masteryMap[c._id.toString()] || "weak",
    }));

    // Game Selection Engine at chapter scope (Section 17): whatever
    // game_types have real content among THIS chapter's concepts,
    // not the whole grade — lets ChapterDetails.jsx offer the right
    // mechanic(s) for this specific topic instead of a single generic
    // "Practice" button that only ever led to the quiz flow.
    const gameCounts = await GameContent.aggregate([
      { $match: { concept_id: { $in: conceptIds } } },
      { $group: { _id: "$game_type", count: { $sum: 1 } } },
    ]);
    // Phase 4D: $group above has no defined output order (see
    // chapterGameOrder.js header comment) — sort the mapped result by
    // registry order so this array is deterministic across requests.
    // This is a technical stability order only, not a curriculum
    // recommendation; response shape (game_type/label/count) is
    // unchanged.
    const games = sortGamesByRegistryOrder(
      gameCounts.map((g) => ({
        game_type: g._id,
        label: GAME_TYPE_TO_LABEL[g._id] || g._id,
        count: g.count,
      })),
      KNOWN_GAME_TYPES,
    );

    res.status(200).json({
      chapter: {
        id: chapter._id,
        title: chapter.title,
        unit_name: chapter.unit_name,
      },
      concepts: conceptList,
      games,
    });
  } catch (err) {
    sendError(res, err);
  }
};
const getProgress = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select(
      "grade stream_id streak_count last_active_date",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const subjectIds = await resolveSubjectIdsForUser(user);

    const chapters = await Chapter.find({
      subject_id: { $in: subjectIds },
    }).sort({ order_index: 1 });

    // Additive only: lets the frontend group a multi-subject grade's
    // chapters by subject instead of one flat unit_name list. Does not
    // change any existing field or any mastery/scoring computation below.
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).select(
      "name",
    );
    const subjectNameById = {};
    for (const s of subjects) {
      subjectNameById[s._id.toString()] = s.name;
    }

    const chapterIds = chapters.map((ch) => ch._id);

    const concepts = await Concept.find({ chapter_id: { $in: chapterIds } });

    const conceptsByChapter = {};
    for (const c of concepts) {
      const key = c.chapter_id.toString();
      if (!conceptsByChapter[key]) conceptsByChapter[key] = [];
      conceptsByChapter[key].push(c._id.toString());
    }

    const allConceptIds = concepts.map((c) => c._id);
    const masteries = await UserConceptMastery.find({
      user_id: userId,
      concept_id: { $in: allConceptIds },
    });

    const masteryMap = {};
    for (const m of masteries) {
      masteryMap[m.concept_id.toString()] = m.state;
    }

    const chapterProgress = chapters.map((ch) => {
      const conceptIdsInChapter = conceptsByChapter[ch._id.toString()] || [];

      const breakdown = { weak: 0, learning: 0, strong: 0 };
      for (const cid of conceptIdsInChapter) {
        const state = masteryMap[cid] || "weak";
        breakdown[state]++;
      }

      return {
        chapter_id: ch._id,
        title: ch.title,
        unit_name: ch.unit_name,
        subject_id: ch.subject_id,
        subject_name: subjectNameById[ch.subject_id.toString()] || null,
        total_concepts: conceptIdsInChapter.length,
        breakdown,
      };
    });

    res.status(200).json({
      streak_count: user.streak_count,
      last_active_date: user.last_active_date,
      chapters: chapterProgress,
    });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { getChapters, getChapterDetail, getProgress };

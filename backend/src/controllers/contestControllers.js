const mongoose = require("mongoose");
const { sendError } = require("../utils/sendError");
const Contest = require("../models/Contest");
const Subject = require("../models/Subject");
const Chapter = require("../models/Chapter");
const Concept = require("../models/Concept");
const GameContent = require("../models/GameContent");
const { KNOWN_GAME_TYPES, GAME_TYPE_TO_LABEL } = require("../utils/gameTypeRegistry");
const { validateContestInput, computeContestPhase, canTransition, TRANSITIONS } = require("../utils/contestLifecycle");

// Statuses a teacher may submit from — derived from the central
// transition table rather than restated here.
const SUBMITTABLE_FROM = TRANSITIONS.filter((t) => t.to === "PENDING_APPROVAL" && t.role === "teacher").map((t) => t.from);

const idOf = (v) => (v == null ? null : v.toString());

// Never trust IDs from the client (see the cross-grade IDOR fixes in
// gradeAccess.js / startGame). Confirms every referenced record exists
// AND that they belong together:
//   subject.grade === grade
//   chapter.subject_id === subject          (when a chapter is given)
//   every game -> concept -> chapter -> subject === subject
//                                     (and === chapter when one is given)
// Returns { status, message } on failure or null when everything checks out.
async function verifyContestReferences({ grade, subjectId, chapterId, challengeIds }) {
  const subject = await Subject.findById(subjectId).select("name grade");
  if (!subject) return { status: 404, message: "Subject not found" };
  if (subject.grade !== grade) {
    return { status: 400, message: "The selected subject does not belong to the selected grade" };
  }

  if (chapterId) {
    const chapter = await Chapter.findById(chapterId).select("subject_id");
    if (!chapter) return { status: 404, message: "Chapter not found" };
    if (idOf(chapter.subject_id) !== subjectId) {
      return { status: 400, message: "The selected chapter does not belong to the selected subject" };
    }
  }

  const games = await GameContent.find({ _id: { $in: challengeIds } }).select("game_type concept_id");
  if (games.length !== challengeIds.length) {
    return { status: 404, message: "One or more selected games were not found" };
  }
  if (games.some((g) => !KNOWN_GAME_TYPES.includes(g.game_type))) {
    return { status: 400, message: "One or more selected games are not playable" };
  }

  const conceptIds = [...new Set(games.map((g) => idOf(g.concept_id)))];
  const concepts = await Concept.find({ _id: { $in: conceptIds } }).select("chapter_id");
  const chapterByConcept = {};
  for (const c of concepts) chapterByConcept[idOf(c._id)] = idOf(c.chapter_id);

  const chapterIds = [...new Set(Object.values(chapterByConcept))];
  const chapters = await Chapter.find({ _id: { $in: chapterIds } }).select("subject_id");
  const subjectByChapter = {};
  for (const ch of chapters) subjectByChapter[idOf(ch._id)] = idOf(ch.subject_id);

  const misplaced = games.some((g) => {
    const gameChapter = chapterByConcept[idOf(g.concept_id)];
    if (!gameChapter) return true;
    if (subjectByChapter[gameChapter] !== subjectId) return true;
    if (chapterId && gameChapter !== chapterId) return true;
    return false;
  });
  if (misplaced) {
    return {
      status: 400,
      message: "One or more selected games do not belong to the chosen subject/chapter",
    };
  }

  return null;
}

// Shapes contests for the client with batched lookups (3 queries total
// regardless of how many contests), rather than one query per row.
async function buildContestResponses(contests) {
  const subjectIds = [...new Set(contests.map((c) => idOf(c.subject_id)))];
  const chapterIds = [...new Set(contests.map((c) => idOf(c.chapter_id)).filter(Boolean))];
  const gameIds = [...new Set(contests.flatMap((c) => c.challenges.map((ch) => idOf(ch.game_content_id))))];

  const [subjects, chapters, games] = await Promise.all([
    Subject.find({ _id: { $in: subjectIds } }).select("name"),
    chapterIds.length ? Chapter.find({ _id: { $in: chapterIds } }).select("title") : [],
    GameContent.find({ _id: { $in: gameIds } }).select("title game_type difficulty"),
  ]);

  const subjectName = {};
  for (const s of subjects) subjectName[idOf(s._id)] = s.name;
  const chapterTitle = {};
  for (const ch of chapters) chapterTitle[idOf(ch._id)] = ch.title;
  const gameById = {};
  for (const g of games) gameById[idOf(g._id)] = g;

  const now = new Date();
  return contests.map((c) => ({
    id: c._id,
    title: c.title,
    description: c.description,
    grade: c.grade,
    subjectId: c.subject_id,
    subject: subjectName[idOf(c.subject_id)] || null,
    chapterId: c.chapter_id,
    chapterTitle: c.chapter_id ? chapterTitle[idOf(c.chapter_id)] || null : null,
    startAt: c.start_at,
    endAt: c.end_at,
    status: c.status,
    phase: computeContestPhase(c, now),
    submittedAt: c.submitted_at || null,
    // Admin feedback. Shown to the owning teacher (this builder only
    // ever runs for the owner's own contests); the reviewer's identity
    // is deliberately NOT included here.
    reviewedAt: c.reviewed_at || null,
    reviewNote: c.review_note || "",
    challenges: c.challenges.map((ch) => {
      const g = gameById[idOf(ch.game_content_id)];
      // A GameContent doc an admin later deleted shows up as
      // "removed" instead of crashing the whole list.
      return g
        ? {
            id: g._id,
            title: g.title,
            gameType: g.game_type,
            label: GAME_TYPE_TO_LABEL[g.game_type] || g.game_type,
            difficulty: g.difficulty,
          }
        : { id: ch.game_content_id, title: "Removed content", gameType: null, label: null, difficulty: null };
    }),
    createdAt: c.createdAt,
  }));
}

// POST /api/contests
// body: { title, description?, grade, subjectId, chapterId?, challengeIds: [id],
//         startAt, endAt, submitForApproval? }
// Always created as DRAFT, or PENDING_APPROVAL when submitForApproval
// is true. A teacher can never create a PUBLISHED contest — that is
// reserved for the future admin-approval step.
const createContest = async (req, res) => {
  try {
    const { error, value } = validateContestInput(req.body);
    if (error) return res.status(400).json({ message: error });

    const refError = await verifyContestReferences({
      grade: value.grade,
      subjectId: value.subjectId,
      chapterId: value.chapterId,
      challengeIds: value.challengeIds,
    });
    if (refError) return res.status(refError.status).json({ message: refError.message });

    const contest = await Contest.create({
      title: value.title,
      description: value.description,
      teacher_id: req.userId,
      grade: value.grade,
      subject_id: value.subjectId,
      chapter_id: value.chapterId,
      challenges: value.challengeIds.map((id) => ({ game_content_id: id })),
      start_at: value.startAt,
      end_at: value.endAt,
      status: value.status,
      submitted_at: value.status === "PENDING_APPROVAL" ? new Date() : null,
    });

    const [response] = await buildContestResponses([contest]);
    res.status(201).json(response);
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/contests/my
// Contests the requesting user created, newest first. Deliberately
// "mine" even for admins — an all-contests review queue belongs to the
// admin-approval task, not here.
const listMyContests = async (req, res) => {
  try {
    const contests = await Contest.find({ teacher_id: req.userId }).sort({ createdAt: -1 }).limit(200);
    const results = await buildContestResponses(contests);
    res.status(200).json({ contests: results });
  } catch (err) {
    sendError(res, err);
  }
};

// POST /api/contests/:id/submit
// Owner sends a DRAFT (or an admin-REJECTED) contest for approval.
const submitContestForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid contest id" });
    }

    const contest = await Contest.findById(id);
    // Same "look like not-found" rule as assignments: don't reveal that
    // someone else's contest id exists.
    if (!contest || contest.teacher_id.toString() !== req.userId) {
      return res.status(404).json({ message: "Contest not found" });
    }
    if (!canTransition(contest.status, "PENDING_APPROVAL", "teacher")) {
      return res.status(400).json({ message: "Only draft or rejected contests can be submitted for approval" });
    }
    if (new Date(contest.end_at).getTime() <= Date.now()) {
      return res.status(400).json({ message: "This contest's end time has already passed" });
    }

    // Conditional update so two racing submits (or a submit racing a
    // future admin action) can't both win.
    const updated = await Contest.findOneAndUpdate(
      { _id: id, teacher_id: req.userId, status: { $in: SUBMITTABLE_FROM } },
      { $set: { status: "PENDING_APPROVAL", submitted_at: new Date() } },
      { new: true },
    );
    if (!updated) {
      return res.status(409).json({ message: "Contest status changed, please refresh and try again" });
    }

    const [response] = await buildContestResponses([updated]);
    res.status(200).json(response);
  } catch (err) {
    sendError(res, err);
  }
};

// GET /api/contests/game-options?subjectId=...&chapterId=...
// The playable Learnova games a teacher can put in a contest for the
// chosen subject (optionally one chapter). Teacher-side counterpart to
// /api/games/content, which is scoped to the *student's* grade and so
// is unusable here. Payloads are intentionally NOT returned — a
// teacher picks challenges by title/type; answer keys stay server-side.
const listGameOptions = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.query;
    if (typeof subjectId !== "string" || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: "A valid subjectId is required" });
    }
    if (chapterId !== undefined && chapterId !== "" && (typeof chapterId !== "string" || !mongoose.Types.ObjectId.isValid(chapterId))) {
      return res.status(400).json({ message: "Invalid chapterId" });
    }

    const subject = await Subject.findById(subjectId).select("_id");
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    let chapters;
    if (chapterId) {
      const chapter = await Chapter.findById(chapterId).select("subject_id title order_index");
      if (!chapter) return res.status(404).json({ message: "Chapter not found" });
      if (idOf(chapter.subject_id) !== subjectId) {
        return res.status(400).json({ message: "The selected chapter does not belong to the selected subject" });
      }
      chapters = [chapter];
    } else {
      chapters = await Chapter.find({ subject_id: subjectId }).select("title order_index").sort({ order_index: 1 });
    }

    const chapterById = {};
    for (const ch of chapters) chapterById[idOf(ch._id)] = ch;

    const concepts = await Concept.find({ chapter_id: { $in: chapters.map((c) => c._id) } }).select("title chapter_id");
    const conceptById = {};
    for (const c of concepts) conceptById[idOf(c._id)] = c;

    const games = await GameContent.find({
      concept_id: { $in: concepts.map((c) => c._id) },
      game_type: { $in: KNOWN_GAME_TYPES },
    })
      .select("title game_type difficulty concept_id order_index")
      .sort({ order_index: 1 });

    const options = games.map((g) => {
      const concept = conceptById[idOf(g.concept_id)];
      const chapter = concept ? chapterById[idOf(concept.chapter_id)] : null;
      return {
        id: g._id,
        title: g.title,
        gameType: g.game_type,
        label: GAME_TYPE_TO_LABEL[g.game_type] || g.game_type,
        difficulty: g.difficulty,
        conceptId: concept?._id || null,
        conceptTitle: concept?.title || null,
        chapterId: chapter?._id || null,
        chapterTitle: chapter?.title || null,
        _chapterOrder: chapter?.order_index ?? 0,
      };
    });
    // Group by chapter order first so the picker reads in syllabus order.
    options.sort((a, b) => a._chapterOrder - b._chapterOrder);
    for (const o of options) delete o._chapterOrder;

    res.status(200).json({ games: options });
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  buildContestResponses,
  createContest,
  listMyContests,
  submitContestForApproval,
  listGameOptions,
};

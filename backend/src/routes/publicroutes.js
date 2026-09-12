const express = require("express");
const router = express.Router();
const {
  getStandards,
  getStreamsByGrade,
  getSubjectsByGrade,
  getChaptersBySubject,
  getChapterPreview,
} = require("../controllers/publicControllers");

// No `protect` anywhere in this file on purpose — this is the
// no-login browsing surface (Standard -> [Stream] -> Subject ->
// Chapter -> Game preview). Actually playing a game still goes
// through the existing protected /api/games/* routes, using the
// guest token minted by POST /api/auth/guest.
router.get("/standards", getStandards);
router.get("/standards/:grade/streams", getStreamsByGrade);
router.get("/standards/:grade/subjects", getSubjectsByGrade);
router.get("/subjects/:subjectId/chapters", getChaptersBySubject);
router.get("/chapters/:id", getChapterPreview);

module.exports = router;

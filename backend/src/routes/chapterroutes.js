const express = require("express");
const router = express.Router();
const {
  getChapters,
  getChapterDetail,
} = require("../controllers/chapterControllers");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getChapters);
router.get("/:id", protect, getChapterDetail);
module.exports = router;

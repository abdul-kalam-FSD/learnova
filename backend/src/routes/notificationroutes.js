const express = require("express");
const router = express.Router();
const {
  subscribe,
  unsubscribe,
  triggerStreakReminders,
} = require("../controllers/notificationControllers");
const { protect } = require("../middleware/authMiddleware");

const requireCronSecret = (req, res, next) => {
  const configuredSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers["x-cron-secret"];
  if (!configuredSecret || !providedSecret || providedSecret !== configuredSecret) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

router.post("/subscribe", protect, subscribe);
router.post("/unsubscribe", protect, unsubscribe);
router.post("/trigger-streak-reminders", requireCronSecret, triggerStreakReminders);

module.exports = router;

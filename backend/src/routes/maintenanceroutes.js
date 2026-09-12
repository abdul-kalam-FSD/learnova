const express = require("express");
const router = express.Router();
const { cleanupOrphanedGuests } = require("../controllers/maintenanceControllers");

// Same gate as notificationroutes.js's trigger-streak-reminders — an
// external scheduler (not a logged-in user, not even an admin) calls
// this, so it's a shared-secret header rather than `protect`.
const requireCronSecret = (req, res, next) => {
  const configuredSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers["x-cron-secret"];
  if (!configuredSecret || !providedSecret || providedSecret !== configuredSecret) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

router.post("/cleanup-guests", requireCronSecret, cleanupOrphanedGuests);

module.exports = router;

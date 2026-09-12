// Phase 5A: single source of truth for explaining GET /api/games/recommended's
// `reason` field to students.
//
// Before this module, the exact same copy lived twice — once in
// Practice.jsx and once in ChapterMission.jsx (Phase 4E) — as identical,
// independently-maintained REASON_COPY objects. Phase 4F's audit flagged
// that duplication as a maintenance risk (a future wording tweak in one
// place, forgotten in the other, would silently make the two screens
// explain the same recommendation differently). This module replaces
// both call sites; the copy itself is unchanged from what already
// shipped in Practice/ChapterMission.
//
// Deliberately NOT changed here:
//   - the backend's reason values (weak-concept / learning-concept /
//     strong-concept / fallback-any-content) — those come from
//     gameControllers.getRecommendedGame() and are out of scope for a
//     frontend-only phase.
//   - the wording of any existing reason string.
//
// If the API ever returns a reason value not present in this map (a
// genuinely unknown/future value), getRecommendationReasonText returns
// null rather than inventing fallback copy — callers must treat null as
// "omit the reason line entirely," never as an excuse to guess at text.
export const RECOMMENDATION_REASON_COPY = {
  "weak-concept": "You're still building this up — a quick round will help.",
  "learning-concept": "You're on your way — keep this one warm.",
  "strong-concept": "You've got this down — a quick review keeps it sharp.",
  "fallback-any-content": "Something new to try.",
};

// Returns the human-readable explanation for a recommendation `reason`
// value, or null if the reason is missing/unrecognized. Never invents
// text for a reason this map doesn't know about.
export function getRecommendationReasonText(reason) {
  return RECOMMENDATION_REASON_COPY[reason] || null;
}

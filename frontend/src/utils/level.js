// Simple, transparent XP-to-level model — flat 400 XP per level.
// No backend dependency: derived purely from xp_total the profile
// already fetches. Keep this deterministic (no randomness, no hidden
// curve) so a student can always predict how much XP the next level needs.
const XP_PER_LEVEL = 400;

export function getLevelProgress(xpTotal) {
  const xp = Math.max(0, xpTotal || 0);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;
  return {
    level,
    xpIntoLevel,
    xpPerLevel: XP_PER_LEVEL,
    pct: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
  };
}
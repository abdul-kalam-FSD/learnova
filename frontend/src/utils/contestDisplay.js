// Shared wording for the student contest screens.

export const PHASE_LABELS = {
  ACTIVE: "Live now",
  UPCOMING: "Upcoming",
  ENDED: "Ended",
};

export function formatContestTime(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export function contestPlace(contest) {
  return [contest.subject, contest.chapterTitle || "All chapters"].filter(Boolean).join(" · ");
}

// Seconds -> "45s", "12m 5s", "2h 10m". null/undefined -> "—".
export function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—";
  const s = Math.max(0, Math.round(Number(seconds)));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function formatPercent(value) {
  return value == null ? "—" : `${value}%`;
}

export const PARTICIPATION_LABELS = {
  COMPLETED: "Completed all",
  PARTIAL: "Partly done",
  IN_PROGRESS: "Started",
};

export const CHALLENGE_STATUS_LABELS = {
  COMPLETED: "Completed",
  IN_PROGRESS: "In progress",
  NOT_STARTED: "Not started",
};

// ---------------------------------------------------------------------
// Grade-aware wording for the contest details screen (Grades 4-6 only).
//
// Same facts, fewer words. Grade 7-12, guests and unknown grades (grade
// null/unrecognised) get the ORIGINAL sentences, character for character.
// Only the two explanatory lines are touched; the teacher's description,
// dates, progress, buttons and results link are untouched.
// ---------------------------------------------------------------------
export function contestPhaseNotice(phase, grade, startAt, endAt) {
  const g = Number(grade);
  const start = formatContestTime(startAt);
  const end = formatContestTime(endAt);
  if (g === 4) {
    return {
      UPCOMING: `It starts ${start}. Come back then to play!`,
      ACTIVE: `It's on now! Finish before ${end}. Each game counts once.`,
      ENDED: "This contest is over. You can't play its games now.",
    }[phase];
  }
  if (g === 5 || g === 6) {
    return {
      UPCOMING: `This contest starts ${start}. The games unlock when it begins.`,
      ACTIVE: `Live now — ends ${end}. Each game counts once, so do your best.`,
      ENDED: `This contest ended ${end}. You can no longer start its games.`,
    }[phase];
  }
  return {
    UPCOMING: `This contest starts ${start}. You can look around now — the games unlock when it begins.`,
    ACTIVE: `Live now — ends ${end}. Each game counts once, so give it your best try.`,
    ENDED: `This contest ended ${end}. You can no longer start games for it.`,
  }[phase];
}

export function contestPlayHint(grade) {
  const g = Number(grade);
  if (g === 4) return "Tap Play to start a game.";
  if (g === 5 || g === 6) return "Tap Play to open the game. XP and streaks work just like normal practice.";
  return "Tapping Play opens the game and shows only this contest's levels. XP, mastery and streaks work exactly like normal practice.";
}

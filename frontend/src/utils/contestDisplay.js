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

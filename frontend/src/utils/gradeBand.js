// Section 14 (age-appropriate design): the same four bands PublicHome
// already shows students during grade selection (see GRADE_BANDS in
// PublicHome.jsx), reused here so the Game Shell can vary tone,
// copy and sizing by age instead of treating Grade 4 and Grade 12
// identically. Kept deliberately small — this is shell-level
// presentation only, not a per-game difficulty system.

export const GRADE_BANDS = {
  primary: { grades: [4, 5], label: "Primary" },
  middle: { grades: [6, 7, 8], label: "Middle School" },
  high: { grades: [9, 10], label: "High School" },
  senior: { grades: [11, 12], label: "Senior Secondary" },
};

// Falls back to "middle" (today's existing tone/sizing, unchanged)
// for a missing/unrecognized grade so any game that doesn't pass a
// grade yet renders exactly as it did before this existed.
export function gradeBandOf(grade) {
  const g = Number(grade);
  if (g === 4 || g === 5) return "primary";
  if (g >= 6 && g <= 8) return "middle";
  if (g === 9 || g === 10) return "high";
  if (g === 11 || g === 12) return "senior";
  return "middle";
}

// Per-band copy for the Game Shell's feedback card. "middle" matches
// the shell's original hardcoded defaults exactly, so existing games
// that already pass explicit verdict text are unaffected either way.
export const FEEDBACK_COPY = {
  primary: { correct: "Yay! You got it! 🎉", incorrect: "Not quite — try again!" },
  middle: { correct: "✓ Correct!", incorrect: "✕ Not quite" },
  high: { correct: "Correct", incorrect: "Incorrect" },
  senior: { correct: "Correct — well reasoned.", incorrect: "Incorrect. Review the explanation." },
};

// Matches GameHint's original always-show-💡 rendering exactly for
// "middle" (the default), so games that don't opt into a gradeBand
// see no visual change at all.
export const HINT_LABEL = {
  primary: { closed: "🤔 Need help?", open: "🤔 Hide help" },
  middle: { closed: "💡 Need a hint?", open: "💡 Hide hint" },
  high: { closed: "💡 Hint", open: "💡 Hide hint" },
  senior: { closed: "💡 Hint", open: "💡 Hide hint" },
};

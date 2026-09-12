// Minimal shared convention for Builder-style games whose on-screen
// copy is reused across chapters/subjects that share the same
// mechanic but not the same subject-matter language (Phase 1B §16).
// CircuitBuilder already proved this pattern locally (its own
// DEFAULT_THEME + themeFor, reused for Electrostatics/Semiconductor
// content alongside literal circuit-wiring); this just extracts the
// one-line merge itself so other Builder-family games (starting with
// TimelineBuilder) can adopt the same convention without redefining
// it.
//
// Deliberately NOT a theme engine: no registration, no nesting, no
// validation — each game still owns its own DEFAULT_THEME object and
// field names (its copy is its own concern), this only standardizes
// "payload.theme overrides DEFAULT_THEME, anything unset falls back."
// The theme controls presentation/copy only — it must never carry
// scoring, correctness, XP, mastery, or API-contract fields.
export function themeFor(defaultTheme, payload) {
  return { ...defaultTheme, ...(payload?.theme || {}) };
}

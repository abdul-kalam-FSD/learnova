// Phase 0B (Subject World): gives each subject a distinct-feeling
// accent without inventing a new color per subject or per theme.
// Categories map onto CSS classes (see .world-card--<category> in
// Chapters.css) that reuse the SAME theme-aware tokens every other
// component already uses (--primary-color, --accent-color,
// --success-color, --xp-color) via color-mix, so a subject world
// still looks correct in light/dark/forest/any future theme with zero
// extra token maintenance. This is a UI-only grouping — it never
// affects subject/chapter/game data, routing, or scoring.
const CATEGORY_RULES = [
  { keywords: ["math"], category: "math" },
  { keywords: ["physics", "chemistry"], category: "physical" },
  { keywords: ["biology", "science"], category: "life" },
  { keywords: ["english", "tamil", "language"], category: "language" },
  { keywords: ["computer", "programming"], category: "computing" },
];

const DEFAULT_CATEGORY = "humanities"; // History, Geography, Civics, Commerce, Social Science, etc.

export function getSubjectCategory(subjectName) {
  if (!subjectName) return DEFAULT_CATEGORY;
  const lower = subjectName.toLowerCase();
  const match = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((kw) => lower.includes(kw)),
  );
  return match ? match.category : DEFAULT_CATEGORY;
}

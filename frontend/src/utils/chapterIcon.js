// Simple keyword -> icon mapping so chapter cards feel identity-driven
// without needing a backend field. Shared between Chapters.jsx and
// Progress.jsx.
const ICON_RULES = [
  { keywords: ["cell", "living", "diversity"], icon: "🔬" },
  { keywords: ["life process", "nutrition", "respiration", "circulat"], icon: "🫁" },
  { keywords: ["control", "coordination", "nervous", "hormone"], icon: "🧠" },
  { keywords: ["reproduc"], icon: "🌱" },
  { keywords: ["heredity", "evolution", "genetic"], icon: "🧬" },
  { keywords: ["environment", "ecology", "ecosystem"], icon: "🌿" },
];

// Fallback when no topic keyword matches — keyed by subject name so
// a Commerce or History chapter no longer inherits Biology's DNA
// icon just because it's the only rule with no keyword hit. Matched
// by substring so "Mathematics", "Commerce - Accountancy", "Social
// Science" etc. all resolve without needing an exact-name list per
// grade/stream variant.
const SUBJECT_FALLBACK_ICON_RULES = [
  { keywords: ["computer", "programming"], icon: "💻" },
  { keywords: ["civics", "social science", "social studies"], icon: "🏙️" },
  { keywords: ["chemistry"], icon: "⚗️" },
  { keywords: ["physics"], icon: "⚛️" },
  { keywords: ["math"], icon: "📐" },
  { keywords: ["history"], icon: "🏛️" },
  { keywords: ["geography"], icon: "🗺️" },
  { keywords: ["english"], icon: "📖" },
  { keywords: ["tamil"], icon: "🈴" },
  { keywords: ["commerce", "account", "business", "economic"], icon: "💼" },
  { keywords: ["biology", "science"], icon: "🧬" },
];

const DEFAULT_ICON = "📘";

export function iconFor(title, subjectName) {
  const lower = title.toLowerCase();
  const match = ICON_RULES.find((rule) =>
    rule.keywords.some((kw) => lower.includes(kw)),
  );
  if (match) return match.icon;

  if (subjectName) {
    const lowerSubject = subjectName.toLowerCase();
    const subjectMatch = SUBJECT_FALLBACK_ICON_RULES.find((rule) =>
      rule.keywords.some((kw) => lowerSubject.includes(kw)),
    );
    if (subjectMatch) return subjectMatch.icon;
  }

  return DEFAULT_ICON;
}

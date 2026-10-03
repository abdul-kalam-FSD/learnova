import { uiBandOf } from "./gradeBand";

// Grade-aware instructional CONTEXT for the Game Shell lobby (Team Lead:
// "grade changes the context/complexity; the outcome stays the same").
//
// Scope: wording + visibility of the text AROUND a game (GameLobby only).
// It never touches game mechanics, scoring, XP, streak, mastery, answer
// validation, API contracts or GameContent payloads.
//
// No new grade detection: the band comes from the existing
// GradeBandProvider / uiBandOf() (utils/gradeBand.js):
//   primary -> Grades 4-6
//   middle + high -> Grades 7-10 (one copy set here)
//   senior  -> Grades 11-12
// "middle" is byte-for-byte the lobby's original hardcoded copy, so
// Grades 7-10, guests and unknown grades render exactly as before.

const MIDDLE = {
  objectiveLabel: "Mission objective",
  skillsLabel: "Skills",
  showSkills: true,
  startLabel: "Start Mission",
  backLabel: "← Choose a different level",
  levelLabel: (n, total) => `Level ${n} of ${total}`,
  timeLabel: (min) => `~${min} min`,
  xpPerCorrectLabel: (xp) => `+${xp} XP per correct`,
  perfectBonusLabel: (xp) => ` · +${xp} perfect bonus`,
  maxXpLabel: (xp) => `Up to ${xp} XP this round`,
};

const PRIMARY = {
  ...MIDDLE,
  objectiveLabel: "Your mission",
  showSkills: false, // fewer things on screen at once for Grades 4-6
  startLabel: "Let's start!",
  backLabel: "← Pick another level",
  xpPerCorrectLabel: (xp) => `+${xp} XP for each right answer`,
  perfectBonusLabel: (xp) => ` · ⭐ +${xp} bonus for no mistakes`,
  maxXpLabel: (xp) => `Win up to ${xp} XP`,
};

const SENIOR = {
  ...MIDDLE,
  objectiveLabel: "Learning objective",
  startLabel: "Begin",
};

export const GRADE_CONTEXT = { primary: PRIMARY, middle: MIDDLE, high: MIDDLE, senior: SENIOR };

// band: value from GradeBandProvider (or null). Unknown -> original copy.
export function getGradeContext(band) {
  return GRADE_CONTEXT[band] || MIDDLE;
}

// For callers that only have a raw grade number.
export function getGradeContextForGrade(grade) {
  return getGradeContext(uiBandOf(grade));
}

// ---------------------------------------------------------------------
// Objective text, shortened by grade.
//
// The lobby "objective" is the concept's full explanation_text. Grade 4
// content averages ~320 characters of it (up to ~480), which is a wall of
// text for a 9-year-old. Same underlying text and same game; only how much
// of it the lobby SHOWS changes:
//
//   Grade 4   -> first complete sentence (<= 200 chars)
//   Grade 5-6 -> first two complete sentences (<= 280 chars)
//   everything else (7-12, guests, unknown grade) -> returned untouched
//
// This never rewrites words. It only drops trailing WHOLE sentences, and
// it returns the original text whenever it cannot do that with confidence:
// abbreviations / initials / ellipses / line breaks anywhere in the text
// (sentence boundaries are ambiguous), a kept part that introduces a list
// ("...:"), unbalanced brackets or quotes, a first sentence that is itself
// too long, or text that is already short. Decimals such as "3.5" are not
// boundaries because a boundary needs whitespace after the full stop.
// ---------------------------------------------------------------------
const OBJECTIVE_LIMITS = {
  4: { maxSentences: 1, maxChars: 200 },
  5: { maxSentences: 2, maxChars: 280 },
  6: { maxSentences: 2, maxChars: 280 },
};

// A lone stub ("A day has 24 hours.") is not an objective. If the kept
// part is shorter than this and a second sentence does not fit, keep the
// original instead.
const MIN_OBJECTIVE_CHARS = 45;

// Anything that makes "where does a sentence end?" a guess.
const AMBIGUOUS_BOUNDARY =
  /\b(?:e\.g|i\.e|etc|vs|viz|cf|approx|Mr|Mrs|Ms|Dr|Prof|St|Mt|No|Fig|Rs|a\.m|p\.m)\.|\b[A-Z]\.\s?[A-Z]\.|\.\.\.|…|[\r\n]/i;

function isBalanced(str) {
  const pairs = [["(", ")"], ["[", "]"], ["{", "}"]];
  if (!pairs.every(([o, c]) => str.split(o).length === str.split(c).length)) return false;
  // Straight double quotes must pair up. (Single quotes are apostrophes
  // far more often than quotation marks, so they are not counted.)
  return (str.match(/"/g) || []).length % 2 === 0;
}

// Complete sentences, in order, or null when the text is not safely
// splittable. A boundary is . ! or ? (plus any closing quote/bracket),
// then whitespace, then a capital letter / digit / opening quote.
function splitSentences(text) {
  if (AMBIGUOUS_BOUNDARY.test(text)) return null;
  const sentences = [];
  const boundary = /[.!?]+["')\]”’]*\s+(?=["'(“‘]?[A-Z0-9])/g;
  let start = 0;
  let m;
  while ((m = boundary.exec(text)) !== null) {
    sentences.push(text.slice(start, m.index + m[0].trimEnd().length));
    start = m.index + m[0].length;
  }
  const tail = text.slice(start);
  if (tail) sentences.push(tail);
  return sentences.every((s) => /[.!?]["')\]”’]*$/.test(s)) ? sentences : null;
}

// text: any value. grade: the student's numeric grade (or null).
export function simplifyObjective(text, grade) {
  const limits = OBJECTIVE_LIMITS[Number(grade)];
  if (!limits || typeof text !== "string") return text;
  const original = text;
  const trimmed = text.trim();
  if (trimmed.length <= limits.maxChars) return original; // already short

  const sentences = splitSentences(trimmed);
  if (!sentences || sentences.length < 2) return original;

  const kept = [];
  let length = 0;
  for (const sentence of sentences) {
    const next = length + (kept.length ? 1 : 0) + sentence.length;
    const wantMore =
      kept.length < limits.maxSentences ||
      (kept.length === 1 && kept[0].length < MIN_OBJECTIVE_CHARS);
    if (!wantMore || next > limits.maxChars) break;
    kept.push(sentence);
    length = next;
  }
  if (!kept.length || kept.length === sentences.length) return original;

  const result = kept.join(" ");
  if (result.length < MIN_OBJECTIVE_CHARS || /:$/.test(result) || !isBalanced(result)) return original;
  return result;
}

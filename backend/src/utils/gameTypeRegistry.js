// Single source of truth for every game_type the backend knows how to
// score (gameControllers.checkAttempt) and create content for
// (contentControllers.createGameContent). Previously this list was
// hand-copied into contentControllers.js (KNOWN_GAME_TYPES) and
// AdminGameContent.jsx (GAME_TYPES) separately — adding a mechanic
// meant remembering to update three places. Now those two import
// from here instead.
//
// `subject` must exactly match the Subject.name string used by the
// seed scripts (see seed*.js `Subject.create({ name: ... })`) so the
// Game Selection Engine (getGameCatalog/getRecommendedGame) can group
// game_types under the right subject without an extra DB lookup.
//
// `mechanicTier` drives adaptive mechanic selection in
// getRecommendedGame (see gameControllers.js) — which *kind* of
// challenge (not just which concept) gets recommended for a given
// mastery state:
//   GUIDED   - low-complexity, visual, single-shot construction or
//              matching, no time pressure. For mastery: weak.
//   PRACTICE - standard interaction, moderate difficulty. For
//              mastery: learning.
//   ADVANCED - strategy/speed/boss/multi-step mechanics with real
//              constraints (move budgets, timers, resource state).
//              For mastery: strong.
const GAME_TYPES = [
  { game_type: "MATH_FRACTION_BUILDER", subject: "Mathematics", label: "Fraction Builder", mechanicTier: "GUIDED" },
  { game_type: "MATH_FRACTION_MATCH", subject: "Mathematics", label: "Fraction Match", mechanicTier: "GUIDED" },
  { game_type: "MATH_FRACTION_SPEED_CHALLENGE", subject: "Mathematics", label: "Fraction Speed Challenge", mechanicTier: "ADVANCED" },
  { game_type: "MATH_EQUATION_BUILDER", subject: "Mathematics", label: "Equation Builder", mechanicTier: "GUIDED" },
  { game_type: "MATH_NUMBER_MACHINE", subject: "Mathematics", label: "Number Machine", mechanicTier: "PRACTICE" },
  { game_type: "MATH_EQUATION_SPEED_CALCULATION", subject: "Mathematics", label: "Equation Speed Calculation", mechanicTier: "ADVANCED" },
  { game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH", subject: "Mathematics", label: "Equation Word Problem Match", mechanicTier: "PRACTICE" },
  { game_type: "MATH_EQUATION_BALANCE_STRATEGY", subject: "Mathematics", label: "Equation Balance Strategy", mechanicTier: "ADVANCED" },
  { game_type: "MATH_EQUATION_BOSS_CHALLENGE", subject: "Mathematics", label: "Equation Boss Challenge", mechanicTier: "ADVANCED" },
  { game_type: "MATH_FRACTION_BOSS_CHALLENGE", subject: "Mathematics", label: "Fraction Boss Challenge", mechanicTier: "ADVANCED" },
  { game_type: "MATH_FRACTION_STRATEGY_CHALLENGE", subject: "Mathematics", label: "Fraction Strategy Challenge", mechanicTier: "ADVANCED" },
  { game_type: "MATH_SHAPE_MATCH", subject: "Mathematics", label: "Shape Match", mechanicTier: "GUIDED" },
  { game_type: "MATH_PLACE_VALUE_MATCH", subject: "Mathematics", label: "Place Value Match", mechanicTier: "GUIDED" },
  { game_type: "MATH_RATIO_MATCH", subject: "Mathematics", label: "Ratio Match", mechanicTier: "GUIDED" },
  { game_type: "MATH_FUNCTION_MATCH", subject: "Mathematics", label: "Function Match", mechanicTier: "GUIDED" },
  { game_type: "MATH_TRIG_MATCH", subject: "Mathematics", label: "Trig Match", mechanicTier: "GUIDED" },
  { game_type: "MATH_INEQUALITY_MATCH", subject: "Mathematics", label: "Inequality Match", mechanicTier: "GUIDED" },
  { game_type: "MATH_PERMCOMB_SPEED_CHALLENGE", subject: "Mathematics", label: "Permutations & Combinations Speed Challenge", mechanicTier: "ADVANCED" },
  { game_type: "MATH_PASCAL_TRIANGLE_BUILD", subject: "Mathematics", label: "Pascal's Triangle Builder", mechanicTier: "GUIDED" },
  { game_type: "MATH_AP_SPEED_CHALLENGE", subject: "Mathematics", label: "Arithmetic Progression Speed Challenge", mechanicTier: "ADVANCED" },
  { game_type: "MATH_LINE_EQUATION_MATCH", subject: "Mathematics", label: "Line Equation Match", mechanicTier: "GUIDED" },
  { game_type: "MATH_GEOMETRY_BUILDER", subject: "Mathematics", label: "Geometry Builder", mechanicTier: "GUIDED" },
  { game_type: "MATH_ANGLE_SPEED_CHALLENGE", subject: "Mathematics", label: "Angle Speed Challenge", mechanicTier: "ADVANCED" },
  { game_type: "MATH_GEOMETRY_STRATEGY_CHALLENGE", subject: "Mathematics", label: "Geometry Strategy Challenge", mechanicTier: "ADVANCED" },
  { game_type: "MATH_GEOMETRY_BOSS_CHALLENGE", subject: "Mathematics", label: "Geometry Boss Challenge", mechanicTier: "ADVANCED" },
  { game_type: "BIO_VIRTUAL_LAB", subject: "Biology", label: "Virtual Lab", mechanicTier: "PRACTICE" },
  { game_type: "BIO_ECOSYSTEM_BALANCE", subject: "Biology", label: "Ecosystem Balance", mechanicTier: "PRACTICE" },
  { game_type: "BIO_GENETICS_SIMULATOR", subject: "Biology", label: "Genetics Simulator", mechanicTier: "GUIDED" },
  { game_type: "BIO_DIAGNOSIS", subject: "Biology", label: "Diagnosis", mechanicTier: "PRACTICE" },
  { game_type: "BIO_SPECIMEN_ANALYSIS", subject: "Biology", label: "Specimen Analysis", mechanicTier: "PRACTICE" },
  { game_type: "PHYSICS_CIRCUIT_BUILDER", subject: "Physics", label: "Circuit Builder", mechanicTier: "GUIDED" },
  { game_type: "PHYSICS_MATCH", subject: "Physics", label: "Magnetism Match", mechanicTier: "GUIDED" },
  { game_type: "PHYSICS_FORCE_SIMULATOR", subject: "Physics", label: "Force & Motion Simulator", mechanicTier: "PRACTICE" },
  { game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE", subject: "Physics", label: "Ohm's Law Speed Challenge", mechanicTier: "ADVANCED" },
  { game_type: "PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE", subject: "Physics", label: "Work, Energy & Power Speed Challenge", mechanicTier: "ADVANCED" },
  { game_type: "PHYSICS_CAPACITANCE_SPEED_CHALLENGE", subject: "Physics", label: "Capacitance Speed Challenge", mechanicTier: "ADVANCED" },
  { game_type: "CHEMISTRY_EQUATION_BALANCER", subject: "Chemistry", label: "Equation Balancer", mechanicTier: "PRACTICE" },
  { game_type: "CHEMISTRY_MOLECULE_BUILDER", subject: "Chemistry", label: "Molecule Builder", mechanicTier: "GUIDED" },
  { game_type: "CHEMISTRY_REACTION_LAB", subject: "Chemistry", label: "Reaction Lab", mechanicTier: "PRACTICE" },
  { game_type: "CHEMISTRY_MATCH", subject: "Chemistry", label: "Metals & Non-Metals Match", mechanicTier: "GUIDED" },
  { game_type: "HISTORY_TIMELINE_BUILDER", subject: "History", label: "Timeline Builder", mechanicTier: "GUIDED" },
  { game_type: "HISTORY_CAUSE_EFFECT_MATCH", subject: "History", label: "Cause & Effect Match", mechanicTier: "PRACTICE" },
  { game_type: "GEOGRAPHY_ROUTE_BUILDER", subject: "Geography", label: "Route Builder", mechanicTier: "GUIDED" },
  { game_type: "GEOGRAPHY_FEATURE_MATCH", subject: "Geography", label: "Feature Match", mechanicTier: "PRACTICE" },
  { game_type: "ENGLISH_WORD_FORGE", subject: "English", label: "Word Forge", mechanicTier: "GUIDED" },
  { game_type: "ENGLISH_SENTENCE_BUILDER", subject: "English", label: "Sentence Builder", mechanicTier: "PRACTICE" },
  { game_type: "CS_DEBUGGING_LAB", subject: "Computer Science", label: "Debugging Lab", mechanicTier: "PRACTICE" },
  { game_type: "CS_CODE_ORDER_BUILDER", subject: "Computer Science", label: "Code Order Builder", mechanicTier: "GUIDED" },
  { game_type: "TAMIL_PROVERB_MATCH", subject: "Tamil", label: "Proverb Match", mechanicTier: "GUIDED" },
  { game_type: "TAMIL_SENTENCE_BUILDER", subject: "Tamil", label: "Sentence Builder", mechanicTier: "PRACTICE" },
  { game_type: "SOCIAL_SCIENCE_CIVIC_DECISION", subject: "Social Science", label: "Civic Decision", mechanicTier: "PRACTICE" },
  { game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER", subject: "Social Science", label: "Civic Process Builder", mechanicTier: "PRACTICE" },
  { game_type: "COMMERCE_CONCEPT_MATCH", subject: "Commerce", label: "Concept Match", mechanicTier: "GUIDED" },
  { game_type: "COMMERCE_PROCESS_BUILDER", subject: "Commerce", label: "Process Builder", mechanicTier: "PRACTICE" },
];

const KNOWN_GAME_TYPES = GAME_TYPES.map((g) => g.game_type);

const GAME_TYPE_TO_SUBJECT = GAME_TYPES.reduce((acc, g) => {
  acc[g.game_type] = g.subject;
  return acc;
}, {});

const GAME_TYPE_TO_LABEL = GAME_TYPES.reduce((acc, g) => {
  acc[g.game_type] = g.label;
  return acc;
}, {});

const GAME_TYPE_TO_TIER = GAME_TYPES.reduce((acc, g) => {
  acc[g.game_type] = g.mechanicTier;
  return acc;
}, {});

// Mastery state -> preferred mechanic tier for adaptive selection in
// getRecommendedGame.
const MASTERY_STATE_TO_PREFERRED_TIER = {
  weak: "GUIDED",
  learning: "PRACTICE",
  strong: "ADVANCED",
};

module.exports = {
  GAME_TYPES,
  KNOWN_GAME_TYPES,
  GAME_TYPE_TO_SUBJECT,
  GAME_TYPE_TO_LABEL,
  GAME_TYPE_TO_TIER,
  MASTERY_STATE_TO_PREFERRED_TIER,
};

// Frontend counterpart to backend/src/utils/gameTypeRegistry.js.
// Backend owns subject grouping + labels (returned by /api/games/catalog
// and /api/games/recommended); this file only adds what's a frontend-only
// concern: which route/icon a game_type opens. Keep in sync with the
// <Route path="/games/..."> list in App.jsx when adding a mechanic —
// AdminGameContent's GAME_TYPES dropdown also reads from here now, so
// there's one list instead of three.
export const GAME_TYPES = [
  { game_type: "MATH_FRACTION_BUILDER", route: "/games/fraction-builder", icon: "🧮" , skills: ["Fractions", "Number Sense"] },
  { game_type: "MATH_FRACTION_MATCH", route: "/games/fraction-match", icon: "🧮", skills: ["Fractions", "Pattern Matching"] },
  { game_type: "MATH_FRACTION_SPEED_CHALLENGE", route: "/games/fraction-speed-challenge", icon: "⏱️" , skills: ["Fractions", "Speed & Accuracy"] },
  { game_type: "MATH_FRACTION_BOSS_CHALLENGE", route: "/games/fraction-boss-challenge", icon: "🐉" , skills: ["Fractions", "Risk Management"] },
  { game_type: "MATH_FRACTION_STRATEGY_CHALLENGE", route: "/games/fraction-strategy-challenge", icon: "🧩" , skills: ["Fractions", "Planning & Strategy"] },
  { game_type: "MATH_EQUATION_BUILDER", route: "/games/equation-builder", icon: "🧮" , skills: ["Algebra", "Simple Equations"] },
  { game_type: "MATH_NUMBER_MACHINE", route: "/games/number-machine", icon: "⚙️" , skills: ["Algebra", "Simple Equations"] },
  { game_type: "MATH_EQUATION_SPEED_CALCULATION", route: "/games/equation-speed-calculation", icon: "⏱️" , skills: ["Algebra", "Speed & Accuracy"] },
  { game_type: "MATH_EQUATION_WORD_PROBLEM_MATCH", route: "/games/equation-word-problem-match", icon: "📖", skills: ["Algebra", "Word Problems"] },
  { game_type: "MATH_EQUATION_BALANCE_STRATEGY", route: "/games/equation-balance-strategy", icon: "⚖️" , skills: ["Algebra", "Planning & Strategy"] },
  { game_type: "MATH_EQUATION_BOSS_CHALLENGE", route: "/games/equation-boss-challenge", icon: "⚔️" , skills: ["Algebra", "Speed & Accuracy"] },
  { game_type: "MATH_SHAPE_MATCH", route: "/games/shape-match", icon: "🔺", skills: ["Geometry", "Classification"] },
  { game_type: "MATH_PLACE_VALUE_MATCH", route: "/games/place-value-match", icon: "🔢", skills: ["Place Value", "Number Sense"] },
  { game_type: "MATH_RATIO_MATCH", route: "/games/ratio-match", icon: "⚖️", skills: ["Ratios", "Proportional Reasoning"] },
  { game_type: "MATH_FUNCTION_MATCH", route: "/games/function-match", icon: "📈", skills: ["Functions", "Relations"] },
  { game_type: "MATH_TRIG_MATCH", route: "/games/trig-match", icon: "📐", skills: ["Trigonometry", "Pattern Matching"] },
  { game_type: "MATH_INEQUALITY_MATCH", route: "/games/inequality-match", icon: "🔀", skills: ["Inequalities", "Algebra"] },
  { game_type: "MATH_PERMCOMB_SPEED_CHALLENGE", route: "/games/permcomb-speed-challenge", icon: "⏱️" , skills: ["Permutations & Combinations", "Speed & Accuracy"] },
  { game_type: "MATH_PASCAL_TRIANGLE_BUILD", route: "/games/pascal-triangle-builder", icon: "🔺" , skills: ["Binomial Theorem", "Pattern Building"] },
  { game_type: "MATH_AP_SPEED_CHALLENGE", route: "/games/ap-speed-challenge", icon: "⏱️" , skills: ["Sequences & Series", "Speed & Accuracy"] },
  { game_type: "MATH_LINE_EQUATION_MATCH", route: "/games/line-equation-match", icon: "📈", skills: ["Coordinate Geometry", "Linear Equations"] },
  { game_type: "CHEMISTRY_MATCH", route: "/games/chemistry-match", icon: "🧲", skills: ["Chemistry", "Material Properties"] },
  { game_type: "MATH_GEOMETRY_BUILDER", route: "/games/geometry-builder", icon: "📐" , skills: ["Geometry", "Perimeter"] },
  { game_type: "MATH_ANGLE_SPEED_CHALLENGE", route: "/games/angle-speed-challenge", icon: "⏱️" , skills: ["Geometry", "Speed & Accuracy"] },
  { game_type: "MATH_GEOMETRY_STRATEGY_CHALLENGE", route: "/games/geometry-strategy-challenge", icon: "🧩" , skills: ["Geometry", "Planning & Strategy"] },
  { game_type: "MATH_GEOMETRY_BOSS_CHALLENGE", route: "/games/geometry-boss-challenge", icon: "🗿" , skills: ["Geometry", "Speed & Accuracy"] },
  { game_type: "BIO_VIRTUAL_LAB", route: "/games/virtual-lab", icon: "🔬" , skills: ["Biology", "Cell Structure"] },
  { game_type: "BIO_ECOSYSTEM_BALANCE", route: "/games/ecosystem-balance", icon: "🌿" , skills: ["Biology", "Food Chains & Webs"] },
  { game_type: "BIO_GENETICS_SIMULATOR", route: "/games/genetics-simulator", icon: "🧬" , skills: ["Biology", "Genetics"] },
  { game_type: "BIO_DIAGNOSIS", route: "/games/diagnosis", icon: "🩺" , skills: ["Biology", "Human Health"] },
  { game_type: "BIO_SPECIMEN_ANALYSIS", route: "/games/specimen-analysis", icon: "🔍" , skills: ["Biology", "Classification"] },
  { game_type: "PHYSICS_CIRCUIT_BUILDER", route: "/games/circuit-builder", icon: "⚡" , skills: ["Physics", "Systems Thinking"] },
  { game_type: "PHYSICS_MATCH", route: "/games/magnetism-match", icon: "🧲", skills: ["Physics", "Magnetism"] },
  { game_type: "PHYSICS_FORCE_SIMULATOR", route: "/games/force-simulator", icon: "➡️" , skills: ["Physics", "Forces & Motion"] },
  { game_type: "PHYSICS_OHMS_LAW_SPEED_CHALLENGE", route: "/games/ohms-law-speed-challenge", icon: "🔌" , skills: ["Circuits", "Speed & Accuracy"] },
  { game_type: "PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE", route: "/games/work-energy-power-speed-challenge", icon: "⚙️" , skills: ["Physics", "Speed & Accuracy"] },
  { game_type: "PHYSICS_CAPACITANCE_SPEED_CHALLENGE", route: "/games/capacitance-speed-challenge", icon: "🔋" , skills: ["Electrostatics", "Speed & Accuracy"] },
  { game_type: "CHEMISTRY_EQUATION_BALANCER", route: "/games/equation-balancer", icon: "🧪" , skills: ["Chemistry", "Chemical Equations"] },
  { game_type: "CHEMISTRY_MOLECULE_BUILDER", route: "/games/molecule-builder", icon: "🧪" , skills: ["Chemistry", "Atoms & Molecules"] },
  { game_type: "CHEMISTRY_REACTION_LAB", route: "/games/reaction-lab", icon: "🧪" , skills: ["Chemistry", "Chemical Reactions"] },
  { game_type: "HISTORY_TIMELINE_BUILDER", route: "/games/timeline-builder", icon: "📜" , skills: ["History", "Sequencing"] },
  { game_type: "HISTORY_CAUSE_EFFECT_MATCH", route: "/games/cause-effect-match", icon: "🔗", skills: ["History", "Cause and Effect Reasoning"] },
  { game_type: "GEOGRAPHY_ROUTE_BUILDER", route: "/games/route-builder", icon: "🗺️" , skills: ["Geography", "Spatial Reasoning"] },
  { game_type: "GEOGRAPHY_FEATURE_MATCH", route: "/games/feature-match", icon: "🌍", skills: ["Geography", "Feature Identification"] },
  { game_type: "ENGLISH_WORD_FORGE", route: "/games/word-forge", icon: "✍️" , skills: ["English", "Vocabulary"] },
  { game_type: "ENGLISH_SENTENCE_BUILDER", route: "/games/sentence-builder", icon: "📝" , skills: ["English", "Grammar"] },
  { game_type: "CS_DEBUGGING_LAB", route: "/games/debugging-lab", icon: "💻" , skills: ["Computer Science", "Debugging"] },
  { game_type: "CS_CODE_ORDER_BUILDER", route: "/games/code-order-builder", icon: "🧩" , skills: ["Computer Science", "Logical Sequencing"] },
  { game_type: "TAMIL_PROVERB_MATCH", route: "/games/proverb-match", icon: "📜", skills: ["Tamil", "Proverbs"] },
  { game_type: "TAMIL_SENTENCE_BUILDER", route: "/games/tamil-sentence-builder", icon: "📝" , skills: ["Tamil", "Grammar"] },
  { game_type: "SOCIAL_SCIENCE_CIVIC_DECISION", route: "/games/civic-decision", icon: "🏛️" , skills: ["Civics", "Decision Making"] },
  { game_type: "SOCIAL_SCIENCE_PROCESS_BUILDER", route: "/games/civic-process-builder", icon: "📋" , skills: ["Civics", "Process Sequencing"] },
  { game_type: "COMMERCE_CONCEPT_MATCH", route: "/games/commerce-concept-match", icon: "💼", skills: ["Commerce", "Terminology"] },
  { game_type: "COMMERCE_PROCESS_BUILDER", route: "/games/commerce-process-builder", icon: "📊" , skills: ["Commerce", "Process Sequencing"] },
];

export const GAME_TYPE_TO_ROUTE = GAME_TYPES.reduce((acc, g) => {
  acc[g.game_type] = g.route;
  return acc;
}, {});

export const GAME_TYPE_TO_ICON = GAME_TYPES.reduce((acc, g) => {
  acc[g.game_type] = g.icon;
  return acc;
}, {});

// Phase 11 (Game Lobby): optional per-mechanic skill tags shown on the
// mission-briefing screen. Only populated for game_types that have
// been wired up to GameLobby so far — undefined for the rest, which
// GameLobby already handles by simply not rendering the Skills
// section (see its `skills && skills.length > 0` guard).
export const GAME_TYPE_TO_SKILLS = GAME_TYPES.reduce((acc, g) => {
  if (g.skills) acc[g.game_type] = g.skills;
  return acc;
}, {});

// Phase 0B (Subject/Chapter World): a short action phrase per mechanic
// — what the student actually DOES, not a generic "Play" — shown on
// world/chapter cards so different mechanics read as genuinely
// different gameplay instead of identical buttons. Derived from each
// mechanic's own interaction (Builder -> build/construct, Match ->
// match, Speed/AP/PermComb Challenge -> race the clock, Boss
// Challenge -> defeat a boss, Strategy Challenge -> plan a move,
// Lab/Virtual Lab -> investigate/run, Simulator -> simulate,
// Diagnosis -> find a cause, Debugging -> fix code). Display copy
// only — a separate literal map (not a field on GAME_TYPES above) so
// this never touches the array AdminGameContent/route/icon lookups
// read from. Kept in sync with GAME_TYPES via gameRegistry.test.js.
const GAME_TYPE_ACTIONS = {
  MATH_FRACTION_BUILDER: "Build the fraction",
  MATH_FRACTION_MATCH: "Match the fractions",
  MATH_FRACTION_SPEED_CHALLENGE: "Race the clock",
  MATH_FRACTION_BOSS_CHALLENGE: "Defeat the boss",
  MATH_FRACTION_STRATEGY_CHALLENGE: "Plan your move",
  MATH_EQUATION_BUILDER: "Build the equation",
  MATH_NUMBER_MACHINE: "Crack the machine",
  MATH_EQUATION_SPEED_CALCULATION: "Calculate fast",
  MATH_EQUATION_WORD_PROBLEM_MATCH: "Solve the story",
  MATH_EQUATION_BALANCE_STRATEGY: "Balance the equation",
  MATH_EQUATION_BOSS_CHALLENGE: "Defeat the boss",
  MATH_SHAPE_MATCH: "Match the shapes",
  MATH_PLACE_VALUE_MATCH: "Match the values",
  MATH_RATIO_MATCH: "Match the ratios",
  MATH_FUNCTION_MATCH: "Match the functions",
  MATH_TRIG_MATCH: "Match the angles",
  MATH_INEQUALITY_MATCH: "Match the inequality",
  MATH_PERMCOMB_SPEED_CHALLENGE: "Race the clock",
  MATH_PASCAL_TRIANGLE_BUILD: "Build the triangle",
  MATH_AP_SPEED_CHALLENGE: "Race the clock",
  MATH_LINE_EQUATION_MATCH: "Match the line",
  MATH_GEOMETRY_BUILDER: "Build the shape",
  MATH_ANGLE_SPEED_CHALLENGE: "Race the clock",
  MATH_GEOMETRY_STRATEGY_CHALLENGE: "Plan your move",
  MATH_GEOMETRY_BOSS_CHALLENGE: "Defeat the boss",
  CHEMISTRY_MATCH: "Match the materials",
  BIO_VIRTUAL_LAB: "Investigate the sample",
  BIO_ECOSYSTEM_BALANCE: "Balance the ecosystem",
  BIO_GENETICS_SIMULATOR: "Simulate the genes",
  BIO_DIAGNOSIS: "Find the cause",
  BIO_SPECIMEN_ANALYSIS: "Analyze the specimen",
  PHYSICS_CIRCUIT_BUILDER: "Restore the circuit",
  PHYSICS_MATCH: "Match the concept",
  PHYSICS_FORCE_SIMULATOR: "Simulate the forces",
  PHYSICS_OHMS_LAW_SPEED_CHALLENGE: "Race the clock",
  PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE: "Race the clock",
  PHYSICS_CAPACITANCE_SPEED_CHALLENGE: "Race the clock",
  CHEMISTRY_EQUATION_BALANCER: "Balance the equation",
  CHEMISTRY_MOLECULE_BUILDER: "Build the molecule",
  CHEMISTRY_REACTION_LAB: "Run the reaction",
  HISTORY_TIMELINE_BUILDER: "Rebuild the timeline",
  HISTORY_CAUSE_EFFECT_MATCH: "Match cause and effect",
  GEOGRAPHY_ROUTE_BUILDER: "Plan the route",
  GEOGRAPHY_FEATURE_MATCH: "Match the features",
  ENGLISH_WORD_FORGE: "Forge the word",
  ENGLISH_SENTENCE_BUILDER: "Build the sentence",
  CS_DEBUGGING_LAB: "Fix the program",
  CS_CODE_ORDER_BUILDER: "Order the code",
  TAMIL_PROVERB_MATCH: "Match the proverb",
  TAMIL_SENTENCE_BUILDER: "Build the sentence",
  SOCIAL_SCIENCE_CIVIC_DECISION: "Make the decision",
  SOCIAL_SCIENCE_PROCESS_BUILDER: "Build the process",
  COMMERCE_CONCEPT_MATCH: "Match the concept",
  COMMERCE_PROCESS_BUILDER: "Build the process",
};

export const GAME_TYPE_TO_ACTION = GAME_TYPES.reduce((acc, g) => {
  acc[g.game_type] = GAME_TYPE_ACTIONS[g.game_type] || "Play the mission";
  return acc;
}, {});

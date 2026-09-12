// Grade-band interaction complexity config (Section 26 of the
// completion spec). This does NOT touch any individual game's
// mechanic/UI code — it gives the shared game engine (startGame /
// submitGameAttempt in gameControllers.js) a single reusable place
// to look up how hint availability, timer pressure, and distractor
// load should scale with a student's grade, instead of hardcoding
// per-mechanic special cases or rewriting all 27 games.
//
// Three properties are wired into runtime behavior (hintsEnabled,
// timePressureMultiplier, maxDistractors) — the spec explicitly
// warns against inventing gameplay effects that aren't backed by
// real, honest behavior, so each one only does what it says:
//
// - maxDistractors caps how many *incorrect* pieces from an
//   authored pool (Fraction/Geometry Builder's `pieces`, Molecule
//   Builder's `atom_pool`, Diagnosis's `evidence`) are sent to the
//   client — see capDistractors() and its call site in
//   sanitizePayloadForClient(). This only trims noise; it can never
//   remove a piece the student needs, since checkAttempt scores
//   against the server-stored correct_piece_ids independent of what
//   pool was ever sent to the browser. null = uncapped (send every
//   authored piece, unchanged).
//
// interactionComplexity remains descriptive metadata (useful for
// content authoring) rather than a runtime knob — order-family
// builders (Equation Builder, Timeline Builder, etc.) hand the
// student every piece as the puzzle itself, with no distractors to
// trim, so there's no honest equivalent lever for that family yet.
//
// Any grade outside the known bands (shouldn't happen today —
// getGradeConceptIds only ever resolves seeded grades 6-12) falls
// back to INTERMEDIATE, which matches the platform's original
// un-band-aware behavior (hints on, no timer scaling, no distractor
// cap) so nothing regresses for an unexpected grade value.

const GRADE_BANDS = [
  { min: 1, max: 5, band: "GRADE_4_5", tier: "SIMPLE" },
  { min: 6, max: 8, band: "GRADE_6_8", tier: "INTERMEDIATE" },
  { min: 9, max: 10, band: "GRADE_9_10", tier: "ADVANCED" },
  { min: 11, max: 13, band: "GRADE_11_12", tier: "EXPERT" },
];

const DEFAULT_TIER = "INTERMEDIATE";

// timePressureMultiplier scales a game's stored time_limit_seconds
// (>1 = more time / less pressure, <1 = less time / more pressure).
// hintsEnabled gates whether submitGameAttempt ever reveals
// payload.hint after a wrong attempt, regardless of whether the
// content has one authored.
const BAND_CONFIG = {
  SIMPLE: {
    hintsEnabled: true,
    timePressureMultiplier: 1.5,
    interactionComplexity: "low",
    maxDistractors: 1,
  },
  INTERMEDIATE: {
    hintsEnabled: true,
    timePressureMultiplier: 1,
    interactionComplexity: "moderate",
    maxDistractors: 2,
  },
  ADVANCED: {
    hintsEnabled: true,
    timePressureMultiplier: 0.9,
    interactionComplexity: "high",
    maxDistractors: null,
  },
  EXPERT: {
    hintsEnabled: false,
    timePressureMultiplier: 0.75,
    interactionComplexity: "high",
    maxDistractors: null,
  },
};

// Never let a multiplier push a timer below a playable floor, no
// matter how the config above is tuned later.
const MIN_TIME_LIMIT_SECONDS = 5;

function getGradeBandConfig(grade) {
  const match = GRADE_BANDS.find((b) => grade >= b.min && grade <= b.max);
  const tier = match ? match.tier : DEFAULT_TIER;
  return { band: match ? match.band : null, tier, ...BAND_CONFIG[tier] };
}

function applyTimePressure(timeLimitSeconds, bandConfig) {
  if (typeof timeLimitSeconds !== "number") return timeLimitSeconds;
  const scaled = Math.round(timeLimitSeconds * bandConfig.timePressureMultiplier);
  return Math.max(MIN_TIME_LIMIT_SECONDS, scaled);
}

// Trims an authored pool (pieces/atom_pool/evidence — anything shaped
// as [{ id, ... }]) down to every correct piece plus at most
// maxDistractors incorrect ones, for the SIMPLE/INTERMEDIATE bands.
// Original pool ordering is preserved (rather than sorting correct
// pieces to the front) so a trimmed pool doesn't visibly announce
// which tiles are the answer. maxDistractors === null (ADVANCED/
// EXPERT, or an unrecognized game type) returns the pool unchanged —
// this can only ever remove noise, never a piece the student needs,
// since scoring never re-reads the pool the client was sent.
function capDistractors(pool, correctIds, maxDistractors) {
  if (!Array.isArray(pool) || maxDistractors == null) return pool;
  const correctSet = new Set((correctIds || []).map(String));
  const distractorIds = pool.filter((p) => !correctSet.has(String(p.id))).map((p) => String(p.id));
  const keptDistractorIds = new Set(distractorIds.slice(0, maxDistractors));
  return pool.filter((p) => correctSet.has(String(p.id)) || keptDistractorIds.has(String(p.id)));
}

module.exports = { getGradeBandConfig, applyTimePressure, capDistractors, GRADE_BANDS, BAND_CONFIG };

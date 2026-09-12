// Phase 4D: deterministic (but NOT curriculum-meaningful) ordering for
// the `games[]` array returned by GET /api/chapters/:chapterId.
//
// Phase 4C audit finding: chapterControllers.getChapterDetail() built
// that array from GameContent.aggregate()'s `$group` stage with no
// `$sort` stage, so its element order was whatever MongoDB's
// aggregation pipeline happened to produce — not a documented or
// guaranteed order. SubjectChapters.jsx reads `games[0]` as its
// "recommended" chip, so that chip could change between requests with
// no underlying data change.
//
// Phase 4C's product rule, carried forward here: "Canonical ordering
// is currently undefined and should be treated as a product
// decision." Source inspection for this phase (see
// PHASE_4D_DETERMINISTIC_GAME_ORDER_REPORT.md, Section 2) confirmed
// no existing field represents a curriculum-intended order across
// DIFFERENT game types within one chapter:
//   - Concept has no order_index field at all.
//   - GameContent.order_index only orders levels *within* a single
//     game_type — it says nothing about which game_type should come
//     before another.
//   - createdAt, mastery, $group/natural order are all explicitly
//     excluded by the Phase 4C audit as invalid signals for this.
//
// The one existing, already-relied-upon, stable ordering left is the
// backend game-type registry's own array order (gameTypeRegistry.js
// `KNOWN_GAME_TYPES`) — the same order gameControllers.getGameCatalog()
// already uses to group Home's "All Games" list. Reusing it here is a
// *technical stability* choice, not a claim that registry order
// represents curriculum priority, difficulty, or a recommendation.
// Do not read meaning into it beyond "the same chapter always returns
// its games in the same order."
//
// Pure function, no I/O, no mongoose — kept dependency-free
// deliberately so it can be unit tested without a database.
function sortGamesByRegistryOrder(games, knownGameTypes) {
  return [...games].sort((a, b) => {
    const ai = knownGameTypes.indexOf(a.game_type);
    const bi = knownGameTypes.indexOf(b.game_type);
    if (ai !== bi) {
      // A game_type absent from the registry (stale/unregistered
      // content left behind in the DB) sorts after every registered
      // type, rather than breaking the sort or throwing.
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    // Both absent from the registry (or, defensively, an identical
    // index): fall back to a plain string compare so the result is
    // still fully deterministic rather than left to input order.
    return a.game_type.localeCompare(b.game_type);
  });
}

module.exports = { sortGamesByRegistryOrder };

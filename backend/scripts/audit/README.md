# Structural Coverage Audit

Read-only, static (no MongoDB, no seed execution) audit of the Grade
4-12 curriculum -> game-mechanic pipeline: seed files, backend
`gameTypeRegistry.js`, frontend `gameRegistry.js`, `App.jsx` routes,
component files on disk, and backend scoring dispatch
(`checkAttempt` / `MULTI_QUESTION_GAME_TYPES`).

It never modifies seed files, source files, or a database, and never
`require()`s or executes a seed script — every seed file is read as
plain text.

## Run it

```
cd backend
npm run audit:coverage          # human-readable report
node scripts/audit/structuralAudit.js --json               # JSON to stdout
node scripts/audit/structuralAudit.js --json-file out.json # JSON to a file
```

## What it checks

1. **Grade/Subject/Chapter/GameContent discovery** — parses
   `Subject.create`/`Subject.findOne`, `Chapter.create`,
   `Concept.create`, and `GameContent.create`/`insertMany` calls
   across every `backend/seed*.js` file, resolving grade/subject
   per concept and per game-content entry (including chapters/
   concepts that are only `findOne()`'d in one file but `create()`'d
   in another — resolved via a cross-file title pool). Reports where
   a file's *name* implies one grade but its *content* resolves to
   another.
2. **Registry parity** — every `game_type` in
   `backend/src/utils/gameTypeRegistry.js` must also be in
   `frontend/src/games/gameRegistry.js`, and vice versa. Flags
   duplicates in either.
3. **Route/component parity** — every frontend registry route must
   have a matching `<Route>` in `App.jsx`, whose rendered component
   must have a `lazy()` import, whose target `.jsx` file must exist
   on disk.
4. **Scoring parity** — every registered `game_type` must appear
   either as an explicit branch inside `checkAttempt` or in the
   `MULTI_QUESTION_GAME_TYPES` array (backend's two legitimate
   scoring-dispatch paths).
5. **Seed structural checks** — duplicate `id:` values within one
   challenge, duplicate challenge titles within one array (the
   seeds' own upsert key), and `correct_piece_ids` /
   `correct_order` / `hotspot_ids` references that don't match any
   `id:` defined in that same challenge.
   - Multi-question payloads (`questions: [...]`, used by the Speed/
     Boss Challenge mechanics) are checked **per-question**, not
     across the whole payload — each question's `options` reuse
     `"a"`/`"b"`/`"c"` by design, so that's not a real duplicate.
   - `correct_mapping` / `*mapping` fields (Genetics Simulator,
     match-style mechanics) are recorded as informational, not
     validated as ID references — those values map concepts, not
     challenge piece IDs.
   - Anything the static parser can't confidently resolve is
     reported as `UNKNOWN / NEEDS LIVE VERIFICATION`, never guessed.
6. **Grade 4-12 x Subject matrix**, with per-cell status
   (✅ mechanics present / ⚠️ content but no mechanic / ❌ missing).
7. **Explicit Biology Grade 11/12 verification** of the exact 7
   mechanics closed in this project's Biology-coverage pass.

## Known limitation

The parser is a conservative regex/brace-matching text scanner, not
a JS parser — it's built against this project's consistent
hand-written seed style (see `backend/seedGrade11_batch2.js`,
`backend/seedBioDiagnosisGrade11.js`). Anything genuinely ambiguous
comes back `UNKNOWN`, never a guess. It cannot see actual database
state — see "Live MongoDB verification" below for that.

## Tests

```
npm test
```

runs `tests/unit/audit_parseUtils.test.js`,
`tests/unit/audit_seedScanner.test.js`,
`tests/unit/audit_registryScanner.test.js` (all against synthetic
fixture files, not the real project), and
`tests/unit/audit_structuralAudit.smoke.test.js`, which runs the
*real* audit against the actual project and locks in current
invariants (0 structural errors, 54/54 registry parity, Biology
11/12 mechanics present, no Grade 4-12 subject cell without a
mechanic). That last file is the regression net: it fails loudly if
a future change removes a route, breaks scoring, orphans a registry
entry, or leaves a subject without a mechanic.

## Live MongoDB verification checklist

The static audit above cannot see whether these seeds have actually
been run against a real database. To verify live:

1. **No master seed runner exists.** Every `backend/seed*.js` file is
   a standalone script (`node someSeed.js`), each with its own
   `mongoose.connect(process.env.MONGO_URI)` /
   `mongoose.disconnect()` — there is no `runAllSeeds.js` that
   chains them (confirmed: nothing else `require()`s or invokes
   another seed file from this project's own code, except
   `Seedallcases.js`, which is unrelated to GameContent).
2. **Order matters within a chain, not across all ~130 files.** A
   game-content seed that calls `Concept.findOne({ title: ... })`
   depends on the seed that `Concept.create()`s that title having
   already run. For the Biology 11/12 chain specifically:
   - `seedGrade11_batch6.js` **before** `seedBioDiagnosisGrade11.js`
     (Lymph and Circulatory Disorders)
   - `seedGrade11_batch3.js` **before** `seedBioVirtualLabGrade11.js`
     (Eukaryotic Cell Organelles)
   - `seedGrade12_batch3.js` **before** `seedBioDiagnosisGrade12.js`
     (Common Diseases in Humans)
   - `seedGrade12_batch2.js` **before** `seedBioSpecimenAnalysisGrade12.js`
     (Origin of Life and Evidence for Evolution) and
     `seedBioGeneticsGrade12.js` (Mendelian Inheritance and Laws)
   - `seedGrade12_batch1.js` **before** `seedBioVirtualLabGrade12.js`
     (Flower Structure and Pollination)
   - `seedGrade12_batch4.js` **before** `seedBioEcosystemGrade12.js`
     (Decomposition and Energy Flow)
   Run the full `seedGrade11_batch*.js` / `seedGrade12_batch*.js` set
   first (any order within that set is fine — they don't depend on
   each other), then the Biology game-content seeds above.
3. **Every write is duplicate-safe.** Every `.create()` for
   Subject/Chapter/Concept/GameContent in these files is preceded by
   a `findOne` guard (`if (!subject) { subject = await
   Subject.create(...) }`, `GameContent.findOne({game_type, title})`
   before `GameContent.create`), so re-running a seed that's already
   run is a safe no-op, not a duplicate.
4. **Command sequence** (from `backend/`, with `MONGO_URI` set to
   your local MongoDB):
   ```
   node seedGrade11_batch1.js   # ... through batch7, any order
   node seedGrade12_batch1.js   # ... through batch4, any order
   node seedBioDiagnosisGrade11.js
   node seedBioVirtualLabGrade11.js
   node seedBioDiagnosisGrade12.js
   node seedBioSpecimenAnalysisGrade12.js
   node seedBioVirtualLabGrade12.js
   node seedBioEcosystemGrade12.js
   node seedBioGeneticsGrade12.js
   ```
5. **Verify afterward** with a MongoDB shell/Compass query, e.g.:
   ```js
   db.gamecontents.aggregate([
     { $lookup: { from: "concepts", localField: "concept_id", foreignField: "_id", as: "concept" } },
     { $unwind: "$concept" },
     { $lookup: { from: "chapters", localField: "concept.chapter_id", foreignField: "_id", as: "chapter" } },
     { $unwind: "$chapter" },
     { $lookup: { from: "subjects", localField: "chapter.subject_id", foreignField: "_id", as: "subject" } },
     { $unwind: "$subject" },
     { $match: { "subject.name": "Biology", "subject.grade": { $in: [11, 12] } } },
     { $group: { _id: "$game_type", count: { $sum: 1 } } },
   ]);
   ```
   Expect 7 distinct `game_type` groups (2 for Grade 11, 5 for Grade
   12) matching this README's "Biology Grade 11/12 verification"
   list.

This environment could not run this checklist itself — no MongoDB
connection is available here — so live DB verification remains
**BLOCKED** and must be run locally.

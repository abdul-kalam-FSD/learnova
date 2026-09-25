/**
 * Grade 6 curriculum realignment (Batch 3, Phase 2) - LIVE-DATABASE companion to the seed edits.
 *
 * The seed files only ever CREATE missing documents (findOne-before-create), so
 * they can never rename, re-order, re-parent or repair documents that already
 * exist in a live database. This migration does exactly that, for Grade 6 only:
 *
 *  1. Chapter metadata: retitle / re-order / relabel Grade 6 chapters to the current
 *     2026-27 books (Exploring Society, Curiosity, Ganita Prakash) and mark Learnova
 *     enrichment chapters.
 *  2. Geometry restructure: the non-textbook "Geometry" chapter is dissolved. Its
 *     concepts are RE-PARENTED (same _ids) into Lines and Angles / Perimeter and Area /
 *     Playing with Constructions; content beyond the verified Grade 6 scope stays as
 *     enrichment in "Geometry Extensions" (the old chapter, renamed - same _id).
 *  3. DEFECT-1 repairs: replaces the payload/difficulty of the existing GameContent
 *     docs listed in migrations/data/grade6ContentRepairs.json (unsolvable Match
 *     items, duplicate cards, tray order, answer-position bias, invalid "boss" difficulty).
 *
 * No Chapter/Concept/GameContent _id ever changes and nothing is deleted, so
 * UserConceptMastery and quiz/game history (keyed by concept_id / content id) stay valid.
 * Grades other than 6 are never touched.
 *
 * DRY RUN BY DEFAULT (prints the plan, writes nothing). Idempotent: a second run plans 0 operations.
 *
 *   node migrations/realignGrade6Curriculum.js            # dry run
 *   node migrations/realignGrade6Curriculum.js --execute  # applies it
 *
 * Recommended order on a database: run this migration, then the Grade 6 seeds
 * (seeds then find the retitled chapters and only create what is missing).
 */
"use strict";
const { isDeepStrictEqual } = require("util");

const SS = "Social Science";
const NEWDIV = "Unity in Diversity, or 'Many in the One'";
const THEME_A = "Theme A: India and the World: Land and the People";
const THEME_B = "Theme B: Tapestry of the Past";
const THEME_C = "Theme C: Our Cultural Heritage and Knowledge Traditions";
const GP = "Ganita Prakash";
const ENR = "Learnova Enrichment";

// [subject match, legacy titles (any), final metadata]
const CHAPTER_RENAMES = [
  { subject: "social", from: ["Understanding and Respecting Diversity", NEWDIV], to: { title: NEWDIV, unit_name: THEME_C, order_index: 8 } },
  { subject: "social", from: ["Oceans and Continents"], to: { title: "Oceans and Continents", unit_name: THEME_A, order_index: 2 } },
  { subject: "social", from: ["The Beginnings of Indian Civilisation"], to: { title: "The Beginnings of Indian Civilisation", unit_name: THEME_B, order_index: 6 } },
  { subject: "science", from: ["Diversity in Living World", "Diversity in the Living World"], to: { title: "Diversity in the Living World", unit_name: "Curiosity", order_index: 2 } },
  { subject: "science", from: ["Exploring Magnets"], to: { title: "Exploring Magnets", unit_name: "Curiosity", order_index: 4 } },
  { subject: "science", from: ["Methods of Separation in Everyday Life"], to: { title: "Methods of Separation in Everyday Life", unit_name: "Curiosity", order_index: 9 } },
  { subject: "math", from: ["Fractions"], to: { title: "Fractions", unit_name: GP, order_index: 7 } },
  { subject: "math", from: ["Ratio and Proportion"], to: { title: "Ratio and Proportion", unit_name: ENR, order_index: 11 } },
  { subject: "english", from: ["Word Building"], to: { title: "Word Building", unit_name: ENR, order_index: 17 } },
];

const ANGLE_RELATIONSHIPS = "Angle Relationships (Enrichment)";
const ANGLE_SUMS = "Angle Sums of Polygons (Enrichment)";
const EXPL = {
  angleRelationships: "Enrichment beyond the verified Grade 6 scope: two angles are complementary if they add up to 90° and supplementary if they add up to 180°; angles on a straight line add up to 180°, angles around a point add up to 360°, and vertically opposite angles are equal.",
  // P1-C (curriculum audit, Grade 6 Maths): trimmed to only claim what NCERT
  // Ch8.2 (Squares and Rectangles, pp.192-195) actually supports. Classifying
  // shapes by number of sides (pentagon, hexagon) and rhombus properties are
  // NOT in the current Ch8 topic list and are no longer described as core.
  classifying: "NCERT Ch8.2 covers the properties of squares and rectangles: a square has four equal sides and four right angles, and a rectangle has equal opposite sides and four right angles. Classifying shapes by their number of sides (triangle, quadrilateral, pentagon, hexagon) and other shape properties (such as a rhombus) go beyond the current Grade 6 book and are included here as general shape vocabulary, not as NCERT Ch8.2 core content.",
  angleTypes: "Angles are named by their size: acute (less than 90°), right (90°), obtuse (more than 90° and less than 180°), straight (180°) and reflex (more than 180° and less than 360°).",
  angleSums: "Enrichment beyond the verified Grade 6 scope: the interior angles of a triangle add up to 180° and of a quadrilateral to 360°, and every extra side adds another 180°.",
  // P1 additions (Grade 6 Maths curriculum audit, official Ganita Prakash
  // Reprint 2025-26 evidence only):
  equivalentFractions: "Two fractions are equivalent if they represent the same amount, even though the numerator and denominator are different, such as 1/2 and 2/4. A fraction is in its lowest terms (simplest form) when its numerator and denominator have no common factor other than 1.",
  areaOfTriangle: "A rectangle cut along one of its diagonals splits into two triangles of equal area. So a triangle formed this way has an area that is half the area of the rectangle it fits inside. On grid paper, count squares to check a triangle's area.",
  anglesArmsVertex: "An angle is formed by two rays that share a common starting point. That common point is called the vertex of the angle, and each of the two rays is called an arm of the angle.",
  comparingAngles: "Two angles can be compared by placing one over the other so their vertices and one arm line up (superimposition) — whichever angle's other arm reaches further round is the bigger angle. The size of an angle depends only on the amount of turn between its arms, not on how long the arms are drawn.",
  rotatingArms: "A pair of rotating arms, made by joining two straws with a paper clip, can be opened to different amounts to model different angle sizes, and several such arms can then be compared and ordered from smallest to largest. This concept covers comparing and ordering angles made this way; physically building the rotating arms with straws and a paper clip is a hands-on activity that these game challenges do not represent.",
};

function clone(x) { return JSON.parse(JSON.stringify(x)); }
const subjectKey = (name) => {
  const n = String(name || "").toLowerCase();
  if (n === "social science") return "social";
  if (n === "science") return "science";
  if (n === "mathematics" || n === "math") return "math";
  if (n === "english") return "english";
  if (n === "tamil") return "tamil"; // loaded only so its Match tray-order repairs apply
  return null;
};

/** Pure planner: (snapshot of Grade 6 docs, repairs) -> ordered list of operations. */
function plan(snapshot, repairs) {
  const S = clone(snapshot);
  const ops = [];
  let tmp = 0;
  const bySubject = {};
  for (const s of S.subjects) { const k = subjectKey(s.name); if (k) bySubject[k] = s; }
  const chapterIn = (sid, title) => S.chapters.find((c) => c.subject_id === sid && c.title === title);
  const chSet = (c, set) => {
    const diff = {};
    for (const [k, v] of Object.entries(set)) if (c[k] !== v) diff[k] = v;
    if (Object.keys(diff).length) { ops.push({ op: "updateChapter", id: c._id, label: c.title, set: diff }); Object.assign(c, diff); }
  };
  const ensureChapter = (sid, def) => {
    let c = chapterIn(sid, def.title);
    if (!c) {
      const id = "tmp:" + ++tmp;
      c = { _id: id, subject_id: sid, ...def };
      S.chapters.push(c);
      ops.push({ op: "createChapter", tmp: id, label: def.title, doc: { subject_id: sid, ...def } });
    } else chSet(c, { unit_name: def.unit_name, order_index: def.order_index });
    return c;
  };
  const conceptIn = (chapterIds, title) => S.concepts.find((k) => chapterIds.includes(k.chapter_id) && k.title === title);
  const cSet = (k, set) => {
    const diff = {};
    for (const [key, v] of Object.entries(set)) if (k[key] !== v) diff[key] = v;
    if (Object.keys(diff).length) { ops.push({ op: "updateConcept", id: k._id, label: k.title, set: diff }); Object.assign(k, diff); }
  };
  const ensureConcept = (chapter, title, explanation_text, chapterIds) => {
    let k = conceptIn(chapterIds, title);
    if (!k) {
      const id = "tmp:" + ++tmp;
      k = { _id: id, chapter_id: chapter._id, title, explanation_text };
      S.concepts.push(k);
      ops.push({ op: "createConcept", tmp: id, label: title, doc: { chapter_id: chapter._id, title, explanation_text } });
    } else cSet(k, { chapter_id: chapter._id });
    return k;
  };
  const gcFind = (game_type, title, allowedConceptIds) =>
    S.gcs.find((g) => g.game_type === game_type && g.title === title && allowedConceptIds.has(g.concept_id));

  // 1. chapter metadata -------------------------------------------------
  for (const r of CHAPTER_RENAMES) {
    const subj = bySubject[r.subject];
    if (!subj) continue;
    const c = S.chapters.find((x) => x.subject_id === subj._id && r.from.includes(x.title));
    if (c) chSet(c, r.to);
  }

  // 2. Geometry restructure (Mathematics only) --------------------------
  const math = bySubject.math;
  if (math) {
    const mChapterIds = () => S.chapters.filter((c) => c.subject_id === math._id).map((c) => c._id);
    let geoExt = chapterIn(math._id, "Geometry Extensions");
    const legacy = chapterIn(math._id, "Geometry");
    if (legacy && !geoExt) { chSet(legacy, { title: "Geometry Extensions", unit_name: ENR, order_index: 12 }); geoExt = legacy; }
    else if (!geoExt) geoExt = ensureChapter(math._id, { title: "Geometry Extensions", unit_name: ENR, order_index: 12 });
    else chSet(geoExt, { unit_name: ENR, order_index: 12 });
    const LA = ensureChapter(math._id, { title: "Lines and Angles", unit_name: GP, order_index: 2 });
    const PA = ensureChapter(math._id, { title: "Perimeter and Area", unit_name: GP, order_index: 6 });
    const PC = ensureChapter(math._id, { title: "Playing with Constructions", unit_name: GP, order_index: 8 });
    const FR = ensureChapter(math._id, { title: "Fractions", unit_name: GP, order_index: 7 });

    for (const [title, target] of [["Perimeter", PA], ["Perimeter and Construction", PA], ["Classifying Shapes", PC]]) {
      const k = conceptIn(mChapterIds(), title);
      if (k) cSet(k, { chapter_id: target._id });
    }
    const classifying = conceptIn(mChapterIds(), "Classifying Shapes");
    if (classifying) cSet(classifying, { explanation_text: EXPL.classifying });

    // P1-D (curriculum audit): rename-only, both concepts keep their existing
    // content and _id — this only disambiguates two concepts that were both
    // correctly mapped to the same official section (6.1 Perimeter).
    // P1-F: rename-only, the concept's content only ever covered measuring
    // (2.9); "Drawing Angles" (2.10) is not represented and is not claimed.
    for (const [oldTitle, newTitle] of [
      ["Perimeter and Construction", "Perimeter: Building Shapes to a Target"],
      ["Perimeter", "Perimeter: Fencing and Loop Problems"],
      ["Measuring and Drawing Angles", "Measuring Angles with a Protractor"],
    ]) {
      const k = conceptIn(mChapterIds(), oldTitle);
      if (k) cSet(k, { title: newTitle });
    }

    // P1-A (curriculum audit): 3 confirmed mis-mapped Fraction GameContent
    // items, re-parented only (concept_id changes; game_type, title,
    // payload, difficulty, order_index and _id are untouched).
    const equivFractions = ensureConcept(FR, "Equivalent Fractions and Lowest Terms", EXPL.equivalentFractions, mChapterIds());
    const comparingFractions = conceptIn(mChapterIds(), "Comparing Fractions");

    // P1-E: new concept, official Ch6.3 Area of a Triangle (pp.142-149).
    const areaOfTriangle = ensureConcept(PA, "Area of a Triangle", EXPL.areaOfTriangle, mChapterIds());
    // P1-G: 3 new concepts, official Ch2 sections 2.5, 2.6, 2.7.
    const armsVertex = ensureConcept(LA, "Angle: Arms and Vertex", EXPL.anglesArmsVertex, mChapterIds());
    const comparingAngles = ensureConcept(LA, "Comparing Angles", EXPL.comparingAngles, mChapterIds());
    const rotatingArms = ensureConcept(LA, "Making Rotating Arms", EXPL.rotatingArms, mChapterIds());

    let rel = conceptIn(mChapterIds(), ANGLE_RELATIONSHIPS);
    const measuring = conceptIn(mChapterIds(), "Measuring Angles");
    if (measuring && !rel) { cSet(measuring, { title: ANGLE_RELATIONSHIPS, explanation_text: EXPL.angleRelationships, chapter_id: geoExt._id }); rel = measuring; }
    else if (rel) cSet(rel, { chapter_id: geoExt._id, explanation_text: EXPL.angleRelationships });
    const angleTypes = ensureConcept(LA, "Angle Types", EXPL.angleTypes, mChapterIds());
    const angleSums = ensureConcept(geoExt, ANGLE_SUMS, EXPL.angleSums, mChapterIds());

    const g6Concepts = new Set(S.concepts.filter((k) => mChapterIds().includes(k.chapter_id)).map((k) => k._id));
    const moves = [
      ["MATH_ANGLE_SPEED_CHALLENGE", "Speed Round: Name That Angle", angleTypes],
      ["MATH_SHAPE_MATCH", "Match: Shape to Angle Sum", angleSums],
      ["MATH_GEOMETRY_BOSS_CHALLENGE", "Boss Round 2: Final Stand", rel],
      // P1-A: the 3 confirmed Fractions mis-mappings (Grade 6 Maths audit,
      // official Ch7.6/7.7 evidence). Boss Battle: The Denominator Dragon is
      // deliberately NOT moved — it is a genuine cross-skill (add/compare/
      // simplify/subtract) chapter-level round, kept under Adding Fractions.
      ["MATH_FRACTION_MATCH", "Match: Simplest Form", equivFractions],
      ["MATH_FRACTION_SPEED_CHALLENGE", "Speed Round: Simplify Fast", equivFractions],
      ["MATH_FRACTION_SPEED_CHALLENGE", "Speed Round: Which is Bigger?", comparingFractions],
    ];
    for (const [gt, title, target] of moves) {
      const g = gcFind(gt, title, g6Concepts);
      if (g && target && g.concept_id !== target._id) {
        ops.push({ op: "updateGC", id: g._id, label: title, set: { concept_id: target._id } });
        g.concept_id = target._id;
      }
    }

    // P1-B: title-only rename to mark this item as enrichment (decimals are
    // not supported anywhere in the current Ganita Prakash Grade 6 book).
    // Stays under Adding Fractions — this is NOT a re-parent.
    const fracToDecimal = gcFind("MATH_FRACTION_MATCH", "Match: Fraction to Decimal", g6Concepts);
    if (fracToDecimal && fracToDecimal.title !== "Match: Fraction to Decimal (Enrichment)") {
      ops.push({ op: "updateGC", id: fracToDecimal._id, label: fracToDecimal.title, set: { title: "Match: Fraction to Decimal (Enrichment)" } });
      fracToDecimal.title = "Match: Fraction to Decimal (Enrichment)";
    }

    // P1-E / P1-G: new GameContent for the 4 newly-created concepts above.
    // Reuses existing game_types only (MATH_NUMBER_MACHINE, MATH_SHAPE_MATCH,
    // MATH_ANGLE_SPEED_CHALLENGE) with the same payload shapes already used
    // elsewhere in Grade 6 Maths. No new game_type introduced.
    const gcExists = (game_type, title) => S.gcs.find((g) => g.game_type === game_type && g.title === title);
    const ensureGC = (concept, def) => {
      let g = gcExists(def.game_type, def.title);
      if (!g) {
        const gid = "tmp:" + ++tmp;
        g = { _id: gid, concept_id: concept._id, ...def };
        S.gcs.push(g);
        ops.push({ op: "createGC", tmp: gid, label: def.title, doc: { concept_id: concept._id, ...def } });
      }
      return g;
    };

    // Area of a Triangle (official pp.142-144: rectangle-diagonal split;
    // p.148: area-maze missing-value puzzles). No base×height formula is
    // stated at this stage in the book, so none is used here.
    ensureGC(areaOfTriangle, {
      game_type: "MATH_NUMBER_MACHINE",
      title: "Machine: Half of the Rectangle",
      difficulty: "easy",
      order_index: 1,
      payload: {
        equation_label: "A rectangle has an area of 24 sq cm. One of its diagonals cuts it into two equal triangles. What is the area of one triangle?",
        dial_min: 0,
        dial_max: 30,
        correct_answer: 12,
        hint: "A diagonal always cuts a rectangle into two triangles of equal area.",
      },
    });
    ensureGC(areaOfTriangle, {
      game_type: "MATH_NUMBER_MACHINE",
      title: "Machine: Triangle on Grid Paper",
      difficulty: "medium",
      order_index: 2,
      payload: {
        equation_label: "On grid paper, a triangle sits inside a rectangle that is 6 units by 4 units. The triangle takes up exactly half of the rectangle. What is the triangle's area, in square units?",
        dial_min: 0,
        dial_max: 30,
        correct_answer: 12,
        hint: "Area of the rectangle = 6 × 4. The triangle is half of that.",
      },
    });
    ensureGC(areaOfTriangle, {
      game_type: "MATH_NUMBER_MACHINE",
      title: "Machine: Missing Triangle in the Maze",
      difficulty: "hard",
      order_index: 3,
      payload: {
        equation_label: "A rectangle has an area of 40 sq cm. A diagonal cuts it into two triangles, and one of them has an area of 20 sq cm. What is the area of the other triangle?",
        dial_min: 0,
        dial_max: 40,
        correct_answer: 20,
        hint: "Both triangles made by one diagonal always have equal area.",
      },
    });

    // Angle: Arms and Vertex (official p.17, 2.5).
    ensureGC(armsVertex, {
      game_type: "MATH_SHAPE_MATCH",
      title: "Match: Naming the Parts of an Angle",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "∠DBE is formed by rays BD and BE, which share the starting point B. Match each part of the angle to what it means.",
        slots: [
          { id: "s1", label: "Vertex" },
          { id: "s2", label: "Arm" },
        ],
        components: [
          { id: "c1", label: "The point where the two rays meet" },
          { id: "c2", label: "One of the two rays that form the angle" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "The vertex is a single point; the arms are the two rays coming out of it.",
      },
    });
    ensureGC(armsVertex, {
      game_type: "MATH_SHAPE_MATCH",
      title: "Match: What Makes an Angle",
      difficulty: "medium",
      order_index: 2,
      payload: {
        scenario: "Two rays start turning from the same point. Match each term to its meaning.",
        slots: [
          { id: "s1", label: "Common starting point of two rays" },
          { id: "s2", label: "Figure formed by two rays with a common starting point" },
        ],
        components: [
          { id: "c1", label: "Vertex" },
          { id: "c2", label: "Angle" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "The figure itself is the angle; the shared point is the vertex.",
      },
    });

    // Comparing Angles (official pp.21-26, 2.6). Kept degree-free, since the
    // book compares by superimposition before degrees are introduced (2.9).
    ensureGC(comparingAngles, {
      game_type: "MATH_ANGLE_SPEED_CHALLENGE",
      title: "Speed Round: Which Angle Is Bigger?",
      difficulty: "easy",
      order_index: 1,
      payload: {
        time_limit_seconds: 15,
        hint: "Think about how much the arm has turned, not how long it looks.",
        questions: [
          {
            id: "q1",
            prompt: "Two angles are placed one over the other (superimposed) so their vertices and one arm line up exactly. If the other arms also line up exactly, what can you say?",
            options: [
              { id: "a", label: "The two angles are equal" },
              { id: "b", label: "One of them must be bigger" },
            ],
            correct_option_id: "a",
          },
          {
            id: "q2",
            prompt: "True or False: An angle drawn with longer arms is always bigger than one drawn with shorter arms.",
            options: [
              { id: "a", label: "True" },
              { id: "b", label: "False — angle size depends on the amount of turn, not the arm length" },
            ],
            correct_option_id: "b",
          },
          {
            id: "q3",
            prompt: "When comparing two angles by superimposition, what must line up first?",
            options: [
              { id: "a", label: "Their vertices" },
              { id: "b", label: "Their colours" },
            ],
            correct_option_id: "a",
          },
        ],
      },
    });

    // Making Rotating Arms (official pp.25-27, 2.7). Deliberately a single
    // item: the existing mechanics can only represent the comparison/
    // ordering step, not the physical straw-and-paper-clip construction —
    // see the concept's explanation_text and the P1 plan (Section 12).
    ensureGC(rotatingArms, {
      game_type: "MATH_SHAPE_MATCH",
      title: "Match: Comparing Two Rotating Arms",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Two rotating arms were made by turning one straw against another. Arm A turned less than Arm B before stopping. Match each arm to its angle size.",
        slots: [
          { id: "s1", label: "Arm A (turned less)" },
          { id: "s2", label: "Arm B (turned more)" },
        ],
        components: [
          { id: "c1", label: "Smaller angle" },
          { id: "c2", label: "Larger angle" },
        ],
        correct_mapping: { s1: "c1", s2: "c2" },
        hint: "More turning between the straws means a bigger angle.",
      },
    });
  }

  // 3. DEFECT-1 payload repairs (Grade 6 documents only) ----------------
  const g6ChapterIds = new Set(S.chapters.map((c) => c._id));
  const g6ConceptIds = new Set(S.concepts.filter((k) => g6ChapterIds.has(k.chapter_id)).map((k) => k._id));
  for (const r of repairs) {
    const g = gcFind(r.game_type, r.title, g6ConceptIds);
    if (!g) continue;
    const set = {};
    if (!isDeepStrictEqual(g.payload, r.payload)) set.payload = r.payload;
    if (g.difficulty !== r.difficulty) set.difficulty = r.difficulty;
    if (Object.keys(set).length) { ops.push({ op: "updateGC", id: g._id, label: r.title, set }); Object.assign(g, set); }
  }
  return ops;
}

/** Applies a plan to an in-memory snapshot (used by tests and by the dry-run summary). */
function applyOps(snapshot, ops) {
  const S = clone(snapshot);
  const map = {};
  const R = (v) => (typeof v === "string" && map[v]) || v;
  for (const o of ops) {
    if (o.op === "createChapter") { const id = "new-" + o.tmp; map[o.tmp] = id; S.chapters.push({ _id: id, ...o.doc, subject_id: R(o.doc.subject_id) }); }
    else if (o.op === "createConcept") { const id = "new-" + o.tmp; map[o.tmp] = id; S.concepts.push({ _id: id, ...o.doc, chapter_id: R(o.doc.chapter_id) }); }
    else if (o.op === "createGC") { const id = "new-" + o.tmp; map[o.tmp] = id; S.gcs.push({ _id: id, ...o.doc, concept_id: R(o.doc.concept_id) }); }
    else {
      const coll = o.op === "updateChapter" ? S.chapters : o.op === "updateConcept" ? S.concepts : S.gcs;
      const d = coll.find((x) => x._id === R(o.id));
      if (!d) throw new Error("applyOps: missing doc " + o.id);
      const set = { ...o.set };
      if (set.chapter_id) set.chapter_id = R(set.chapter_id);
      if (set.concept_id) set.concept_id = R(set.concept_id);
      Object.assign(d, set);
    }
  }
  return S;
}

async function loadSnapshot(models) {
  const { Subject, Chapter, Concept, GameContent } = models;
  const subjects = (await Subject.find({ grade: 6 }).lean()).filter((s) => subjectKey(s.name));
  const sid = subjects.map((s) => s._id);
  const chapters = await Chapter.find({ subject_id: { $in: sid } }).lean();
  const concepts = await Concept.find({ chapter_id: { $in: chapters.map((c) => c._id) } }).lean();
  const gcs = await GameContent.find({ concept_id: { $in: concepts.map((k) => k._id) } }).lean();
  const str = (x) => String(x);
  return {
    subjects: subjects.map((s) => ({ _id: str(s._id), name: s.name })),
    chapters: chapters.map((c) => ({ _id: str(c._id), subject_id: str(c.subject_id), title: c.title, unit_name: c.unit_name, order_index: c.order_index, ...(c.strand ? { strand: c.strand } : {}) })),
    concepts: concepts.map((k) => ({ _id: str(k._id), chapter_id: str(k.chapter_id), title: k.title, explanation_text: k.explanation_text })),
    gcs: gcs.map((g) => ({ _id: str(g._id), concept_id: str(g.concept_id), game_type: g.game_type, title: g.title, difficulty: g.difficulty, payload: g.payload })),
  };
}

async function main() {
  require("dotenv").config();
  const mongoose = require("mongoose");
  const dns = require("dns");
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  const models = {
    Subject: require("../src/models/Subject"),
    Chapter: require("../src/models/Chapter"),
    Concept: require("../src/models/Concept"),
    GameContent: require("../src/models/GameContent"),
  };
  const repairs = require("./data/grade6ContentRepairs.json");
  const execute = process.argv.includes("--execute");
  await mongoose.connect(process.env.MONGO_URI);
  console.log(execute ? "MODE: EXECUTE (writing changes)" : "MODE: DRY RUN (no changes will be written)");
  const snap = await loadSnapshot(models);
  const ops = plan(snap, repairs);
  if (ops.length === 0) console.log("Nothing to do: Grade 6 is already aligned.");
  for (const o of ops) console.log(`- ${o.op}: ${o.label}`, JSON.stringify(o.set || (o.doc && { title: o.doc.title }) || {}).slice(0, 140));
  if (execute) {
    const map = {};
    const R = (v) => (typeof v === "string" && map[v]) || v;
    for (const o of ops) {
      if (o.op === "createChapter") { const d = await models.Chapter.create({ ...o.doc, subject_id: R(o.doc.subject_id) }); map[o.tmp] = String(d._id); }
      else if (o.op === "createConcept") { const d = await models.Concept.create({ ...o.doc, chapter_id: R(o.doc.chapter_id) }); map[o.tmp] = String(d._id); }
      else if (o.op === "createGC") { const d = await models.GameContent.create({ ...o.doc, concept_id: R(o.doc.concept_id) }); map[o.tmp] = String(d._id); }
      else {
        const set = { ...o.set };
        if (set.chapter_id) set.chapter_id = R(set.chapter_id);
        if (set.concept_id) set.concept_id = R(set.concept_id);
        const M = o.op === "updateChapter" ? models.Chapter : o.op === "updateConcept" ? models.Concept : models.GameContent;
        await M.updateOne({ _id: R(o.id) }, { $set: set }, { runValidators: true });
      }
    }
    console.log(`Applied ${ops.length} operation(s).`);
  } else console.log(`\nDry run complete (${ops.length} operation(s) planned). Re-run with --execute to apply.`);
  await mongoose.disconnect();
}

module.exports = { plan, applyOps, CHAPTER_RENAMES };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

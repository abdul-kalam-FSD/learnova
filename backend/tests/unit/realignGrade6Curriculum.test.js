const { plan, applyOps } = require("../../migrations/realignGrade6Curriculum");
const repairs = require("../../migrations/data/grade6ContentRepairs.json");

// Minimal legacy Grade 6 state: the chapter/concept/GameContent shapes the
// pre-realignment seeds produced (non-textbook "Geometry" chapter, old titles).
function legacy() {
  const subjects = [
    { _id: "sm", name: "Mathematics" },
    { _id: "ss", name: "Social Science" },
    { _id: "sc", name: "Science" },
  ];
  const chapters = [
    { _id: "geo", subject_id: "sm", title: "Geometry", unit_name: "Shapes and Space", order_index: 2 },
    { _id: "frac", subject_id: "sm", title: "Fractions", unit_name: "Numbers", order_index: 1 },
    { _id: "div", subject_id: "ss", title: "Understanding and Respecting Diversity", unit_name: "Social and Political Life", order_index: 1 },
    { _id: "bio", subject_id: "sc", title: "Diversity in Living World", unit_name: "Biology", order_index: 1, strand: "Biology" },
  ];
  const concepts = [
    { _id: "k-cls", chapter_id: "geo", title: "Classifying Shapes", explanation_text: "old" },
    { _id: "k-ang", chapter_id: "geo", title: "Measuring Angles", explanation_text: "old" },
    { _id: "k-per", chapter_id: "geo", title: "Perimeter", explanation_text: "old" },
  ];
  const gcs = [
    { _id: "g-name", concept_id: "k-ang", game_type: "MATH_ANGLE_SPEED_CHALLENGE", title: "Speed Round: Name That Angle", difficulty: "easy", payload: {} },
    { _id: "g-sum", concept_id: "k-cls", game_type: "MATH_SHAPE_MATCH", title: "Match: Shape to Angle Sum", difficulty: "medium", payload: {} },
    { _id: "g-boss", concept_id: "k-per", game_type: "MATH_GEOMETRY_BOSS_CHALLENGE", title: "Boss Round 2: Final Stand", difficulty: "boss", payload: {} },
  ];
  return { subjects, chapters, concepts, gcs };
}

describe("Grade 6 curriculum realignment plan", () => {
  const before = legacy();
  const ops = plan(before, repairs);
  const after = applyOps(before, ops);
  const chapter = (title) => after.chapters.find((c) => c.title === title);
  const concept = (title) => after.concepts.find((k) => k.title === title);
  const gc = (id) => after.gcs.find((g) => g._id === id);

  test("retitles/relabels chapters to the current books without changing ids", () => {
    expect(after.chapters.find((c) => c._id === "div").title).toBe("Unity in Diversity, or 'Many in the One'");
    expect(after.chapters.find((c) => c._id === "div").order_index).toBe(8);
    expect(after.chapters.find((c) => c._id === "bio").title).toBe("Diversity in the Living World");
    expect(after.chapters.find((c) => c._id === "bio").strand).toBe("Biology");
    expect(after.chapters.find((c) => c._id === "frac").unit_name).toBe("Ganita Prakash");
  });

  test("dissolves Geometry by re-parenting concepts (same ids) and keeps out-of-scope content as enrichment", () => {
    expect(chapter("Geometry")).toBeUndefined();
    expect(after.chapters.find((c) => c._id === "geo").title).toBe("Geometry Extensions");
    expect(after.concepts.find((k) => k._id === "k-per").chapter_id).toBe(chapter("Perimeter and Area")._id);
    expect(after.concepts.find((k) => k._id === "k-cls").chapter_id).toBe(chapter("Playing with Constructions")._id);
    expect(after.concepts.find((k) => k._id === "k-ang").title).toBe("Angle Relationships (Enrichment)");
    expect(gc("g-name").concept_id).toBe(concept("Angle Types")._id);
    expect(gc("g-sum").concept_id).toBe(concept("Angle Sums of Polygons (Enrichment)")._id);
    expect(gc("g-boss").concept_id).toBe("k-ang");
  });

  test("never loses or orphans documents (P1 also creates 7 new GameContent items: 3 Area of a Triangle + 2 Angle: Arms and Vertex + 1 Comparing Angles + 1 Making Rotating Arms)", () => {
    expect(after.gcs).toHaveLength(before.gcs.length + 7);
    const chIds = new Set(after.chapters.map((c) => c._id));
    const kIds = new Set(after.concepts.map((k) => k._id));
    expect(after.concepts.every((k) => chIds.has(k.chapter_id))).toBe(true);
    expect(after.gcs.every((g) => kIds.has(g.concept_id))).toBe(true);
  });

  test("replaces the invalid 'boss' difficulty with a supported value", () => {
    expect(gc("g-boss").difficulty).toBe("hard");
  });

  test("is idempotent: a second run plans nothing", () => {
    expect(plan(after, repairs)).toEqual([]);
  });

  test("repair data only uses the supported difficulty enum", () => {
    for (const r of repairs) expect(["easy", "medium", "hard"]).toContain(r.difficulty);
  });

  // P1-D / P1-F rename-only ops also apply to this minimal legacy fixture,
  // since it already has concepts titled "Perimeter" and "Measuring Angles"
  // (renamed to "Angle Relationships (Enrichment)" by the existing logic
  // before P1's rename loop runs, so only "Perimeter" is checked here).
  test("P1-D: renames the legacy 'Perimeter' concept without changing its id", () => {
    expect(after.concepts.find((k) => k._id === "k-per").title).toBe("Perimeter: Fencing and Loop Problems");
  });
});

// Fuller Grade 6 Maths snapshot: mirrors the actual post-Phase-2 seeded shape
// (Fractions / Lines and Angles / Perimeter and Area / Playing with
// Constructions chapters, with the concepts and GameContent the real seeds
// produce) so P1's fraction re-parents, renames, and new concepts/GameContent
// can be tested against realistic data, not just the minimal legacy fixture.
function postPhase2() {
  const subjects = [{ _id: "sm", name: "Mathematics" }];
  const chapters = [
    { _id: "ch-frac", subject_id: "sm", title: "Fractions", unit_name: "Ganita Prakash", order_index: 7 },
    { _id: "ch-la", subject_id: "sm", title: "Lines and Angles", unit_name: "Ganita Prakash", order_index: 2 },
    { _id: "ch-pa", subject_id: "sm", title: "Perimeter and Area", unit_name: "Ganita Prakash", order_index: 6 },
    { _id: "ch-pc", subject_id: "sm", title: "Playing with Constructions", unit_name: "Ganita Prakash", order_index: 8 },
    { _id: "ch-geoext", subject_id: "sm", title: "Geometry Extensions", unit_name: "Learnova Enrichment", order_index: 12 },
  ];
  const concepts = [
    { _id: "k-adding", chapter_id: "ch-frac", title: "Adding Fractions", explanation_text: "old" },
    { _id: "k-comparing", chapter_id: "ch-frac", title: "Comparing Fractions", explanation_text: "old" },
    { _id: "k-perconstr", chapter_id: "ch-pa", title: "Perimeter and Construction", explanation_text: "old" },
    { _id: "k-per2", chapter_id: "ch-pa", title: "Perimeter", explanation_text: "old" },
    { _id: "k-measuring2", chapter_id: "ch-la", title: "Measuring and Drawing Angles", explanation_text: "old" },
    { _id: "k-classify", chapter_id: "ch-pc", title: "Classifying Shapes", explanation_text: "old" },
    { _id: "k-angrel", chapter_id: "ch-geoext", title: "Angle Relationships (Enrichment)", explanation_text: "old" },
  ];
  const gcs = [
    // g-simplest and g-bigger payloads match grade6ContentRepairs.json exactly
    // (both have a DEFECT-1 repair entry keyed by game_type+title) so this
    // fixture also proves the repair still finds them — by title, unchanged
    // for these two — after the re-parent. g-simplify has no repair entry,
    // so its stand-in payload is fine as-is.
    {
      _id: "g-simplest",
      concept_id: "k-adding",
      game_type: "MATH_FRACTION_MATCH",
      title: "Match: Simplest Form",
      difficulty: "easy",
      order_index: 1,
      payload: {
        scenario: "Match each fraction card to its simplest form.",
        slots: [{ id: "s1", label: "2/4" }, { id: "s2", label: "3/9" }, { id: "s3", label: "6/8" }],
        components: [{ id: "c4", label: "2/3" }, { id: "c3", label: "3/4" }, { id: "c2", label: "1/3" }, { id: "c1", label: "1/2" }],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Divide numerator and denominator by their greatest common factor.",
      },
    },
    { _id: "g-simplify", concept_id: "k-adding", game_type: "MATH_FRACTION_SPEED_CHALLENGE", title: "Speed Round: Simplify Fast", difficulty: "medium", order_index: 2, payload: { p: 2 } },
    {
      _id: "g-bigger",
      concept_id: "k-adding",
      game_type: "MATH_FRACTION_SPEED_CHALLENGE",
      title: "Speed Round: Which is Bigger?",
      difficulty: "easy",
      order_index: 3,
      payload: {
        time_limit_seconds: 8,
        hint: "Convert to a common denominator to compare quickly.",
        questions: [
          { id: "q1", prompt: "Which is bigger?", options: [{ id: "a", label: "1/3" }, { id: "b", label: "1/2" }], correct_option_id: "b" },
          { id: "q2", prompt: "Which is bigger?", options: [{ id: "a", label: "3/5" }, { id: "b", label: "2/5" }], correct_option_id: "a" },
          { id: "q3", prompt: "Which is bigger?", options: [{ id: "a", label: "3/4" }, { id: "b", label: "5/8" }], correct_option_id: "a" },
          { id: "q4", prompt: "Which is bigger?", options: [{ id: "a", label: "1/6" }, { id: "b", label: "1/4" }], correct_option_id: "b" },
          { id: "q5", prompt: "Which is bigger?", options: [{ id: "a", label: "7/9" }, { id: "b", label: "5/6" }], correct_option_id: "b" },
          { id: "q6", prompt: "Which is bigger?", options: [{ id: "a", label: "2/3" }, { id: "b", label: "3/5" }], correct_option_id: "a" },
        ],
      },
    },
    {
      _id: "g-decimal",
      concept_id: "k-adding",
      game_type: "MATH_FRACTION_MATCH",
      title: "Match: Fraction to Decimal",
      difficulty: "medium",
      order_index: 4,
      // Matches the real payload (seedMathGrade6.js / grade6ContentRepairs.json)
      // exactly, so this fixture proves the rename doesn't disturb payload AND
      // that the DEFECT-1 repair's title-matcher still finds this item once
      // renamed (no diff = repair matched by the new title, as intended).
      payload: {
        scenario: "Match each fraction card to its decimal equivalent.",
        slots: [{ id: "s1", label: "1/4" }, { id: "s2", label: "3/5" }, { id: "s3", label: "5/8" }],
        components: [{ id: "c4", label: "0.5" }, { id: "c3", label: "0.625" }, { id: "c2", label: "0.6" }, { id: "c1", label: "0.25" }],
        correct_mapping: { s1: "c1", s2: "c2", s3: "c3" },
        hint: "Divide the numerator by the denominator to get the decimal.",
      },
    },
    { _id: "g-boss", concept_id: "k-adding", game_type: "MATH_FRACTION_BOSS_CHALLENGE", title: "Boss Battle: The Denominator Dragon", difficulty: "hard", order_index: 5, payload: { p: 5 } },
    { _id: "g-addfast", concept_id: "k-adding", game_type: "MATH_FRACTION_SPEED_CHALLENGE", title: "Speed Round: Add Them Fast", difficulty: "easy", order_index: 6, payload: { p: 6 } },
  ];
  return { subjects, chapters, concepts, gcs };
}

describe("P1: Grade 6 Mathematics curriculum-accuracy corrections", () => {
  const before = postPhase2();
  const ops = plan(before, repairs);
  const after = applyOps(before, ops);
  const concept = (title) => after.concepts.find((k) => k.title === title);
  const gcById = (id) => after.gcs.find((g) => g._id === id);
  const chapter = (title) => after.chapters.find((c) => c.title === title);

  test("P1-A: re-parents exactly the 3 confirmed Fraction mis-mappings, by id, with payload/difficulty/order_index/game_type untouched", () => {
    const equiv = concept("Equivalent Fractions and Lowest Terms");
    const comparing = concept("Comparing Fractions");
    expect(equiv).toBeDefined();
    expect(equiv.chapter_id).toBe("ch-frac");
    expect(gcById("g-simplest").concept_id).toBe(equiv._id);
    expect(gcById("g-simplify").concept_id).toBe(equiv._id);
    expect(gcById("g-bigger").concept_id).toBe(comparing._id);
    for (const [id, orig] of [["g-simplest", before.gcs[0]], ["g-simplify", before.gcs[1]], ["g-bigger", before.gcs[2]]]) {
      const g = gcById(id);
      expect(g.game_type).toBe(orig.game_type);
      expect(g.difficulty).toBe(orig.difficulty);
      expect(g.order_index).toBe(orig.order_index);
      expect(g.payload).toEqual(orig.payload);
    }
  });

  test("P1-A: does NOT move Boss Battle: The Denominator Dragon or the unrelated Speed Round: Add Them Fast", () => {
    expect(gcById("g-boss").concept_id).toBe("k-adding");
    expect(gcById("g-addfast").concept_id).toBe("k-adding");
  });

  test("P1-B: renames Match: Fraction to Decimal to mark it as enrichment, without re-parenting it", () => {
    const g = gcById("g-decimal");
    expect(g.title).toBe("Match: Fraction to Decimal (Enrichment)");
    expect(g.concept_id).toBe("k-adding");
    expect(g.game_type).toBe("MATH_FRACTION_MATCH");
    expect(g.payload).toEqual(before.gcs.find((x) => x._id === "g-decimal").payload);
  });

  test("P1-D: renames both Perimeter concepts without merging them or changing their ids", () => {
    expect(after.concepts.find((k) => k._id === "k-perconstr").title).toBe("Perimeter: Building Shapes to a Target");
    expect(after.concepts.find((k) => k._id === "k-per2").title).toBe("Perimeter: Fencing and Loop Problems");
    expect(after.concepts.filter((k) => k.chapter_id === "ch-pa" && k.title.startsWith("Perimeter"))).toHaveLength(2);
  });

  test("P1-F: renames Measuring and Drawing Angles to Measuring Angles with a Protractor", () => {
    expect(after.concepts.find((k) => k._id === "k-measuring2").title).toBe("Measuring Angles with a Protractor");
  });

  test("P1-C: trims the Classifying Shapes explanation to only claim Ch8.2-supported content, without touching its GameContent", () => {
    const k = after.concepts.find((k) => k._id === "k-classify");
    expect(k.explanation_text).toMatch(/Ch8\.2/);
    expect(k.explanation_text).toMatch(/go beyond the current Grade 6 book/);
  });

  test("P1-E: creates Area of a Triangle under Perimeter and Area with 3 GameContent items, all MATH_NUMBER_MACHINE", () => {
    const c = concept("Area of a Triangle");
    expect(c).toBeDefined();
    expect(c.chapter_id).toBe(chapter("Perimeter and Area")._id);
    const items = after.gcs.filter((g) => g.concept_id === c._id);
    expect(items).toHaveLength(3);
    expect(items.every((g) => g.game_type === "MATH_NUMBER_MACHINE")).toBe(true);
  });

  test("P1-G: creates the 3 Ch2 angle-basics concepts under Lines and Angles, each with GameContent", () => {
    for (const [title, gameType, count] of [
      ["Angle: Arms and Vertex", "MATH_SHAPE_MATCH", 2],
      ["Comparing Angles", "MATH_ANGLE_SPEED_CHALLENGE", 1],
      ["Making Rotating Arms", "MATH_SHAPE_MATCH", 1],
    ]) {
      const c = concept(title);
      expect(c).toBeDefined();
      expect(c.chapter_id).toBe(chapter("Lines and Angles")._id);
      const items = after.gcs.filter((g) => g.concept_id === c._id);
      expect(items).toHaveLength(count);
      expect(items.every((g) => g.game_type === gameType)).toBe(true);
    }
  });

  test("no existing document's _id changes and nothing is orphaned or lost", () => {
    const beforeIds = { ch: before.chapters.map((c) => c._id).sort(), k: before.concepts.map((k) => k._id).sort(), g: before.gcs.map((g) => g._id).sort() };
    for (const id of beforeIds.ch) expect(after.chapters.some((c) => c._id === id)).toBe(true);
    for (const id of beforeIds.k) expect(after.concepts.some((k) => k._id === id)).toBe(true);
    for (const id of beforeIds.g) expect(after.gcs.some((g) => g._id === id)).toBe(true);
    const chIds = new Set(after.chapters.map((c) => c._id));
    const kIds = new Set(after.concepts.map((k) => k._id));
    expect(after.concepts.every((k) => chIds.has(k.chapter_id))).toBe(true);
    expect(after.gcs.every((g) => kIds.has(g.concept_id))).toBe(true);
  });

  test("is idempotent: a second run against the already-corrected state plans nothing", () => {
    expect(plan(after, repairs)).toEqual([]);
  });
});

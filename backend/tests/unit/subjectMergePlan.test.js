const { buildMergePlan, NEW_TARGET_SUBJECT_ID } = require("../../src/utils/subjectMergePlan");

describe("buildMergePlan — Grade 4 Science (Biology/Chemistry/Physics -> new Science)", () => {
  const freshInput = () => ({
    grade: 4,
    target: { name: "Science", existingId: null },
    sources: [
      {
        name: "Biology",
        subjectId: "bio1",
        chapters: [{ id: "chapA", title: "Animal Groups", subject_id: "bio1", strand: null }],
      },
      {
        name: "Chemistry",
        subjectId: "chem1",
        chapters: [{ id: "chapB", title: "Tiny Building Blocks", subject_id: "chem1", strand: null }],
      },
      {
        name: "Physics",
        subjectId: "phy1",
        chapters: [{ id: "chapC", title: "Simple Circuits", subject_id: "phy1", strand: null }],
      },
    ],
  });

  test("plans to create the target Subject when none exists", () => {
    const plan = buildMergePlan(freshInput());
    expect(plan.createTargetSubject).toBe(true);
    expect(plan.targetSubjectId).toBeNull();
  });

  test("moves every chapter to the placeholder new-subject id, tagged with its source strand", () => {
    const plan = buildMergePlan(freshInput());
    expect(plan.chapterMoves).toEqual([
      {
        chapterId: "chapA",
        chapterTitle: "Animal Groups",
        fromSubjectId: "bio1",
        fromSubjectName: "Biology",
        strand: "Biology",
        toSubjectId: NEW_TARGET_SUBJECT_ID,
      },
      {
        chapterId: "chapB",
        chapterTitle: "Tiny Building Blocks",
        fromSubjectId: "chem1",
        fromSubjectName: "Chemistry",
        strand: "Chemistry",
        toSubjectId: NEW_TARGET_SUBJECT_ID,
      },
      {
        chapterId: "chapC",
        chapterTitle: "Simple Circuits",
        fromSubjectId: "phy1",
        fromSubjectName: "Physics",
        strand: "Physics",
        toSubjectId: NEW_TARGET_SUBJECT_ID,
      },
    ]);
  });

  test("plans to delete all three now-empty source subjects", () => {
    const plan = buildMergePlan(freshInput());
    expect(plan.subjectDeletions).toEqual(
      expect.arrayContaining([
        { subjectId: "bio1", subjectName: "Biology" },
        { subjectId: "chem1", subjectName: "Chemistry" },
        { subjectId: "phy1", subjectName: "Physics" },
      ]),
    );
    expect(plan.subjectDeletions).toHaveLength(3);
  });

  test("is idempotent: re-running after the chapters already moved and subjects were deleted plans nothing", () => {
    // Second run: source subjects are gone (subjectId: null), and the
    // target now exists with the chapters already carrying strand.
    const secondRunInput = {
      grade: 4,
      target: { name: "Science", existingId: "sci1" },
      sources: [
        { name: "Biology", subjectId: null, chapters: [] },
        { name: "Chemistry", subjectId: null, chapters: [] },
        { name: "Physics", subjectId: null, chapters: [] },
      ],
    };
    const plan = buildMergePlan(secondRunInput);
    expect(plan.createTargetSubject).toBe(false);
    expect(plan.chapterMoves).toEqual([]);
    expect(plan.subjectDeletions).toEqual([]);
  });

  test("re-running mid-way (target created, but a chapter query still finds it under the old subject_id pre-write) skips only the already-moved chapters", () => {
    const midwayInput = {
      grade: 4,
      target: { name: "Science", existingId: "sci1" },
      sources: [
        {
          name: "Biology",
          subjectId: "bio1",
          chapters: [{ id: "chapA", title: "Animal Groups", subject_id: "sci1", strand: "Biology" }],
        },
        {
          name: "Chemistry",
          subjectId: "chem1",
          chapters: [{ id: "chapB", title: "Tiny Building Blocks", subject_id: "chem1", strand: null }],
        },
      ],
    };
    const plan = buildMergePlan(midwayInput);
    expect(plan.skipped).toEqual([
      { chapterId: "chapA", reason: 'Already moved to "Science" with strand "Biology".' },
    ]);
    expect(plan.chapterMoves).toEqual([
      {
        chapterId: "chapB",
        chapterTitle: "Tiny Building Blocks",
        fromSubjectId: "chem1",
        fromSubjectName: "Chemistry",
        strand: "Chemistry",
        toSubjectId: "sci1",
      },
    ]);
    // Biology's chapter is already gone from under bio1 (it's under
    // sci1 now), so Biology's source subject is empty -> safe to delete.
    expect(plan.subjectDeletions).toEqual(
      expect.arrayContaining([{ subjectId: "bio1", subjectName: "Biology" }]),
    );
  });
});

describe("buildMergePlan — Grade 4 Social Science (reuse existing subject, don't duplicate it)", () => {
  test("does not plan to create a new Social Science subject when one already exists", () => {
    const plan = buildMergePlan({
      grade: 4,
      target: { name: "Social Science", existingId: "ss1" },
      sources: [
        {
          name: "History",
          subjectId: "hist1",
          chapters: [{ id: "chapH", title: "Freedom Fighters We Remember", subject_id: "hist1", strand: null }],
        },
        {
          name: "Geography",
          subjectId: "geo1",
          chapters: [{ id: "chapG", title: "Water Around Us", subject_id: "geo1", strand: null }],
        },
      ],
    });

    expect(plan.createTargetSubject).toBe(false);
    expect(plan.targetSubjectId).toBe("ss1");
    expect(plan.chapterMoves).toEqual([
      {
        chapterId: "chapH",
        chapterTitle: "Freedom Fighters We Remember",
        fromSubjectId: "hist1",
        fromSubjectName: "History",
        strand: "History",
        toSubjectId: "ss1",
      },
      {
        chapterId: "chapG",
        chapterTitle: "Water Around Us",
        fromSubjectId: "geo1",
        fromSubjectName: "Geography",
        strand: "Geography",
        toSubjectId: "ss1",
      },
    ]);
    expect(plan.subjectDeletions).toEqual(
      expect.arrayContaining([
        { subjectId: "hist1", subjectName: "History" },
        { subjectId: "geo1", subjectName: "Geography" },
      ]),
    );
  });

  test("leaves the existing Social Science subject's own chapters (e.g. civics) completely untouched", () => {
    // The pre-existing civics chapter never appears in any source's
    // chapter list (it was fetched under History/Geography subject
    // ids, not under Social Science), so it simply never enters the
    // plan at all — no move, no strand, no deletion risk.
    const plan = buildMergePlan({
      grade: 4,
      target: { name: "Social Science", existingId: "ss1" },
      sources: [
        { name: "History", subjectId: "hist1", chapters: [] },
        { name: "Geography", subjectId: "geo1", chapters: [] },
      ],
    });
    const touchesCivics = plan.chapterMoves.some((m) => m.chapterTitle === "Being a Good Citizen");
    expect(touchesCivics).toBe(false);
    // Note: hist1/geo1 are passed with chapters: [] here, meaning (per
    // buildMergePlan's contract) they currently have zero chapters left —
    // so they ARE correctly planned for deletion. This test only asserts
    // that civics itself is never touched; deletion behavior with real
    // chapter data is covered by the sibling test above.
  });

  test("never plans to delete the target even if it is accidentally passed in as its own source", () => {
    const plan = buildMergePlan({
      grade: 4,
      target: { name: "Social Science", existingId: "ss1" },
      sources: [
        { name: "Social Science", subjectId: "ss1", chapters: [{ id: "civ1", title: "Being a Good Citizen", subject_id: "ss1", strand: null }] },
        { name: "History", subjectId: "hist1", chapters: [] },
      ],
    });
    expect(plan.subjectDeletions.some((d) => d.subjectId === "ss1")).toBe(false);
    expect(plan.chapterMoves.some((m) => m.chapterId === "civ1")).toBe(false);
  });
});

describe("buildMergePlan — single-source merges (Grades 6, 7, 8 Chemistry)", () => {
  test("Grade 6: a lone top-level Physics subject still merges into a new Science subject", () => {
    const plan = buildMergePlan({
      grade: 6,
      target: { name: "Science", existingId: null },
      sources: [
        {
          name: "Physics",
          subjectId: "phy6",
          chapters: [{ id: "chapP", title: "Electric Circuits", subject_id: "phy6", strand: null }],
        },
      ],
    });
    expect(plan.createTargetSubject).toBe(true);
    expect(plan.chapterMoves).toEqual([
      {
        chapterId: "chapP",
        chapterTitle: "Electric Circuits",
        fromSubjectId: "phy6",
        fromSubjectName: "Physics",
        strand: "Physics",
        toSubjectId: NEW_TARGET_SUBJECT_ID,
      },
    ]);
    expect(plan.subjectDeletions).toEqual([{ subjectId: "phy6", subjectName: "Physics" }]);
  });

  test("Grade 7: a lone top-level History subject merges into a new Social Science subject", () => {
    const plan = buildMergePlan({
      grade: 7,
      target: { name: "Social Science", existingId: null },
      sources: [
        {
          name: "History",
          subjectId: "hist7",
          chapters: [{ id: "chapM", title: "The Mughal Empire", subject_id: "hist7", strand: null }],
        },
      ],
    });
    expect(plan.createTargetSubject).toBe(true);
    expect(plan.chapterMoves[0].toSubjectId).toBe(NEW_TARGET_SUBJECT_ID);
    expect(plan.subjectDeletions).toEqual([{ subjectId: "hist7", subjectName: "History" }]);
  });
});

describe("buildMergePlan — Grade 8 (two independent merge groups: Science and Social Science)", () => {
  test("Chemistry -> new Science, independently of History+Geography -> new Social Science", () => {
    const sciencePlan = buildMergePlan({
      grade: 8,
      target: { name: "Science", existingId: null },
      sources: [
        {
          name: "Chemistry",
          subjectId: "chem8",
          chapters: [{ id: "chapC", title: "Chemical Equations", subject_id: "chem8", strand: null }],
        },
      ],
    });
    const socialSciencePlan = buildMergePlan({
      grade: 8,
      target: { name: "Social Science", existingId: null },
      sources: [
        {
          name: "History",
          subjectId: "hist8",
          chapters: [{ id: "chapH", title: "India's Freedom Struggle", subject_id: "hist8", strand: null }],
        },
        {
          name: "Geography",
          subjectId: "geo8",
          chapters: [{ id: "chapG", title: "Maps and Navigation", subject_id: "geo8", strand: null }],
        },
      ],
    });

    expect(sciencePlan.subjectDeletions).toEqual([{ subjectId: "chem8", subjectName: "Chemistry" }]);
    expect(socialSciencePlan.subjectDeletions).toEqual(
      expect.arrayContaining([
        { subjectId: "hist8", subjectName: "History" },
        { subjectId: "geo8", subjectName: "Geography" },
      ]),
    );
    // The two groups never interact — Chemistry moving to Science
    // doesn't touch History/Geography's plan at all.
    expect(sciencePlan.chapterMoves).toHaveLength(1);
    expect(socialSciencePlan.chapterMoves).toHaveLength(2);
  });
});

describe("buildMergePlan — anomaly handling", () => {
  test("a chapter whose subject_id disagrees with the source it was fetched under is left alone and flagged, and blocks that source's deletion", () => {
    const plan = buildMergePlan({
      grade: 4,
      target: { name: "Science", existingId: null },
      sources: [
        {
          name: "Biology",
          subjectId: "bio1",
          chapters: [{ id: "chapX", title: "Mystery Chapter", subject_id: "someOtherSubject", strand: null }],
        },
      ],
    });
    expect(plan.chapterMoves).toEqual([]);
    expect(plan.subjectDeletions).toEqual([]);
    expect(plan.notes.some((n) => n.includes("Mystery Chapter"))).toBe(true);
  });
});

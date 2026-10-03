// Unit tests for utils/conceptContext.js — the additive curriculum context
// attached to GET /api/games/content items (Option B: GameContent -> Concept
// -> Chapter -> Subject). Pure function, no DB.
const { toConceptContext } = require("../../src/utils/conceptContext");

const populated = (over = {}) => ({
  _id: "concept-1",
  title: "Physical Change vs Chemical Change",
  explanation_text: "A physical change does not make a new substance.",
  chapter_id: {
    _id: "chapter-1",
    title: "Changes Around Us",
    strand: "Chemistry",
    subject_id: { _id: "subject-1", name: "Science", grade: 7, board: "CBSE" },
  },
  ...over,
});

describe("toConceptContext", () => {
  test("keeps the existing concept fields (backward compatible)", () => {
    const out = toConceptContext(populated());
    expect(out._id).toBe("concept-1");
    expect(out.title).toBe("Physical Change vs Chemical Change");
    expect(out.explanation_text).toBe("A physical change does not make a new substance.");
  });

  test("exposes concept title, chapter title, subject name and subject grade", () => {
    const out = toConceptContext(populated());
    expect(out.chapter).toEqual({
      title: "Changes Around Us",
      strand: "Chemistry",
      subject: { name: "Science", grade: 7 },
    });
  });

  test("a missing strand is null, not an error", () => {
    const c = populated();
    delete c.chapter_id.strand;
    expect(toConceptContext(c).chapter.strand).toBeNull();
    c.chapter_id.strand = null;
    expect(toConceptContext(c).chapter.strand).toBeNull();
  });

  test("does not leak internal ids or unrelated Chapter/Subject fields", () => {
    const out = toConceptContext(populated());
    expect(out.chapter_id).toBeUndefined();
    expect(Object.keys(out.chapter).sort()).toEqual(["strand", "subject", "title"]);
    expect(Object.keys(out.chapter.subject).sort()).toEqual(["grade", "name"]);
    expect(JSON.stringify(out)).not.toMatch(/chapter-1|subject-1|CBSE/);
  });

  test("chapter not populated (bare ObjectId) -> chapter null, concept fields intact", () => {
    const out = toConceptContext(populated({ chapter_id: "507f1f77bcf86cd799439011" }));
    expect(out.chapter).toBeNull();
    expect(out.title).toBe("Physical Change vs Chemical Change");
  });

  test("chapter populated but subject missing -> subject null", () => {
    const c = populated();
    c.chapter_id.subject_id = null;
    expect(toConceptContext(c).chapter).toEqual({ title: "Changes Around Us", strand: "Chemistry", subject: null });
  });

  test("null / unpopulated concept is returned exactly as received", () => {
    expect(toConceptContext(null)).toBeNull();
    expect(toConceptContext(undefined)).toBeUndefined();
    expect(toConceptContext("507f1f77bcf86cd799439011")).toBe("507f1f77bcf86cd799439011");
  });
});

import { describe, test, expect } from "vitest";
import { getLevelContext, contextLabel, contextSkills, commonContext } from "./curriculumContext";

const level = (subject, chapter, concept = "A Concept", strand) => ({
  concept_id: { title: concept, explanation_text: "x", chapter: { title: chapter, strand, subject: subject ? { name: subject, grade: 7 } : null } },
});

describe("getLevelContext", () => {
  test("extracts concept, chapter, strand, subject name and grade", () => {
    expect(getLevelContext(level("Science", "Changes Around Us", "Physical Change", "Chemistry"))).toEqual({
      conceptTitle: "Physical Change", chapterTitle: "Changes Around Us", strand: "Chemistry", subjectName: "Science", subjectGrade: 7,
    });
  });
  test("never throws on missing/odd input and returns nulls", () => {
    const empty = { conceptTitle: null, chapterTitle: null, strand: null, subjectName: null, subjectGrade: null };
    for (const bad of [undefined, null, {}, "x", 5, { concept_id: null }, { concept_id: "507f" }, { concept_id: { title: "T" } }]) {
      expect(() => getLevelContext(bad)).not.toThrow();
    }
    expect(getLevelContext(undefined)).toEqual(empty);
    expect(getLevelContext({ concept_id: { title: "T", chapter: null } })).toEqual({ ...empty, conceptTitle: "T" });
  });
  test("missing strand / subject are null, not errors", () => {
    expect(getLevelContext(level("Science", "Ch", "C")).strand).toBeNull();
    expect(getLevelContext(level(null, "Ch", "C")).subjectName).toBeNull();
  });
});

describe("contextLabel / contextSkills", () => {
  test("SUBJECT · CHAPTER when both exist, partial when one exists, fallback when none", () => {
    expect(contextLabel(getLevelContext(level("Science", "Changes Around Us")), "FB")).toBe("SCIENCE · CHANGES AROUND US");
    expect(contextLabel({ subjectName: "Science" }, "FB")).toBe("SCIENCE");
    expect(contextLabel({ chapterTitle: "Ch" }, "FB")).toBe("CH");
    expect(contextLabel(getLevelContext({}), "FB")).toBe("FB");
    expect(contextLabel(undefined, "FB")).toBe("FB");
  });
  test("skills = [subject, concept] else fallback list", () => {
    expect(contextSkills(getLevelContext(level("Science", "Ch", "Physical Change")), ["F"])).toEqual(["Science", "Physical Change"]);
    expect(contextSkills(getLevelContext({}), ["F"])).toEqual(["F"]);
  });
});

describe("commonContext (level-select)", () => {
  test("reports subject/chapter only when every level shares it", () => {
    const same = [level("Science", "Ch A"), level("Science", "Ch A")];
    expect(commonContext(same)).toMatchObject({ subjectName: "Science", chapterTitle: "Ch A" });
    const mixedChapter = [level("Science", "Ch A"), level("Science", "Ch B")];
    expect(commonContext(mixedChapter)).toMatchObject({ subjectName: "Science", chapterTitle: null });
    const mixedSubject = [level("Science", "Ch A"), level("Mathematics", "Ch A")];
    expect(commonContext(mixedSubject).subjectName).toBeNull();
  });
  test("empty / missing list / a level without metadata -> nothing common", () => {
    expect(commonContext([])).toMatchObject({ subjectName: null, chapterTitle: null });
    expect(commonContext(undefined)).toMatchObject({ subjectName: null, chapterTitle: null });
    expect(commonContext([level("Science", "Ch A"), {}])).toMatchObject({ subjectName: null, chapterTitle: null });
  });
});

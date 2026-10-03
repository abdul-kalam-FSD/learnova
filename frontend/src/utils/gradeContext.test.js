import { describe, test, expect } from "vitest";
import { getGradeContext, getGradeContextForGrade, simplifyObjective } from "./gradeContext";

describe("gradeContext", () => {
  test("Grades 4-6 get the lower-grade copy", () => {
    for (const g of [4, 5, 6]) {
      const c = getGradeContextForGrade(g);
      expect(c.startLabel).toBe("Let's start!");
      expect(c.showSkills).toBe(false);
    }
  });

  test("Grades 7-10 keep the original lobby copy exactly", () => {
    for (const g of [7, 8, 9, 10]) {
      const c = getGradeContextForGrade(g);
      expect(c.objectiveLabel).toBe("Mission objective");
      expect(c.skillsLabel).toBe("Skills");
      expect(c.showSkills).toBe(true);
      expect(c.startLabel).toBe("Start Mission");
      expect(c.backLabel).toBe("← Choose a different level");
      expect(c.levelLabel(2, 5)).toBe("Level 2 of 5");
      expect(c.timeLabel(3)).toBe("~3 min");
      expect(c.xpPerCorrectLabel(10)).toBe("+10 XP per correct");
      expect(c.perfectBonusLabel(5)).toBe(" · +5 perfect bonus");
      expect(c.maxXpLabel(50)).toBe("Up to 50 XP this round");
    }
  });

  test("Grades 11-12 get the senior copy", () => {
    for (const g of [11, 12]) {
      const c = getGradeContextForGrade(g);
      expect(c.objectiveLabel).toBe("Learning objective");
      expect(c.startLabel).toBe("Begin");
      expect(c.showSkills).toBe(true);
    }
  });

  test("null / unknown band falls back to the original copy", () => {
    expect(getGradeContext(null)).toBe(getGradeContext("middle"));
    expect(getGradeContext("nonsense").startLabel).toBe("Start Mission");
  });
});

// ---- simplifyObjective: same text, fewer whole sentences, by grade ----
const S1 = "Living things pass through stages as they grow.";
const S2 = "A seed sprouts into a seedling and then into a plant that can flower.";
const S3 = "Many animals grow in stages too, such as a chick that hatches from an egg and becomes a hen.";
const S4 = "Putting the stages in the right order shows how growth happens step by step, not all at once.";
const S5 = "Each stage looks a little different from the one before it, even though it is the same living thing.";
const LONG = [S1, S2, S3, S4, S5].join(" ");

describe("simplifyObjective", () => {
  test("Grade 4 keeps only the first whole sentence", () => {
    expect(LONG.length).toBeGreaterThan(280);
    expect(simplifyObjective(LONG, 4)).toBe(S1);
  });

  test("Grades 5 and 6 keep the first two whole sentences (more than Grade 4)", () => {
    for (const g of [5, 6]) expect(simplifyObjective(LONG, g)).toBe(`${S1} ${S2}`);
    expect(simplifyObjective(LONG, 5).length).toBeGreaterThan(simplifyObjective(LONG, 4).length);
  });

  test("a numeric string grade behaves like the number", () => {
    expect(simplifyObjective(LONG, "4")).toBe(S1);
  });

  test("Grades 7-12, missing and unknown grades get the original text, untouched", () => {
    for (const g of [7, 8, 9, 10, 11, 12, null, undefined, 3, "x"]) expect(simplifyObjective(LONG, g)).toBe(LONG);
  });

  test("non-string or empty objectives pass straight through", () => {
    expect(simplifyObjective(undefined, 4)).toBeUndefined();
    expect(simplifyObjective(null, 4)).toBeNull();
    expect(simplifyObjective("", 4)).toBe("");
  });

  test("text that is already short is not touched", () => {
    const short = `${S1} ${S2}`;
    expect(simplifyObjective(short, 4)).toBe(short);
    expect(simplifyObjective(short, 5)).toBe(short);
  });

  test("a single long sentence cannot be cut, so the original is kept", () => {
    const one = "Staying healthy is a set of small daily habits done in the right order and at the right time, such as washing hands before eating, brushing teeth after meals, getting enough sleep, and being active during the day.";
    expect(one.length).toBeGreaterThan(200);
    expect(simplifyObjective(one, 4)).toBe(one);
  });

  test("a first sentence that is itself too long (a list) keeps the original", () => {
    const list = "A neighbourhood has different places that each serve a purpose: a school is where children learn, a hospital is where the sick are treated, a market is where people buy food, and a post office is where letters are sent. Knowing these places helps you find your way around.";
    expect(simplifyObjective(list, 4)).toBe(list);
  });

  test("decimals are not sentence boundaries", () => {
    const text = "A pencil is 17.5 cm long and a ruler is 30.0 cm long, so the ruler is longer. Measuring with a ruler means lining up the zero mark with one end of the object being measured. Always read the number at the other end carefully.";
    expect(simplifyObjective(text, 4)).toBe("A pencil is 17.5 cm long and a ruler is 30.0 cm long, so the ruler is longer.");
  });

  test("abbreviations like a.m./p.m. make boundaries ambiguous, so the original is kept", () => {
    const text = "A day has 24 hours in it, and we split it into smaller parts. The 12-hour clock uses a.m. for the morning and p.m. for the afternoon. A calendar organises days into weeks and months, and it helps us count the days between two dates.";
    expect(text.length).toBeGreaterThan(200);
    for (const g of [4, 5, 6]) expect(simplifyObjective(text, g)).toBe(text);
  });

  test("e.g. / i.e. / ellipses / line breaks also keep the original", () => {
    const base = `${S1} ${S2} ${S3} ${S4} ${S5}`;
    for (const marker of [" (e.g. a seed)", " (i.e. a seed)", " and so on...", "\nNew line"]) {
      const t = base + marker;
      expect(simplifyObjective(t, 4)).toBe(t);
    }
  });

  test("unbalanced brackets in the kept part keep the original", () => {
    const text = "Plants make their own food (a process called photosynthesis. It happens in the green leaves and needs light and water to work properly. The food is then used to grow bigger and make new leaves and seeds.";
    expect(simplifyObjective(text, 4)).toBe(text);
  });

  test("never returns a stub: if the lead sentence is tiny and the next one does not fit, keep the original", () => {
    const long2 = "The twelve hour clock counts one to twelve twice in a day, once before noon and once after noon, and the twenty four hour clock simply keeps counting on from one to twenty four without ever repeating a number.";
    expect(long2.length).toBeGreaterThan(200);
    const stub = `A day has 24 hours. ${long2} A calendar organises days into weeks and months.`;
    expect(simplifyObjective(stub, 4)).toBe(stub);
  });

  test("the shown text is always the beginning of the original text", () => {
    for (const g of [4, 5, 6]) expect(LONG.startsWith(simplifyObjective(LONG, g))).toBe(true);
  });
});

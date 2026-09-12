import { describe, test, expect } from "vitest";
import { iconFor } from "./chapterIcon";

describe("iconFor", () => {
  test("matches a topic keyword regardless of subject", () => {
    expect(iconFor("Cell Structure and Function")).toBe("🔬");
    expect(iconFor("Heredity and Evolution")).toBe("🧬");
  });

  test("falls back to a subject-appropriate icon when no topic keyword matches", () => {
    expect(iconFor("Nature and Forms of Business Organisation", "Commerce")).toBe("💼");
    expect(iconFor("Introduction to Microeconomics: Demand and Supply", "Economics")).toBe("💼");
    expect(iconFor("Functions in Python", "Computer Science")).toBe("💻");
    expect(iconFor("Nationalism in India", "History")).toBe("🏛️");
    expect(iconFor("Resources and Agriculture in India", "Geography")).toBe("🗺️");
    expect(iconFor("Straight Lines", "Mathematics")).toBe("📐");
  });

  test("does not fall back to the Biology DNA icon for non-Biology subjects", () => {
    expect(iconFor("Nature and Forms of Business Organisation", "Commerce")).not.toBe("🧬");
  });

  test("falls back to a generic default when subject is unknown or absent", () => {
    expect(iconFor("Some Unrecognised Topic")).toBe("📘");
    expect(iconFor("Some Unrecognised Topic", "Made Up Subject")).toBe("📘");
  });
});

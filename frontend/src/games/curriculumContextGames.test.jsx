// Phase 10B: the 5 shared games take their subject/chapter context from the
// /games/content response (concept_id.chapter.subject), not from hard-coded
// wording. Existing per-game test files keep covering the interactions.
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import EcosystemBalance from "./biology/EcosystemBalance";
import Diagnosis from "./biology/Diagnosis";
import ChemistryMatch from "./chemistry/ChemistryMatch";
import ConceptMatch from "./commerce/ConceptMatch";
import DebuggingLab from "./computerscience/DebuggingLab";

vi.mock("../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("react-router-dom", async (orig) => ({ ...(await orig()), useNavigate: () => vi.fn() }));

const arr = [{ id: "a", label: "x" }];
const PAYLOAD = { scrambled_effects: arr, evidence: arr, slots: arr, components: arr, code_lines: arr };
const lvl = (id, title, subject, chapter, concept) => ({
  id, title, difficulty: "easy", payload: PAYLOAD,
  concept_id: subject === undefined ? undefined : {
    _id: `c-${id}`, title: concept, explanation_text: "Concept explanation shown in the lobby only.",
    chapter: chapter === null ? null : { title: chapter, strand: null, subject: subject === null ? null : { name: subject, grade: 7 } },
  },
});

const setLevels = (levels) =>
  api.get.mockImplementation((u) =>
    u === "/games/content" ? Promise.resolve({ data: { content: levels } })
    : u === "/home" ? Promise.resolve({ data: { streak_count: 0, xp_total: 0 } })
    : Promise.reject(new Error(u)));

const html = () => document.body.textContent.replace(/\s+/g, " ");

// [name, component, neutral fallback label, fallback skill, forbidden old wording,
//  scientific context (title/subject/chapter/concept), other context]
const GAMES = [
  ["ConceptMatch", ConceptMatch, "CONCEPT MATCH", "Concept Matching", /COMMERCE|TERMS & DEFINITIONS|Terminology/,
    ["Match: Nutrients", "Science", "Food: Components of Food", "What Nutrients Do"],
    ["Match: Accounting Terms", "Accountancy", "Fundamentals of Accounting", "Accounting Terms"]],
  ["EcosystemBalance", EcosystemBalance, "SEQUENCE", "Sequencing", /FOOD CHAINS|food web|ripple|ecosystem effects/i,
    ["The Journey Through the Nephron", "Biology", "Excretory Products", "Urine Formation"],
    ["Chain: A Cleared Hillside", "Science", "Our Environment", "Environmental Issues"]],
  ["Diagnosis", Diagnosis, "EVIDENCE FILE", "Reasoning from Evidence", /patient|HUMAN HEALTH|CASE FILE|Human Health/i,
    ["The Chess Player", "Biology", "Control and Coordination", "Reaction Time"],
    ["The Tired Sailor", "Biology", "Diseases and Nutrition", "Nutritional Deficiency"]],
  ["ChemistryMatch", ChemistryMatch, "CATEGORY MATCH", "Category Matching", /Metal or Non-Metal|Metals & Non-Metals|MATERIALS/,
    ["Sort the Changes", "Science", "Changes Around Us", "Physical Change vs Chemical Change"],
    ["Match: Mixture to Method", "Science", "Methods of Separation", "Choosing a Separation Method"]],
  ["DebuggingLab", DebuggingLab, "COMPUTER SCIENCE", "Debugging", /pseudocode|ALGORITHMS/i,
    ["Bug: Sum of Two Inputs", "Computer Science", "Getting Started with Python", "Variables, Input and Sequential Programs"],
    ["Bug: Getting Ready", "Computer Science", "Following Steps in Order", "Spotting the Wrong Step"]],
];

const mount = (Game) => render(<MemoryRouter><Game /></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe.each(GAMES)("%s — curriculum context", (name, Game, fallbackLabel, fallbackSkill, oldWording, ctxA, ctxB) => {
  const [titleA, subjA, chapA, conceptA] = ctxA;
  const [titleB, subjB, chapB, conceptB] = ctxB;

  test("context available: level-select shows the shared SUBJECT · CHAPTER, never the old wording", async () => {
    setLevels([lvl("1", titleA, subjA, chapA, conceptA), lvl("2", `${titleA} 2`, subjA, chapA, conceptA)]);
    mount(Game);
    await screen.findByText(titleA);
    expect(html()).toContain(`${subjA} · ${chapA}`.toUpperCase());
    expect(html()).not.toMatch(oldWording);
  });

  test("context available: lobby of the selected level shows its own subject/chapter + [subject, concept] skills", async () => {
    setLevels([lvl("1", titleA, subjA, chapA, conceptA), lvl("2", titleB, subjB, chapB, conceptB)]);
    mount(Game);
    fireEvent.click(await screen.findByText(titleB));
    await screen.findByText(`${subjB} · ${chapB}`.toUpperCase());
    expect(screen.getByText(subjB)).toBeInTheDocument();
    expect(screen.getByText(conceptB)).toBeInTheDocument();
    expect(html()).not.toMatch(oldWording);
    expect(html()).not.toContain(chapA.toUpperCase());
  });

  test("mixed contexts in one list: level-select uses the neutral label, not one level's context", async () => {
    setLevels([lvl("1", titleA, subjA, chapA, conceptA), lvl("2", titleB, subjB === subjA ? "Other Subject" : subjB, chapB, conceptB)]);
    mount(Game);
    await screen.findByText(titleA);
    expect(html()).toContain(fallbackLabel);
    expect(html()).not.toContain(chapA.toUpperCase());
    expect(html()).not.toContain(chapB.toUpperCase());
  });

  test("missing metadata (no concept_id): renders safely with fallback label and skill", async () => {
    setLevels([lvl("1", "Plain Level", undefined)]);
    mount(Game);
    expect(await screen.findByText(fallbackLabel)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Plain Level"));
    await screen.findByText(fallbackSkill);
    expect(html()).not.toMatch(oldWording);
  });

  test.each([
    ["chapter null", lvl("1", "L", "Science", null, "C")],
    ["subject null", lvl("1", "L", null, "Some Chapter", "C")],
  ])("partial metadata (%s) does not crash", async (_label, level) => {
    setLevels([level]);
    mount(Game);
    fireEvent.click(await screen.findByText("L"));
    expect((await screen.findAllByText(/Level 1 of 1|Start Mission|Let's start!|Begin/)).length).toBeGreaterThan(0);
  });
});

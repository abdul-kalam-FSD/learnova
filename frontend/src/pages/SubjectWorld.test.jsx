import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import SubjectWorld from "./SubjectWorld";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

function mockApi({ progress = null, progressError = null, home = null, catalog = [] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === "/progress") {
      return progressError
        ? Promise.reject(progressError)
        : Promise.resolve({ data: progress });
    }
    if (url === "/home") {
      return home ? Promise.resolve({ data: home }) : Promise.reject(new Error("no home"));
    }
    if (url === "/games/catalog") {
      return Promise.resolve({ data: { catalog } });
    }
    return Promise.reject(new Error(`unmocked url: ${url}`));
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SubjectWorld />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SubjectWorld", () => {
  test("shows an empty state when there are no chapters", async () => {
    mockApi({ progress: { chapters: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No worlds yet")).toBeInTheDocument();
    });
  });

  test("shows the API's error message when /progress fails", async () => {
    mockApi({ progressError: { response: { data: { message: "Failed to load" } } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error: Failed to load")).toBeInTheDocument();
    });
  });

  test("renders a world card per subject with mastery and current mission, and navigates on click", async () => {
    mockApi({
      progress: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Plant Kingdom",
            unit_name: "Diversity & Living World",
            subject_name: "Biology",
            total_concepts: 4,
            breakdown: { weak: 2, learning: 1, strong: 1 },
          },
          {
            chapter_id: "c2",
            title: "Cell Structure",
            unit_name: "Diversity & Living World",
            subject_name: "Biology",
            total_concepts: 3,
            breakdown: { weak: 0, learning: 0, strong: 3 },
          },
        ],
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Biology")).toBeInTheDocument();
    });
    // Cell Structure is fully mastered, Plant Kingdom is not -> Plant
    // Kingdom (first in order) is the current mission, not the
    // already-complete chapter.
    expect(screen.getByText("Current Mission")).toBeInTheDocument();
    expect(screen.getByText("Plant Kingdom")).toBeInTheDocument();
    // c1: 2/4 concepts mastered (not complete), c2: 3/3 (complete) ->
    // 1/2 chapters complete, overall (2+3)/(4+3) = 71% mastery.
    expect(screen.getByText("1/2 chapters mastered · 71% mastery")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Biology").closest("button"));
    expect(navigateMock).toHaveBeenCalledWith("/subjects/Biology");
  });

  test("shows an all-complete badge and no current mission when every chapter is mastered", async () => {
    mockApi({
      progress: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Cell Structure",
            unit_name: "Diversity",
            subject_name: "Biology",
            total_concepts: 2,
            breakdown: { weak: 0, learning: 0, strong: 2 },
          },
        ],
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("✓ All missions complete")).toBeInTheDocument();
    });
    expect(screen.queryByText("Current Mission")).not.toBeInTheDocument();
  });

  test("shows the recommended mechanic from the games catalog when one exists for the subject", async () => {
    mockApi({
      progress: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Fractions & Decimals",
            unit_name: "Numbers",
            subject_name: "Mathematics",
            total_concepts: 2,
            breakdown: { weak: 2, learning: 0, strong: 0 },
          },
        ],
      },
      catalog: [
        {
          subject: "Mathematics",
          gameTypes: [{ game_type: "MATH_FRACTION_BUILDER", label: "Fraction Builder", count: 3 }],
        },
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Build the fraction")).toBeInTheDocument();
    });
    expect(screen.getByText("· Fraction Builder")).toBeInTheDocument();
  });

  test("shows a no-games message when the subject has no catalog entry", async () => {
    mockApi({
      progress: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Intro to Microeconomics",
            unit_name: "Foundations",
            subject_name: "Economics",
            total_concepts: 2,
            breakdown: { weak: 2, learning: 0, strong: 0 },
          },
        ],
      },
      catalog: [],
    });
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("No games yet for this world — chapters are still playable via Practice."),
      ).toBeInTheDocument();
    });
  });

  test("renders a player header (Level/XP) once /home resolves", async () => {
    mockApi({
      progress: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Plant Kingdom",
            unit_name: "Diversity",
            subject_name: "Biology",
            total_concepts: 2,
            breakdown: { weak: 2, learning: 0, strong: 0 },
          },
        ],
      },
      home: { name: "Priya", xp_total: 850, streak_count: 4 },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya")).toBeInTheDocument();
    });
    expect(screen.getByText("Lv 3")).toBeInTheDocument(); // 850 / 400 -> level 3
  });

  test("shows a read-only Grade badge when /home returns a grade", async () => {
    mockApi({
      progress: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Plant Kingdom",
            unit_name: "Diversity",
            subject_name: "Biology",
            total_concepts: 2,
            breakdown: { weak: 2, learning: 0, strong: 0 },
          },
        ],
      },
      home: { name: "Priya", xp_total: 850, streak_count: 4, grade: "8" },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Grade 8")).toBeInTheDocument();
    });
    // Read-only context chip, not a grade-selection control.
    expect(screen.queryByRole("button", { name: "Grade 8" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Grade 8" })).not.toBeInTheDocument();
  });

  test("does not render a Grade badge when /home has no grade", async () => {
    mockApi({
      progress: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Plant Kingdom",
            unit_name: "Diversity",
            subject_name: "Biology",
            total_concepts: 2,
            breakdown: { weak: 2, learning: 0, strong: 0 },
          },
        ],
      },
      home: { name: "Priya", xp_total: 850, streak_count: 4 },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya")).toBeInTheDocument();
    });
    expect(screen.queryByText(/^Grade /)).not.toBeInTheDocument();
  });

  test("does not crash and still renders worlds when /home fails", async () => {
    mockApi({
      progress: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Plant Kingdom",
            unit_name: "Diversity",
            subject_name: "Biology",
            total_concepts: 2,
            breakdown: { weak: 2, learning: 0, strong: 0 },
          },
        ],
      },
      home: null,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Biology")).toBeInTheDocument();
    });
    expect(screen.queryByText("Lv 1")).not.toBeInTheDocument();
  });
});

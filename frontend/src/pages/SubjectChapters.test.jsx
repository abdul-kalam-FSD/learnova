import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../api/axios";
import SubjectChapters from "./SubjectChapters";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

function mockApi({ progress = null, progressError = null, chapterDetails = {} } = {}) {
  api.get.mockImplementation((url) => {
    if (url === "/progress") {
      return progressError
        ? Promise.reject(progressError)
        : Promise.resolve({ data: progress });
    }
    const chapterMatch = url.match(/^\/chapters\/(.+)$/);
    if (chapterMatch) {
      const detail = chapterDetails[chapterMatch[1]];
      return detail
        ? Promise.resolve({ data: detail })
        : Promise.reject(new Error(`no detail mocked for ${chapterMatch[1]}`));
    }
    return Promise.reject(new Error(`unmocked url: ${url}`));
  });
}

function renderPage(subjectName = "Biology") {
  return render(
    <MemoryRouter initialEntries={[`/subjects/${subjectName}`]}>
      <Routes>
        <Route path="/subjects/:subjectName" element={<SubjectChapters />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SubjectChapters", () => {
  test("shows an empty state when the subject has no chapters", async () => {
    mockApi({ progress: { chapters: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No chapters yet")).toBeInTheDocument();
    });
  });

  test("shows the API's error message when /progress fails", async () => {
    mockApi({ progressError: { response: { data: { message: "Failed to load" } } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error: Failed to load")).toBeInTheDocument();
    });
  });

  test("filters chapters to only the requested subject and groups by unit", async () => {
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
          {
            chapter_id: "c2",
            title: "Demand and Supply",
            unit_name: "Micro",
            subject_name: "Economics",
            total_concepts: 2,
            breakdown: { weak: 2, learning: 0, strong: 0 },
          },
        ],
      },
      chapterDetails: { c1: { games: [] } },
    });
    renderPage("Biology");

    // Plant Kingdom isn't mastered yet, so it appears both as the
    // Current Mission hero and in the journey list below it.
    await waitFor(() => {
      expect(screen.getAllByText("Plant Kingdom").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Diversity")).toBeInTheDocument();
    expect(screen.queryByText("Demand and Supply")).not.toBeInTheDocument();
  });

  test("shows a Current Mission hero for the first not-fully-mastered chapter, with its real recommended mechanic", async () => {
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
          {
            chapter_id: "c2",
            title: "Plant Kingdom",
            unit_name: "Diversity",
            subject_name: "Biology",
            total_concepts: 4,
            breakdown: { weak: 2, learning: 1, strong: 1 },
          },
        ],
      },
      chapterDetails: {
        c2: { games: [{ game_type: "BIO_VIRTUAL_LAB", label: "Virtual Lab", count: 2 }] },
      },
    });
    renderPage("Biology");

    await waitFor(() => {
      expect(screen.getByText("▶ Current Mission")).toBeInTheDocument();
    });
    // Cell Structure (c1) is already fully mastered, so Plant Kingdom
    // (c2) is the mission, not the completed chapter.
    expect(screen.getAllByText("Plant Kingdom")).not.toHaveLength(0);
    expect(screen.getByText("2/4 concepts mastered so far.")).toBeInTheDocument();
    expect(screen.getByText("Investigate the sample")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Continue Mission →"));
    expect(navigateMock).toHaveBeenCalledWith("/mission/c2", {
      state: { subjectName: "Biology" },
    });
  });

  test("shows no mission hero when every chapter in the world is already mastered", async () => {
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
    renderPage("Biology");

    await waitFor(() => {
      expect(screen.getByText("Biology World")).toBeInTheDocument();
    });
    expect(screen.queryByText("▶ Current Mission")).not.toBeInTheDocument();
  });

  test("shows a no-games message in the hero when the current chapter has no mechanics yet", async () => {
    mockApi({
      progress: {
        chapters: [
          {
            chapter_id: "c1",
            title: "New Topic",
            unit_name: "Intro",
            subject_name: "Biology",
            total_concepts: 2,
            breakdown: { weak: 2, learning: 0, strong: 0 },
          },
        ],
      },
      chapterDetails: { c1: { games: [] } },
    });
    renderPage("Biology");

    await waitFor(() => {
      expect(
        screen.getByText("No games for this chapter yet — practice is still available inside."),
      ).toBeInTheDocument();
    });
  });

  test("navigates back to Worlds", async () => {
    mockApi({ progress: { chapters: [] } });
    renderPage("Biology");
    await waitFor(() => {
      expect(screen.getByText("No chapters yet")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("← Back to Worlds"));
    expect(navigateMock).toHaveBeenCalledWith("/subjects");
  });
});

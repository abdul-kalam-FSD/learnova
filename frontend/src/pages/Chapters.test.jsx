import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import Chapters from "./Chapters";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Chapters />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Chapters", () => {
  test("shows an empty state when there are no chapters", async () => {
    api.get.mockResolvedValue({ data: { chapters: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No chapters yet")).toBeInTheDocument();
    });
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error: Failed to load")).toBeInTheDocument();
    });
  });

  test("single-subject grade renders unit headings without a subject heading", async () => {
    api.get.mockResolvedValue({
      data: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Plant Kingdom",
            unit_name: "Diversity & Living World",
            subject_name: "Biology",
            total_concepts: 3,
            breakdown: { weak: 3, learning: 0, strong: 0 },
          },
        ],
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Plant Kingdom")).toBeInTheDocument();
    });
    expect(screen.getByText("Diversity & Living World")).toBeInTheDocument();
    // Only one subject present -> no separate subject-level heading rendered.
    expect(screen.queryByText("Biology")).not.toBeInTheDocument();
  });

  test("multi-subject grade groups chapters under a subject heading each", async () => {
    api.get.mockResolvedValue({
      data: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Plant Kingdom",
            unit_name: "Diversity & Living World",
            subject_name: "Biology",
            total_concepts: 3,
            breakdown: { weak: 3, learning: 0, strong: 0 },
          },
          {
            chapter_id: "c2",
            title: "Introduction to Microeconomics: Demand and Supply",
            unit_name: "Introductory Microeconomics",
            subject_name: "Economics",
            total_concepts: 2,
            breakdown: { weak: 2, learning: 0, strong: 0 },
          },
        ],
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Plant Kingdom")).toBeInTheDocument();
    });
    expect(screen.getByText("Biology")).toBeInTheDocument();
    expect(screen.getByText("Economics")).toBeInTheDocument();
    expect(
      screen.getByText("Introduction to Microeconomics: Demand and Supply"),
    ).toBeInTheDocument();
  });

  test("chapters without a subject_name fall back to a single 'General' group", async () => {
    api.get.mockResolvedValue({
      data: {
        chapters: [
          {
            chapter_id: "c1",
            title: "Legacy Chapter",
            unit_name: "General",
            total_concepts: 1,
            breakdown: { weak: 1, learning: 0, strong: 0 },
          },
        ],
      },
    });
    const { container } = renderPage();
    await waitFor(() => {
      expect(screen.getByText("Legacy Chapter")).toBeInTheDocument();
    });
    // Single fallback subject group -> no subject-level heading wrapper rendered.
    expect(
      container.querySelectorAll(".chapters-page__subject-heading"),
    ).toHaveLength(0);
  });
});

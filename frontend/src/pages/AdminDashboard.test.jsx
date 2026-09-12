import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import AdminDashboard from "./AdminDashboard";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

const FULL_DATA = {
  totals: {
    totalStudents: 120,
    totalTeachers: 8,
    activeWindowDays: 7,
    activeStudents: 45,
    gamesPlayed: 900,
    completionRate: 82,
    avgPerformance: 76,
    avgPerformanceSampleSize: 500,
  },
  gradePerformance: [{ grade: 8, accuracy: 70 }],
  subjectPerformance: [{ subject: "Mathematics", accuracy: 75 }],
  weakAreas: [
    {
      conceptId: "c1",
      conceptTitle: "Equivalent Fractions",
      subject: "Mathematics",
      grade: 6,
      chapterTitle: "Fractions & Decimals",
      status: "weak",
    },
  ],
  contentStatus: {
    totalSubjects: 20,
    gradesCovered: [6, 7, 8],
    totalChapters: 55,
    totalGameContent: 300,
    subjectsWithNoChapters: 0,
    chaptersWithNoConcepts: 0,
  },
  recentActivity: [
    {
      sessionId: "a1",
      studentName: "Priya Kumar",
      grade: 8,
      label: "Fraction Builder",
      accuracy: 80,
      completedAt: "2026-02-01T10:00:00.000Z",
    },
  ],
};

const EMPTY_DATA = {
  totals: {
    totalStudents: 0,
    totalTeachers: 0,
    activeWindowDays: 7,
    activeStudents: 0,
    gamesPlayed: 0,
    completionRate: 0,
    avgPerformance: null,
    avgPerformanceSampleSize: 0,
  },
  gradePerformance: [],
  subjectPerformance: [],
  weakAreas: [],
  contentStatus: {
    totalSubjects: 0,
    gradesCovered: [],
    totalChapters: 0,
    totalGameContent: 0,
    subjectsWithNoChapters: 2,
    chaptersWithNoConcepts: 3,
  },
  recentActivity: [],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminDashboard", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
  });

  test("shows an error with a Retry button that re-fetches on click", async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: "Server error" } } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
    });

    api.get.mockResolvedValueOnce({ data: FULL_DATA });
    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("120")).toBeInTheDocument();
    });
  });

  test("renders stat cards and performance-by-grade/subject with real data", async () => {
    api.get.mockResolvedValue({ data: FULL_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("120")).toBeInTheDocument();
    });
    const eightMatches = screen.getAllByText("8");
    const teacherCard = eightMatches.find((el) => el.closest(".dash-card"));
    expect(teacherCard.closest(".dash-card").querySelector(".dash-card__label")).toHaveTextContent(
      "Total teachers",
    );
    expect(screen.getByText("Active in last 7d")).toBeInTheDocument();
    expect(screen.getByText("Grade 8")).toBeInTheDocument();
    expect(screen.getByText("Mathematics")).toBeInTheDocument();
    expect(screen.getByText("500 scored sessions")).toBeInTheDocument();
  });

  test("shows a placeholder instead of a percentage when avgPerformance is null", async () => {
    api.get.mockResolvedValue({ data: EMPTY_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No scored sessions yet")).toBeInTheDocument();
    });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("shows empty states for grade/subject performance, weak areas, and recent activity when all are empty", async () => {
    api.get.mockResolvedValue({ data: EMPTY_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("No graded activity yet").length).toBeGreaterThan(0);
    });
    // Grade + subject performance share the same empty-state copy —
    // both sections should render it.
    expect(screen.getAllByText("No graded activity yet")).toHaveLength(2);
    expect(screen.getByText("No weak areas identified yet")).toBeInTheDocument();
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  test("renders weak areas and navigates to the full list on 'View all'", async () => {
    api.get.mockResolvedValue({ data: FULL_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument();
    });
    expect(screen.getByText("weak")).toBeInTheDocument();

    fireEvent.click(screen.getByText("View all →"));
    expect(navigateMock).toHaveBeenCalledWith("/teacher/weak-areas");
  });

  test("shows content-status warning lines only when their counts are nonzero", async () => {
    api.get.mockResolvedValue({ data: EMPTY_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("⚠ Subjects with no chapters")).toBeInTheDocument();
    });
    expect(screen.getByText("⚠ Chapters with no concepts")).toBeInTheDocument();
  });

  test("does not show content-status warnings when counts are zero", async () => {
    api.get.mockResolvedValue({ data: FULL_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Subjects seeded")).toBeInTheDocument();
    });
    expect(screen.queryByText("⚠ Subjects with no chapters")).not.toBeInTheDocument();
    expect(screen.queryByText("⚠ Chapters with no concepts")).not.toBeInTheDocument();
  });

  test("renders the recent activity table", async () => {
    api.get.mockResolvedValue({ data: FULL_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    expect(screen.getByText("Fraction Builder")).toBeInTheDocument();
  });
});

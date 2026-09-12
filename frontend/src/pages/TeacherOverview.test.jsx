import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import TeacherOverview from "./TeacherOverview";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

const FULL_DATA = {
  isScoped: true,
  totals: {
    totalStudents: 32,
    totalSections: 3,
    avgPerformance: 68,
    avgPerformanceSampleSize: 140,
  },
  weakAreas: [
    {
      conceptId: "c1",
      weak: 5,
      conceptTitle: "Photosynthesis",
      subject: "Biology",
      chapterTitle: "Plant Life",
      status: "weak",
    },
  ],
  subjectPerformance: [{ subject: "Biology", accuracy: 71 }],
  recentActivity: [
    {
      sessionId: "s1",
      studentName: "Arun Kumar",
      label: "Cell Structure Quiz",
      accuracy: 90,
      completedAt: "2026-03-01T09:00:00.000Z",
    },
  ],
};

const UNSCOPED_DATA = {
  ...FULL_DATA,
  isScoped: false,
};

const EMPTY_DATA = {
  isScoped: true,
  totals: {
    totalStudents: 0,
    totalSections: 0,
    avgPerformance: null,
    avgPerformanceSampleSize: 0,
  },
  weakAreas: [],
  subjectPerformance: [],
  recentActivity: [],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherOverview />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeacherOverview", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading your dashboard...")).toBeInTheDocument();
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
      expect(screen.getByText("32")).toBeInTheDocument();
    });
  });

  test("shows scoped subtitle for a normal teacher view", async () => {
    api.get.mockResolvedValue({ data: FULL_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Your classes, at a glance.")).toBeInTheDocument();
    });
  });

  test("shows platform-wide subtitle when isScoped is false", async () => {
    api.get.mockResolvedValue({ data: UNSCOPED_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Showing platform-wide numbers (admin view).")).toBeInTheDocument();
    });
  });

  test("shows the no-students empty state and skips the rest of the dashboard when totalStudents is 0", async () => {
    api.get.mockResolvedValue({ data: EMPTY_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No students assigned yet")).toBeInTheDocument();
    });
    expect(screen.queryByText("My students")).not.toBeInTheDocument();
    expect(screen.queryByText("Students needing attention")).not.toBeInTheDocument();
  });

  test("renders stat cards with real data", async () => {
    api.get.mockResolvedValue({ data: FULL_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("32")).toBeInTheDocument();
    });
    expect(screen.getByText("My students")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("My sections")).toBeInTheDocument();
    expect(screen.getByText("68%")).toBeInTheDocument();
    expect(screen.getByText("140 scored sessions")).toBeInTheDocument();
  });

  test("shows a placeholder instead of a percentage when avgPerformance is null", async () => {
    const withStudents = {
      ...EMPTY_DATA,
      totals: { ...EMPTY_DATA.totals, totalStudents: 5, totalSections: 1 },
    };
    api.get.mockResolvedValue({ data: withStudents });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No scored sessions yet")).toBeInTheDocument();
    });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("renders weak areas with student counts and navigates to weak-areas on 'View all'", async () => {
    api.get.mockResolvedValue({ data: FULL_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/5 students struggling with Photosynthesis/)).toBeInTheDocument();
    });
    expect(screen.getByText("weak")).toBeInTheDocument();

    fireEvent.click(screen.getByText("View all →"));
    expect(navigateMock).toHaveBeenCalledWith("/teacher/weak-areas");
  });

  test("singularizes the weak-area student count when there is exactly one", async () => {
    const oneWeak = {
      ...FULL_DATA,
      weakAreas: [{ ...FULL_DATA.weakAreas[0], weak: 1 }],
    };
    api.get.mockResolvedValue({ data: oneWeak });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/1 student struggling with Photosynthesis/)).toBeInTheDocument();
    });
  });

  test("renders subject performance bars", async () => {
    api.get.mockResolvedValue({ data: FULL_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Biology")).toBeInTheDocument();
    });
    expect(screen.getByText("71%")).toBeInTheDocument();
  });

  test("renders the recent activity table and navigates to students on 'View all students'", async () => {
    api.get.mockResolvedValue({ data: FULL_DATA });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Arun Kumar")).toBeInTheDocument();
    });
    expect(screen.getByText("Cell Structure Quiz")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();

    fireEvent.click(screen.getByText("View all students →"));
    expect(navigateMock).toHaveBeenCalledWith("/teacher/students");
  });

  test("shows empty states for weak areas, subject performance, and recent activity when all are empty but students exist", async () => {
    const withStudentsNoActivity = {
      ...EMPTY_DATA,
      totals: { ...EMPTY_DATA.totals, totalStudents: 5, totalSections: 1 },
    };
    api.get.mockResolvedValue({ data: withStudentsNoActivity });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No weak areas identified yet")).toBeInTheDocument();
    });
    expect(screen.getByText("No graded activity yet")).toBeInTheDocument();
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });
});

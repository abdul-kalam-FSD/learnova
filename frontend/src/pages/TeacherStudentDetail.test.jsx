import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "../api/axios";
import TeacherStudentDetail from "./TeacherStudentDetail";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

function baseStudent(overrides = {}) {
  return {
    name: "Priya Kumar",
    email: "priya@example.com",
    grade: 8,
    joinedAt: "2026-01-15T00:00:00.000Z",
    xpTotal: 340,
    quizzesPlayed: 12,
    accuracy: 78,
    gamesPlayed: ["MATH_FRACTION_BUILDER", "MATH_RATIO_MATCH"],
    subjects: [],
    recentPerformance: [],
    ...overrides,
  };
}

function renderPage(id = "student-1") {
  return render(
    <MemoryRouter initialEntries={[`/teacher/students/${id}`]}>
      <Routes>
        <Route path="/teacher/students/:id" element={<TeacherStudentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeacherStudentDetail", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading student...")).toBeInTheDocument();
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Student not found" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Student not found")).toBeInTheDocument();
    });
  });

  test("renders profile and stat cards, including games-played as a count", async () => {
    api.get.mockResolvedValue({ data: baseStudent() });
    renderPage("student-1");

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    expect(screen.getByText("340")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // gamesPlayed.length
    expect(api.get).toHaveBeenCalledWith("/teacher/students/student-1");
  });

  test("the back button navigates to the teacher student list", async () => {
    api.get.mockResolvedValue({ data: baseStudent() });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("← Back to Students"));
    expect(navigateMock).toHaveBeenCalledWith("/teacher/students");
  });

  test("shows the mastery empty state when the student's grade has no content", async () => {
    api.get.mockResolvedValue({ data: baseStudent({ subjects: [] }) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No content for this grade yet")).toBeInTheDocument();
    });
  });

  test("renders the nested subject/chapter/concept mastery tree", async () => {
    api.get.mockResolvedValue({
      data: baseStudent({
        subjects: [
          {
            subject_id: "sub1",
            name: "Mathematics",
            chapters: [
              {
                chapter_id: "ch1",
                title: "Fractions & Decimals",
                concepts: [
                  { concept_id: "k1", title: "Equivalent Fractions", mastery_state: "strong" },
                ],
              },
            ],
          },
        ],
      }),
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Mathematics")).toBeInTheDocument();
    });
    expect(screen.getByText("Fractions & Decimals")).toBeInTheDocument();
    expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument();
    expect(screen.getByText("strong")).toBeInTheDocument();
  });

  test("shows the recent-performance empty state when there are no sessions", async () => {
    api.get.mockResolvedValue({ data: baseStudent({ recentPerformance: [] }) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No sessions yet")).toBeInTheDocument();
    });
  });

  test("renders recent performance sessions", async () => {
    api.get.mockResolvedValue({
      data: baseStudent({
        recentPerformance: [
          {
            sessionId: "sess1",
            title: "Fraction Builder",
            date: "2026-02-01T00:00:00.000Z",
            correctCount: 4,
            totalQuestions: 5,
            xpAwarded: 40,
            accuracy: 80,
          },
        ],
      }),
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Fraction Builder")).toBeInTheDocument();
    });
  });
});

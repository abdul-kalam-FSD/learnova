import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "../api/axios";
import AdminStudentDetail from "./AdminStudentDetail";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

const STUDENT = {
  name: "Priya Kumar",
  email: "priya@example.com",
  grade: 8,
  joinedAt: "2026-01-15T00:00:00.000Z",
  xpTotal: 340,
  quizzesPlayed: 12,
  accuracy: 78,
  recentQuizzes: [
    {
      sessionId: "s1",
      title: "Fraction Builder",
      date: "2026-02-01T00:00:00.000Z",
      correctCount: 4,
      totalQuestions: 5,
      xpAwarded: 40,
      accuracy: 80,
    },
  ],
};

function renderPage(id = "student-1") {
  return render(
    <MemoryRouter initialEntries={[`/admin/students/${id}`]}>
      <Routes>
        <Route path="/admin/students/:id" element={<AdminStudentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminStudentDetail", () => {
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

  test("renders student profile, stats, and recent sessions on success", async () => {
    api.get.mockResolvedValue({ data: STUDENT });
    renderPage("student-1");

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    expect(screen.getByText("priya@example.com")).toBeInTheDocument();
    expect(screen.getByText("340")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("Fraction Builder")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/admin/students/student-1");
  });

  test("shows an empty state when the student has no recent sessions", async () => {
    api.get.mockResolvedValue({ data: { ...STUDENT, recentQuizzes: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No sessions yet")).toBeInTheDocument();
    });
  });

  test("the back button navigates to the student list", async () => {
    api.get.mockResolvedValue({ data: STUDENT });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("← Back to Students"));
    expect(navigateMock).toHaveBeenCalledWith("/admin/students");
  });
});

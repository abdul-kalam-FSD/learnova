import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import TeacherStudents from "./TeacherStudents";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

function page(students, overrides = {}) {
  return {
    students,
    total: students.length,
    page: 1,
    totalPages: 1,
    ...overrides,
  };
}

const STUDENTS = [
  {
    id: "s1",
    name: "Priya Kumar",
    grade: 8,
    gamesCompleted: 12,
    overallMastery: { masteredPercent: 65 },
  },
  {
    id: "s2",
    name: "Arjun Rao",
    grade: 8,
    gamesCompleted: 5,
    overallMastery: { masteredPercent: 30 },
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherStudents />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeacherStudents", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading students...")).toBeInTheDocument();
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load students" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load students")).toBeInTheDocument();
    });
  });

  test("renders the student list with mastery/games-completed subtitle and total count", async () => {
    api.get.mockResolvedValue({ data: page(STUDENTS) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    expect(screen.getByText("Grade 8 · 12 games completed · 65% mastered")).toBeInTheDocument();
    expect(screen.getByText("2 students")).toBeInTheDocument();
  });

  test("shows an empty state when no students match", async () => {
    api.get.mockResolvedValue({ data: page([], { total: 0 }) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No students found")).toBeInTheDocument();
    });
  });

  test("clicking a student row navigates to their teacher-side detail page", async () => {
    api.get.mockResolvedValue({ data: page(STUDENTS) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Priya Kumar"));
    expect(navigateMock).toHaveBeenCalledWith("/teacher/students/s1");
  });

  test("changing the grade filter re-fetches with the grade param and resets to page 1", async () => {
    api.get.mockResolvedValue({ data: page(STUDENTS) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    api.get.mockClear();
    api.get.mockResolvedValue({ data: page(STUDENTS) });

    fireEvent.change(screen.getByDisplayValue("All grades"), { target: { value: "8" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/teacher/students",
        expect.objectContaining({ params: expect.objectContaining({ grade: "8", page: 1 }) }),
      );
    });
  });

  test("typing in search debounces before triggering a request", async () => {
    api.get.mockResolvedValue({ data: page(STUDENTS) });
    renderPage();

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1)); // initial fetch on mount
    api.get.mockClear();
    api.get.mockResolvedValue({ data: page(STUDENTS) });

    fireEvent.change(screen.getByPlaceholderText("Search by name or email"), {
      target: { value: "Priya" },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(api.get).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(
          "/teacher/students",
          expect.objectContaining({ params: expect.objectContaining({ search: "Priya" }) }),
        );
      },
      { timeout: 1000 },
    );
  });

  test("pagination: Next is disabled on the last page, Prev is disabled on the first", async () => {
    api.get.mockResolvedValue({ data: page(STUDENTS, { totalPages: 2, page: 1 }) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    expect(screen.getByText("← Prev")).toBeDisabled();
    expect(screen.getByText("Next →")).not.toBeDisabled();
  });

  test("clicking Next re-fetches page 2", async () => {
    api.get.mockResolvedValue({ data: page(STUDENTS, { totalPages: 2, page: 1 }) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    api.get.mockClear();
    api.get.mockResolvedValue({ data: page(STUDENTS, { totalPages: 2, page: 2 }) });

    fireEvent.click(screen.getByText("Next →"));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/teacher/students",
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
      );
    });
  });
});

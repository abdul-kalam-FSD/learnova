import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "../api/axios";
import AdminTeacherStudents from "./AdminTeacherStudents";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const TEACHER = { id: "t1", name: "Adhil", email: "adhil@example.com", status: "active" };

function student(i, overrides = {}) {
  return {
    id: `s${i}`,
    name: `Student ${i}`,
    email: `s${i}@example.com`,
    grade: 6,
    xpTotal: i * 10,
    streakCount: i,
    lastActiveAt: null,
    section: { id: "sec1", name: "6-A" },
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/teachers/t1/students"]}>
      <Routes>
        <Route path="/admin/teachers/:id/students" element={<AdminTeacherStudents />} />
        <Route path="/admin/students/:id" element={<p>student detail route</p>} />
        <Route path="/admin/staff" element={<p>staff route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminTeacherStudents", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading students...")).toBeInTheDocument();
  });

  test("requests the roster for the teacher id in the URL", async () => {
    api.get.mockResolvedValue({ data: { teacher: TEACHER, total: 0, students: [] } });
    renderPage();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/admin/teachers/t1/students"));
  });

  test("renders the teacher's name, the API total and one row per student", async () => {
    const students = [student(1), student(2, { grade: 7, section: null })];
    api.get.mockResolvedValue({ data: { teacher: TEACHER, total: students.length, students } });
    renderPage();

    expect(await screen.findByText("Adhil's Students")).toBeInTheDocument();
    expect(screen.getByText("Total Students: 2")).toBeInTheDocument();
    expect(screen.getByText("Student 1")).toBeInTheDocument();
    expect(screen.getByText("Student 2")).toBeInTheDocument();
    // Missing section renders a dash rather than crashing.
    expect(within(screen.getByText("Student 2").closest("tr")).getAllByText("—").length).toBeGreaterThan(0);
  });

  test("empty state for a teacher with zero students (teacher is not hidden)", async () => {
    api.get.mockResolvedValue({ data: { teacher: TEACHER, total: 0, students: [] } });
    renderPage();

    expect(await screen.findByText("Adhil's Students")).toBeInTheDocument();
    expect(screen.getByText("Total Students: 0")).toBeInTheDocument();
    expect(screen.getByText("No students are currently assigned to this teacher.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("shows the API's error message (e.g. 403/404) instead of a table", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Admin access required" } } });
    renderPage();
    expect(await screen.findByText("Admin access required")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("View Details opens the existing admin student detail page", async () => {
    api.get.mockResolvedValue({ data: { teacher: TEACHER, total: 1, students: [student(1)] } });
    renderPage();
    await screen.findByText("Student 1");

    fireEvent.click(screen.getByRole("button", { name: "View Details" }));
    expect(await screen.findByText("student detail route")).toBeInTheDocument();
  });

  test("Back to Staff returns to the staff table", async () => {
    api.get.mockResolvedValue({ data: { teacher: TEACHER, total: 0, students: [] } });
    renderPage();
    await screen.findByText("Adhil's Students");

    fireEvent.click(screen.getByRole("button", { name: /Back to Staff/ }));
    expect(await screen.findByText("staff route")).toBeInTheDocument();
  });
});

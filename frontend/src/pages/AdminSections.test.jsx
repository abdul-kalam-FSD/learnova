import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import AdminSections from "./AdminSections";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const TEACHER_1 = { id: "t1", name: "Mr. Raj", email: "raj@example.com", role: "teacher" };
const TEACHER_2 = { id: "t2", name: "Ms. Kavi", email: "kavi@example.com", role: "teacher" };

const SECTION_1 = {
  _id: "sec1",
  name: "Grade 6 - A",
  grade: 6,
  teacher_id: { _id: "t1", name: "Mr. Raj", email: "raj@example.com" },
  student_ids: [{ _id: "s1", name: "Priya Kumar", email: "priya@example.com", grade: 6 }],
};

const STUDENT_CANDIDATE = { id: "s2", name: "Arun Dev", email: "arun@example.com", role: "student", grade: 6 };

// admin-modal__label elements aren't wired to their input via htmlFor/id,
// so getByLabelText can't find them — resolve by the label text instead,
// same helper used in AdminContent.test.jsx.
function fieldControl(labelText, root = document) {
  const label = within(root).getByText(labelText, {
    exact: false,
    selector: ".admin-modal__label",
  });
  return label.parentElement.querySelector("input, select, textarea");
}

function getModals() {
  return document.querySelectorAll(".admin-modal");
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSections />
    </MemoryRouter>,
  );
}

// Two independent GETs fire on mount (/admin/sections and
// /admin/users?role=teacher), plus a third (/admin/users?role=student)
// only once the roster modal opens — route each by URL rather than by
// call order, since the first two race in parallel.
function mockGet({ sections = [SECTION_1], teachers = [TEACHER_1, TEACHER_2], students = [STUDENT_CANDIDATE] } = {}) {
  api.get.mockImplementation((url, config) => {
    if (url === "/admin/sections") return Promise.resolve({ data: { sections } });
    if (url === "/admin/users" && config?.params?.role === "teacher") {
      return Promise.resolve({ data: { users: teachers } });
    }
    if (url === "/admin/users" && config?.params?.role === "student") {
      return Promise.resolve({ data: { users: students } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminSections", () => {
  test("shows a loading state before sections resolve", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading sections...")).toBeInTheDocument();
  });

  test("shows the API's error message when the sections request fails", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/admin/sections") {
        return Promise.reject({ response: { data: { message: "Failed to load sections" } } });
      }
      return Promise.resolve({ data: { users: [TEACHER_1] } });
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load sections")).toBeInTheDocument();
    });
  });

  test("renders the section table with teacher name and student count", async () => {
    mockGet();
    renderPage();

    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    expect(screen.getByText("Mr. Raj")).toBeInTheDocument();
    expect(screen.getByText("1 section")).toBeInTheDocument();
    const row = screen.getByText("Grade 6 - A").closest("tr");
    expect(within(row).getByText("1")).toBeInTheDocument(); // student count
  });

  test("shows an empty state when there are no sections", async () => {
    mockGet({ sections: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No sections yet")).toBeInTheDocument();
    });
  });

  test("changing the grade filter re-fetches sections with the grade param", async () => {
    mockGet();
    renderPage();
    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    api.get.mockClear();
    mockGet();

    fireEvent.change(screen.getByDisplayValue("All grades"), { target: { value: "6" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/sections", { params: { grade: "6" } });
    });
  });

  test("+ Add Section is disabled when there are no teacher accounts", async () => {
    mockGet({ teachers: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    expect(screen.getByText("No teacher accounts exist yet — create one under Staff before adding a section.")).toBeInTheDocument();
    expect(screen.getByText("+ Add Section")).toBeDisabled();
  });

  test("creating a section: opens create modal with an editable grade select, saves, then reloads", async () => {
    mockGet({ sections: [] });
    api.post.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("No sections yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ Add Section"));

    const modal = getModals()[0];
    expect(within(modal).getByText("Add Section")).toBeInTheDocument();
    // Create mode's grade control is a <select>, editable.
    expect(fieldControl("Grade", modal).tagName).toBe("SELECT");

    fireEvent.change(fieldControl("Name", modal), { target: { value: "Grade 8 - B" } });
    fireEvent.change(fieldControl("Grade", modal), { target: { value: "8" } });
    fireEvent.change(fieldControl("Teacher", modal), { target: { value: "t2" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/sections", {
        name: "Grade 8 - B",
        grade: 8,
        teacher_id: "t2",
      });
    });
    await waitFor(() => expect(screen.queryByText("Add Section")).not.toBeInTheDocument());
  });

  test("editing a section: pre-fills the modal, shows grade as a disabled input, and patches only name/teacher", async () => {
    mockGet();
    api.patch.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Edit"));

    const modal = getModals()[0];
    expect(within(modal).getByText("Edit Section")).toBeInTheDocument();
    const gradeControl = fieldControl("Grade", modal);
    expect(gradeControl.tagName).toBe("INPUT");
    expect(gradeControl).toBeDisabled();
    expect(gradeControl.value).toBe("Grade 6");
    expect(fieldControl("Name", modal).value).toBe("Grade 6 - A");

    fireEvent.change(fieldControl("Name", modal), { target: { value: "Grade 6 - Morning" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/admin/sections/sec1", {
        name: "Grade 6 - Morning",
        teacher_id: "t1",
      });
    });
  });

  test("shows the API error inside the modal when save fails, and keeps it open", async () => {
    mockGet({ sections: [] });
    api.post.mockRejectedValue({ response: { data: { message: "name, grade and teacher_id are required" } } });
    renderPage();

    await waitFor(() => expect(screen.getByText("No sections yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ Add Section"));
    fireEvent.change(fieldControl("Name", getModals()[0]), { target: { value: "Grade 8 - B" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("name, grade and teacher_id are required")).toBeInTheDocument();
    });
    expect(screen.getByText("Add Section")).toBeInTheDocument();
  });

  test("Cancel closes the section modal without calling the API", async () => {
    mockGet({ sections: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText("No sections yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ Add Section"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("Add Section")).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("deleting: cancelling the confirm dialog makes no API call", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    mockGet();
    renderPage();

    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Delete"));
    expect(api.delete).not.toHaveBeenCalled();
  });

  test("deleting: confirming calls the delete API and reloads", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let sectionsCallCount = 0;
    api.get.mockImplementation((url, config) => {
      if (url === "/admin/sections") {
        sectionsCallCount += 1;
        return Promise.resolve({ data: { sections: sectionsCallCount === 1 ? [SECTION_1] : [] } });
      }
      if (config?.params?.role === "teacher") return Promise.resolve({ data: { users: [TEACHER_1] } });
      return Promise.resolve({ data: { users: [] } });
    });
    api.delete.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Delete"));

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "Grade 6 - A"? Students in it will be unassigned. This cannot be undone.',
    );
    expect(api.delete).toHaveBeenCalledWith("/admin/sections/sec1");
    await waitFor(() => expect(screen.getByText("No sections yet")).toBeInTheDocument());
  });

  test("roster: opens with the current student listed and an unassigned same-grade candidate offered", async () => {
    mockGet();
    renderPage();

    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Manage roster"));

    const modal = getModals()[0];
    await waitFor(() => {
      expect(within(modal).getByText("Grade 6 - A — Roster")).toBeInTheDocument();
    });
    expect(within(modal).getByText("Priya Kumar")).toBeInTheDocument();
    await waitFor(() => {
      expect(within(modal).getByText("Arun Dev")).toBeInTheDocument();
    });
    expect(
      api.get,
    ).toHaveBeenCalledWith("/admin/users", { params: { role: "student", grade: 6, limit: 100 } });
  });

  test("roster: adding a candidate calls the API and the returned section replaces local state", async () => {
    mockGet();
    const updatedSection = {
      ...SECTION_1,
      student_ids: [...SECTION_1.student_ids, { _id: "s2", name: "Arun Dev", email: "arun@example.com", grade: 6 }],
    };
    api.post.mockResolvedValue({ data: { section: updatedSection } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Manage roster"));
    const modal = getModals()[0];
    await waitFor(() => expect(within(modal).getByText("Arun Dev")).toBeInTheDocument());

    fireEvent.click(within(modal).getByLabelText("Add to section"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/sections/sec1/students", { studentId: "s2" });
    });
    // Arun now shows as a current member (roster header count updates to 2).
    await waitFor(() => {
      expect(within(modal).getByText("2 students in this section")).toBeInTheDocument();
    });
  });

  test("roster: removing a student calls the API with the section and student ids", async () => {
    mockGet();
    const updatedSection = { ...SECTION_1, student_ids: [] };
    api.delete.mockResolvedValue({ data: { section: updatedSection } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Manage roster"));
    const modal = getModals()[0];
    await waitFor(() => expect(within(modal).getByText("Priya Kumar")).toBeInTheDocument());

    fireEvent.click(within(modal).getByLabelText("Remove from section"));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/admin/sections/sec1/students/s1");
    });
    await waitFor(() => {
      expect(within(modal).getByText("0 students in this section")).toBeInTheDocument();
    });
  });

  test("roster: shows the API error inline when add fails (e.g. student already in another section)", async () => {
    mockGet();
    api.post.mockRejectedValue({
      response: { data: { message: 'Student is already in section "Grade 6 - B". Remove them from it first.' } },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("Grade 6 - A")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Manage roster"));
    const modal = getModals()[0];
    await waitFor(() => expect(within(modal).getByText("Arun Dev")).toBeInTheDocument());

    fireEvent.click(within(modal).getByLabelText("Add to section"));

    await waitFor(() => {
      expect(
        within(modal).getByText('Student is already in section "Grade 6 - B". Remove them from it first.'),
      ).toBeInTheDocument();
    });
  });
});

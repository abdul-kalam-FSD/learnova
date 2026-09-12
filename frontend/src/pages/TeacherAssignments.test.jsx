import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import TeacherAssignments from "./TeacherAssignments";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const ASSIGNMENT_1 = {
  id: "a1",
  conceptTitle: "Equivalent Fractions",
  subject: "Mathematics",
  chapterTitle: "Fractions",
  sectionName: "Grade 6 - A",
  dueDate: null,
  note: "Focus on the visual models we did in class",
  completedCount: 1,
  studentCount: 3,
};

const SECTION = { id: "sec1", name: "Grade 6 - A", grade: 6, studentCount: 3 };

const TREE = [
  {
    id: "sub1",
    name: "Mathematics",
    chapters: [
      {
        id: "ch1",
        title: "Fractions",
        concepts: [{ id: "k1", title: "Equivalent Fractions" }],
      },
    ],
  },
];

const ROSTER = [
  { studentId: "s1", name: "Priya Kumar", status: "completed" },
  { studentId: "s2", name: "Arun Dev", status: "pending" },
];

function fieldControl(labelText, root = document) {
  const label = within(root).getByText(labelText, {
    exact: false,
    selector: ".admin-modal__label",
  });
  return label.parentElement.querySelector("input, select, textarea");
}

function getModal() {
  return document.querySelector(".admin-modal");
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherAssignments />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeacherAssignments", () => {
  test("shows a loading state before assignments resolve", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading assignments...")).toBeInTheDocument();
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load assignments" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load assignments")).toBeInTheDocument();
    });
  });

  test("shows an empty state when there are no assignments", async () => {
    api.get.mockResolvedValue({ data: { assignments: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No missions assigned yet")).toBeInTheDocument();
    });
  });

  test("renders an assignment card with progress, meta and note", async () => {
    api.get.mockResolvedValue({ data: { assignments: [ASSIGNMENT_1] } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    expect(screen.getByText("Mathematics · Fractions · Grade 6 - A")).toBeInTheDocument();
    expect(screen.getByText("1/3 done")).toBeInTheDocument();
    expect(screen.getByText("“Focus on the visual models we did in class”")).toBeInTheDocument();
    expect(screen.getByText("1 assignment")).toBeInTheDocument();
  });

  test("View roster fetches and shows each student's completion status", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/assignments/teacher") return Promise.resolve({ data: { assignments: [ASSIGNMENT_1] } });
      if (url === "/assignments/teacher/a1") return Promise.resolve({ data: { roster: ROSTER } });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("View roster"));

    await waitFor(() => expect(screen.getByText("Priya Kumar")).toBeInTheDocument());
    expect(screen.getByText("✓ Completed")).toBeInTheDocument();
    expect(screen.getByText("Arun Dev")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Hide roster")).toBeInTheDocument();
  });

  test("cancelling: declining the confirm dialog makes no API call", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    api.get.mockResolvedValue({ data: { assignments: [ASSIGNMENT_1] } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Cancel assignment"));
    expect(api.delete).not.toHaveBeenCalled();
  });

  test("cancelling: confirming deletes the assignment and removes it from the list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.get.mockResolvedValue({ data: { assignments: [ASSIGNMENT_1] } });
    api.delete.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Cancel assignment"));

    expect(api.delete).toHaveBeenCalledWith("/assignments/a1");
    await waitFor(() => {
      expect(screen.getByText("No missions assigned yet")).toBeInTheDocument();
    });
  });

  test("cancelling: shows an error and keeps the assignment when the delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.get.mockResolvedValue({ data: { assignments: [ASSIGNMENT_1] } });
    api.delete.mockRejectedValue({ response: { data: { message: "Cannot cancel a completed assignment" } } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Cancel assignment"));

    await waitFor(() => {
      expect(screen.getByText("Cannot cancel a completed assignment")).toBeInTheDocument();
    });
    expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument();
  });

  test("New Assignment modal: shows an empty state when the teacher has no sections", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/assignments/teacher") return Promise.resolve({ data: { assignments: [] } });
      if (url === "/teacher/sections") return Promise.resolve({ data: { sections: [] } });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("No missions assigned yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ New Assignment"));

    await waitFor(() => {
      expect(within(getModal()).getByText("No sections yet")).toBeInTheDocument();
    });
  });

  test("New Assignment modal: cascades section -> subject -> chapter -> concept, then submits", async () => {
    api.get.mockImplementation((url, config) => {
      if (url === "/assignments/teacher") return Promise.resolve({ data: { assignments: [] } });
      if (url === "/teacher/sections") return Promise.resolve({ data: { sections: [SECTION] } });
      if (url === "/teacher/content-tree") {
        expect(config.params).toEqual({ grade: 6 });
        return Promise.resolve({ data: { subjects: TREE } });
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    api.post.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("No missions assigned yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ New Assignment"));
    const modal = getModal();
    await waitFor(() => expect(within(modal).getByText(/Choose a section/)).toBeInTheDocument());

    fireEvent.change(fieldControl("Class / Section", modal), { target: { value: "sec1" } });
    await waitFor(() => expect(within(modal).getByText("Mathematics")).toBeInTheDocument());

    fireEvent.change(fieldControl("Subject", modal), { target: { value: "sub1" } });
    await waitFor(() => expect(within(modal).getByText("Fractions")).toBeInTheDocument());

    fireEvent.change(fieldControl("Chapter", modal), { target: { value: "ch1" } });
    await waitFor(() => expect(within(modal).getByText("Equivalent Fractions")).toBeInTheDocument());

    fireEvent.change(fieldControl("Concept", modal), { target: { value: "k1" } });
    fireEvent.change(fieldControl("Note for students (optional)", modal), {
      target: { value: "Take your time" },
    });

    fireEvent.click(screen.getByText("Assign to Class"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/assignments", {
        conceptId: "k1",
        sectionId: "sec1",
        note: "Take your time",
        dueDate: undefined,
      });
    });
  });

  test("New Assignment modal: submitting reloads the list and closes the modal", async () => {
    let assignmentsCallCount = 0;
    api.get.mockImplementation((url) => {
      if (url === "/assignments/teacher") {
        assignmentsCallCount += 1;
        return Promise.resolve({
          data: { assignments: assignmentsCallCount === 1 ? [] : [ASSIGNMENT_1] },
        });
      }
      if (url === "/teacher/sections") return Promise.resolve({ data: { sections: [SECTION] } });
      if (url === "/teacher/content-tree") return Promise.resolve({ data: { subjects: TREE } });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    api.post.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("No missions assigned yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ New Assignment"));
    const modal = getModal();
    await waitFor(() => expect(within(modal).getByText(/Choose a section/)).toBeInTheDocument());

    fireEvent.change(fieldControl("Class / Section", modal), { target: { value: "sec1" } });
    await waitFor(() => expect(within(modal).getByText("Mathematics")).toBeInTheDocument());
    fireEvent.change(fieldControl("Subject", modal), { target: { value: "sub1" } });
    await waitFor(() => expect(within(modal).getByText("Fractions")).toBeInTheDocument());
    fireEvent.change(fieldControl("Chapter", modal), { target: { value: "ch1" } });
    await waitFor(() => expect(within(modal).getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.change(fieldControl("Concept", modal), { target: { value: "k1" } });

    fireEvent.click(screen.getByText("Assign to Class"));

    await waitFor(() => expect(document.querySelector(".admin-modal")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
  });

  test("New Assignment modal: shows the submit error and keeps the modal open on failure", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/assignments/teacher") return Promise.resolve({ data: { assignments: [] } });
      if (url === "/teacher/sections") return Promise.resolve({ data: { sections: [SECTION] } });
      if (url === "/teacher/content-tree") return Promise.resolve({ data: { subjects: TREE } });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    api.post.mockRejectedValue({ response: { data: { message: "conceptId and sectionId are required" } } });
    renderPage();

    await waitFor(() => expect(screen.getByText("No missions assigned yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ New Assignment"));
    const modal = getModal();
    await waitFor(() => expect(within(modal).getByText(/Choose a section/)).toBeInTheDocument());
    fireEvent.change(fieldControl("Class / Section", modal), { target: { value: "sec1" } });
    await waitFor(() => expect(within(modal).getByText("Mathematics")).toBeInTheDocument());
    fireEvent.change(fieldControl("Subject", modal), { target: { value: "sub1" } });
    await waitFor(() => expect(within(modal).getByText("Fractions")).toBeInTheDocument());
    fireEvent.change(fieldControl("Chapter", modal), { target: { value: "ch1" } });
    await waitFor(() => expect(within(modal).getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.change(fieldControl("Concept", modal), { target: { value: "k1" } });

    fireEvent.click(screen.getByText("Assign to Class"));

    await waitFor(() => {
      expect(within(modal).getByText("conceptId and sectionId are required")).toBeInTheDocument();
    });
    expect(getModal()).toBeInTheDocument();
  });

  test("New Assignment modal: Cancel closes without calling the API", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/assignments/teacher") return Promise.resolve({ data: { assignments: [] } });
      if (url === "/teacher/sections") return Promise.resolve({ data: { sections: [SECTION] } });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("No missions assigned yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ New Assignment"));
    await waitFor(() => expect(getModal()).toBeInTheDocument());

    fireEvent.click(within(getModal()).getByText("Cancel"));
    expect(document.querySelector(".admin-modal")).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

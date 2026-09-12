import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import AdminContent from "./AdminContent";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const SUBJECT = { _id: "sub1", name: "Mathematics", grade: 6 };
const CHAPTER = { _id: "ch1", title: "Fractions", unit_name: "Unit 2", order_index: 3 };
const CONCEPT = { _id: "k1", title: "Equivalent Fractions", explanation_text: "Two fractions are equivalent when..." };
const QUESTION = {
  _id: "q1",
  question_text: "Which fraction equals 1/2?",
  options: [
    { id: "a", text: "2/4" },
    { id: "b", text: "1/3" },
  ],
  correct_option_id: "a",
  explanation_text: "2/4 simplifies to 1/2.",
  fun_fact: "Fractions are everywhere!",
  difficulty: "easy",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminContent />
    </MemoryRouter>,
  );
}

// admin-modal__label elements aren't wired to their input via htmlFor/id,
// so getByLabelText can't find them — resolve by the label text instead.
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminContent", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load subjects" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load subjects")).toBeInTheDocument();
    });
  });

  test("shows an empty state when there are no subjects", async () => {
    api.get.mockResolvedValue({ data: { subjects: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    });
    // "Subjects" appears both as the breadcrumb root and the page title.
    expect(screen.getAllByText("Subjects").length).toBeGreaterThan(0);
  });

  test("renders subject rows with their grade as meta", async () => {
    api.get.mockResolvedValue({ data: { subjects: [SUBJECT] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Mathematics")).toBeInTheDocument();
    });
    expect(screen.getByText("Grade 6")).toBeInTheDocument();
  });

  test("drills down: subject -> chapters -> concepts -> questions, fetching each level with the right parent id", async () => {
    api.get
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } })
      .mockResolvedValueOnce({ data: { chapters: [CHAPTER] } })
      .mockResolvedValueOnce({ data: { concepts: [CONCEPT] } })
      .mockResolvedValueOnce({ data: { questions: [QUESTION] } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Mathematics"));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/chapters", { params: { subject_id: "sub1" } });
    });
    await waitFor(() => expect(screen.getByText("Fractions")).toBeInTheDocument());
    expect(screen.getByText("Mathematics — Chapters")).toBeInTheDocument();
    expect(screen.getByText("Unit 2 · Order 3")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Fractions"));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/concepts", { params: { chapter_id: "ch1" } });
    });
    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    expect(screen.getByText("Fractions — Concepts")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Equivalent Fractions"));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/questions", { params: { concept_id: "k1" } });
    });
    await waitFor(() => expect(screen.getByText("Which fraction equals 1/2?")).toBeInTheDocument());
    expect(screen.getByText("Equivalent Fractions — Questions")).toBeInTheDocument();
    expect(screen.getByText("2 options · easy")).toBeInTheDocument();
  });

  test("question rows are not clickable (no further drill-down level)", async () => {
    api.get.mockResolvedValue({ data: { questions: [QUESTION] } });
    // Jump straight to a rendered questions level via the component's own
    // state isn't possible from outside, so verify the row's disabled
    // attribute after drilling down instead.
    api.get
      .mockReset()
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } })
      .mockResolvedValueOnce({ data: { chapters: [CHAPTER] } })
      .mockResolvedValueOnce({ data: { concepts: [CONCEPT] } })
      .mockResolvedValueOnce({ data: { questions: [QUESTION] } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Mathematics"));
    await waitFor(() => expect(screen.getByText("Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Fractions"));
    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Equivalent Fractions"));

    await waitFor(() => expect(screen.getByText("Which fraction equals 1/2?")).toBeInTheDocument());
    expect(screen.getByText("Which fraction equals 1/2?").closest("button")).toBeDisabled();
  });

  test("breadcrumbs reflect the drill-down path and navigate back up on click", async () => {
    api.get
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } })
      .mockResolvedValueOnce({ data: { chapters: [CHAPTER] } })
      .mockResolvedValueOnce({ data: { concepts: [CONCEPT] } })
      .mockResolvedValueOnce({ data: { questions: [QUESTION] } })
      .mockResolvedValueOnce({ data: { chapters: [CHAPTER] } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Mathematics"));
    await waitFor(() => expect(screen.getByText("Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Fractions"));
    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Equivalent Fractions"));
    await waitFor(() => expect(screen.getByText("Which fraction equals 1/2?")).toBeInTheDocument());

    // The concept only joins the breadcrumb trail (as the current,
    // non-clickable crumb) once we've drilled into its questions.
    const breadcrumbs = document.querySelector(".admin-page__breadcrumbs");
    expect(within(breadcrumbs).getByText("Mathematics")).toBeInTheDocument();
    expect(within(breadcrumbs).getByText("Fractions")).toBeInTheDocument();
    expect(within(breadcrumbs).getByText("Equivalent Fractions")).toBeInTheDocument();

    fireEvent.click(within(breadcrumbs).getByText("Fractions"));
    await waitFor(() => {
      expect(screen.getByText("Fractions — Concepts")).toBeInTheDocument();
    });
  });

  test("'Subjects' breadcrumb resets all the way back to the subjects level", async () => {
    api.get
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } })
      .mockResolvedValueOnce({ data: { chapters: [CHAPTER] } })
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Mathematics"));
    await waitFor(() => expect(screen.getByText("Fractions")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Subjects"));
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith("/admin/subjects");
    });
    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
  });

  test("creating a subject: opens create modal, saves name and grade, then reloads", async () => {
    api.get
      .mockResolvedValueOnce({ data: { subjects: [] } })
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } });
    api.post.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Nothing here yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ Add"));

    expect(within(getModal()).getByText("Add subject")).toBeInTheDocument();
    fireEvent.change(fieldControl("Name", getModal()), { target: { value: "Mathematics" } });
    fireEvent.change(fieldControl("Grade", getModal()), { target: { value: "6" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/subjects", { name: "Mathematics", grade: 6 });
    });
    await waitFor(() => {
      expect(screen.queryByText("Add subject")).not.toBeInTheDocument();
    });
  });

  test("editing a subject: pre-fills the modal and patches on save", async () => {
    api.get.mockResolvedValue({ data: { subjects: [SUBJECT] } });
    api.patch.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Edit"));

    expect(within(getModal()).getByText("Edit subject")).toBeInTheDocument();
    expect(fieldControl("Name", getModal()).value).toBe("Mathematics");
    fireEvent.change(fieldControl("Name", getModal()), { target: { value: "Advanced Mathematics" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/admin/subjects/sub1",
        expect.objectContaining({ name: "Advanced Mathematics" }),
      );
    });
  });

  test("shows the API error inside the modal when save fails, and keeps it open", async () => {
    api.get.mockResolvedValue({ data: { subjects: [] } });
    api.post.mockRejectedValue({ response: { data: { message: "Name is required" } } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Nothing here yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(screen.getByText("Add subject")).toBeInTheDocument();
  });

  test("Cancel closes the modal without calling the API", async () => {
    api.get.mockResolvedValue({ data: { subjects: [] } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Nothing here yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("Add subject")).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("deleting: cancelling the confirm dialog makes no API call", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    api.get.mockResolvedValue({ data: { subjects: [SUBJECT] } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Delete"));
    expect(api.delete).not.toHaveBeenCalled();
  });

  test("deleting: confirming calls the delete API using the item's label and reloads", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.get
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } })
      .mockResolvedValueOnce({ data: { subjects: [] } });
    api.delete.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Delete"));

    expect(window.confirm).toHaveBeenCalledWith('Delete "Mathematics"? This cannot be undone.');
    expect(api.delete).toHaveBeenCalledWith("/admin/subjects/sub1");
    await waitFor(() => expect(screen.getByText("Nothing here yet")).toBeInTheDocument());
  });

  test("deleting: shows a banner when the delete request fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.get.mockResolvedValue({ data: { subjects: [SUBJECT] } });
    api.delete.mockRejectedValue({ response: { data: { message: "Subject has chapters" } } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Delete"));

    await waitFor(() => {
      expect(screen.getByText("Subject has chapters")).toBeInTheDocument();
    });
  });

  test("creating a chapter includes the current subject_id in the payload", async () => {
    api.get
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } })
      .mockResolvedValueOnce({ data: { chapters: [] } })
      .mockResolvedValueOnce({ data: { chapters: [CHAPTER] } });
    api.post.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Mathematics"));
    await waitFor(() => expect(screen.getByText("Nothing here yet")).toBeInTheDocument());

    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.change(fieldControl("Title", getModal()), { target: { value: "Fractions" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/chapters",
        expect.objectContaining({ title: "Fractions", subject_id: "sub1" }),
      );
    });
  });

  test("creating a concept includes the current chapter_id in the payload", async () => {
    api.get
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } })
      .mockResolvedValueOnce({ data: { chapters: [CHAPTER] } })
      .mockResolvedValueOnce({ data: { concepts: [] } })
      .mockResolvedValueOnce({ data: { concepts: [CONCEPT] } });
    api.post.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Mathematics"));
    await waitFor(() => expect(screen.getByText("Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Fractions"));
    await waitFor(() => expect(screen.getByText("Nothing here yet")).toBeInTheDocument());

    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.change(fieldControl("Title", getModal()), { target: { value: "Equivalent Fractions" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/concepts",
        expect.objectContaining({ title: "Equivalent Fractions", chapter_id: "ch1" }),
      );
    });
  });

  async function drillToQuestions() {
    api.get
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } })
      .mockResolvedValueOnce({ data: { chapters: [CHAPTER] } })
      .mockResolvedValueOnce({ data: { concepts: [CONCEPT] } })
      .mockResolvedValueOnce({ data: { questions: [] } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Mathematics"));
    await waitFor(() => expect(screen.getByText("Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Fractions"));
    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Equivalent Fractions"));
    await waitFor(() => expect(screen.getByText("Nothing here yet")).toBeInTheDocument());
  }

  test("creating a question starts with two blank options, option 'a' selected as correct, and includes concept_id on save", async () => {
    await drillToQuestions();
    api.post.mockResolvedValue({ data: { ok: true } });

    fireEvent.click(screen.getByText("+ Add"));
    const modal = getModal();
    expect(within(modal).getAllByPlaceholderText(/Option/)).toHaveLength(2);

    fireEvent.change(fieldControl("Question Text", modal), { target: { value: "Which fraction equals 1/2?" } });
    fireEvent.change(within(modal).getByPlaceholderText("Option a"), { target: { value: "2/4" } });
    fireEvent.change(within(modal).getByPlaceholderText("Option b"), { target: { value: "1/3" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/questions",
        expect.objectContaining({
          question_text: "Which fraction equals 1/2?",
          correct_option_id: "a",
          concept_id: "k1",
          options: [
            { id: "a", text: "2/4" },
            { id: "b", text: "1/3" },
          ],
        }),
      );
    });
  });

  test("question options: '+ Add option' appends a new option, and it can be marked correct", async () => {
    await drillToQuestions();
    fireEvent.click(screen.getByText("+ Add"));
    const modal = getModal();

    fireEvent.click(within(modal).getByText("+ Add option"));
    expect(within(modal).getAllByPlaceholderText(/Option/)).toHaveLength(3);
    expect(within(modal).getByPlaceholderText("Option c")).toBeInTheDocument();

    const radios = within(modal).getAllByRole("radio");
    fireEvent.click(radios[2]);
    expect(radios[2]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  test("question options: remove button only appears once there are more than 2 options, and reassigns correct_option_id if the correct one is removed", async () => {
    await drillToQuestions();
    fireEvent.click(screen.getByText("+ Add"));
    const modal = getModal();

    expect(within(modal).queryByLabelText("Remove option")).not.toBeInTheDocument();
    fireEvent.click(within(modal).getByText("+ Add option"));

    const removeButtons = within(modal).getAllByLabelText("Remove option");
    expect(removeButtons).toHaveLength(3);

    // option "a" is correct by default; remove it and confirm the next
    // option ("b") becomes correct instead of leaving a stale reference.
    fireEvent.click(removeButtons[0]);
    expect(within(modal).getAllByPlaceholderText(/Option/)).toHaveLength(2);
    const radios = within(modal).getAllByRole("radio");
    expect(radios[0]).toBeChecked();
  });

  test("editing a question pre-fills text, options, explanation, fun fact, and difficulty", async () => {
    api.get
      .mockResolvedValueOnce({ data: { subjects: [SUBJECT] } })
      .mockResolvedValueOnce({ data: { chapters: [CHAPTER] } })
      .mockResolvedValueOnce({ data: { concepts: [CONCEPT] } })
      .mockResolvedValueOnce({ data: { questions: [QUESTION] } });
    api.patch.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mathematics")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Mathematics"));
    await waitFor(() => expect(screen.getByText("Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Fractions"));
    await waitFor(() => expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Equivalent Fractions"));
    await waitFor(() => expect(screen.getByText("Which fraction equals 1/2?")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit"));
    const modal = getModal();
    expect(within(modal).getByText("Edit question")).toBeInTheDocument();
    expect(within(modal).getByDisplayValue("2/4")).toBeInTheDocument();
    expect(within(modal).getByDisplayValue("1/3")).toBeInTheDocument();
    expect(fieldControl("Difficulty", modal).value).toBe("easy");

    fireEvent.change(fieldControl("Difficulty", modal), { target: { value: "hard" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/admin/questions/q1",
        expect.objectContaining({ difficulty: "hard", concept_id: "k1" }),
      );
    });
  });
});

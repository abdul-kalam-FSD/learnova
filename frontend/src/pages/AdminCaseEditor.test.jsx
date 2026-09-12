import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "../api/axios";
import AdminCaseEditor from "./AdminCaseEditor";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

const SUBJECT = { _id: "sub1", name: "Biology", grade: 10 };
const CHAPTER = { _id: "ch1", title: "The Human Eye" };
const CONCEPT_A = { _id: "k1", title: "Retina" };
const CONCEPT_B = { _id: "k2", title: "Cornea" };

const EXISTING_CASE = {
  title: "The Case of the Blurry Vision",
  intro_text: "A patient reports blurry vision.",
  mission_text: "Diagnose the issue.",
  clue_count: 4,
  dragdrop_task: { prompt: "Order the steps", clue_text: "Think about light path", items: ["Cornea", "Lens", "Retina"] },
  matching_task: {
    prompt: "Match structure to role",
    clue_text: "Recall function",
    pairs: [{ structure: "Retina", role: "Detects light" }],
  },
  theory_prompt: "What detects light?",
  theory_options: [
    { text: "Retina", correct: true, feedback: "Correct!" },
    { text: "Cornea", correct: false, feedback: "Not quite." },
  ],
  experiment: {
    prompt: "Adjust the light level",
    clue_text: "Watch the pupil",
    variable_name: "Light intensity",
    min: 0,
    max: 100,
    unit: "lux",
    threshold: 50,
    good_outcome_text: "Pupil constricts correctly.",
    bad_outcome_text: "Pupil doesn't respond.",
  },
  concept_ids: [{ _id: "k1", title: "Retina" }],
};

// admin-modal__label elements aren't wired to their input via htmlFor/id,
// so getByLabelText can't find them — resolve by the label text instead.
function fieldControl(labelText, root = document) {
  const label = within(root).getByText(labelText, {
    exact: false,
    selector: ".admin-modal__label",
  });
  return label.parentElement.querySelector("input, select, textarea");
}

function renderNew() {
  api.get.mockResolvedValue({ data: { subjects: [SUBJECT] } });
  return render(
    <MemoryRouter initialEntries={["/admin/cases/new"]}>
      <Routes>
        <Route path="/admin/cases/new" element={<AdminCaseEditor />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderEdit(caseData = EXISTING_CASE) {
  api.get.mockImplementation((url) => {
    if (url === "/admin/subjects") return Promise.resolve({ data: { subjects: [SUBJECT] } });
    if (url === "/admin/cases/c1") return Promise.resolve({ data: { case: caseData } });
    return Promise.resolve({ data: {} });
  });
  return render(
    <MemoryRouter initialEntries={["/admin/cases/c1"]}>
      <Routes>
        <Route path="/admin/cases/:id" element={<AdminCaseEditor />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminCaseEditor", () => {
  test("new case: shows the empty form immediately (no loading state) with 'New Case' title", async () => {
    renderNew();
    expect(screen.getByText("New Case")).toBeInTheDocument();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/subjects");
    });
  });

  test("edit case: shows a loading state, then fetches and populates the form", async () => {
    renderEdit();
    expect(screen.getByText("Loading case...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Case of the Blurry Vision")).toBeInTheDocument();
    });
    expect(screen.getByText("Edit Case")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/admin/cases/c1");
    expect(screen.getByDisplayValue("A patient reports blurry vision.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4")).toBeInTheDocument();
  });

  test("edit case: shows the API's error message when the case fails to load", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/admin/subjects") return Promise.resolve({ data: { subjects: [] } });
      if (url === "/admin/cases/c1")
        return Promise.reject({ response: { data: { message: "Case not found" } } });
      return Promise.resolve({ data: {} });
    });
    render(
      <MemoryRouter initialEntries={["/admin/cases/c1"]}>
        <Routes>
          <Route path="/admin/cases/:id" element={<AdminCaseEditor />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Case not found")).toBeInTheDocument();
    });
  });

  test("edit case: pre-selects existing concepts and pre-checks theory/experiment toggles", async () => {
    renderEdit();
    await waitFor(() => {
      expect(screen.getByDisplayValue("The Case of the Blurry Vision")).toBeInTheDocument();
    });

    expect(screen.getByText("Retina")).toBeInTheDocument();
    expect(screen.getByLabelText("Include Theory step (optional)")).toBeChecked();
    expect(screen.getByLabelText("Include Experiment step (optional)")).toBeChecked();
    expect(screen.getByDisplayValue("What detects light?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Light intensity")).toBeInTheDocument();
  });

  test("edit case: theory/experiment toggles start unchecked and sections hidden when the case has neither", async () => {
    renderEdit({
      ...EXISTING_CASE,
      theory_prompt: "",
      theory_options: [],
      experiment: { ...EXISTING_CASE.experiment, variable_name: "" },
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue("The Case of the Blurry Vision")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Include Theory step (optional)")).not.toBeChecked();
    expect(screen.getByLabelText("Include Experiment step (optional)")).not.toBeChecked();
    expect(screen.queryByText("Theory Prompt")).not.toBeInTheDocument();
    expect(screen.queryByText("Variable Name")).not.toBeInTheDocument();
  });

  test("concept picker: choosing a subject fetches its chapters; choosing a chapter fetches its concepts", async () => {
    api.get.mockImplementation((url, config) => {
      if (url === "/admin/subjects") return Promise.resolve({ data: { subjects: [SUBJECT] } });
      if (url === "/admin/chapters" && config?.params?.subject_id === "sub1")
        return Promise.resolve({ data: { chapters: [CHAPTER] } });
      if (url === "/admin/concepts" && config?.params?.chapter_id === "ch1")
        return Promise.resolve({ data: { concepts: [CONCEPT_A, CONCEPT_B] } });
      return Promise.resolve({ data: {} });
    });
    render(
      <MemoryRouter initialEntries={["/admin/cases/new"]}>
        <Routes>
          <Route path="/admin/cases/new" element={<AdminCaseEditor />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByText("Choose a subject...").closest("select"), {
      target: { value: "sub1" },
    });

    await waitFor(() => {
      expect(screen.getByText("The Human Eye")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByText("Choose a chapter...").closest("select"), {
      target: { value: "ch1" },
    });

    await waitFor(() => {
      expect(screen.getByText("+ Retina")).toBeInTheDocument();
    });
    expect(screen.getByText("+ Cornea")).toBeInTheDocument();
  });

  test("concept picker: clearing the subject clears the chapter dropdown and disables it", async () => {
    api.get.mockImplementation((url, config) => {
      if (url === "/admin/subjects") return Promise.resolve({ data: { subjects: [SUBJECT] } });
      if (url === "/admin/chapters" && config?.params?.subject_id === "sub1")
        return Promise.resolve({ data: { chapters: [CHAPTER] } });
      return Promise.resolve({ data: {} });
    });
    render(
      <MemoryRouter initialEntries={["/admin/cases/new"]}>
        <Routes>
          <Route path="/admin/cases/new" element={<AdminCaseEditor />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());
    const subjectSelect = screen.getByText("Choose a subject...").closest("select");
    fireEvent.change(subjectSelect, { target: { value: "sub1" } });
    await waitFor(() => expect(screen.getByText("The Human Eye")).toBeInTheDocument());

    fireEvent.change(subjectSelect, { target: { value: "" } });
    const chapterSelect = screen.getByText("Choose a chapter...").closest("select");
    expect(chapterSelect).toBeDisabled();
    expect(screen.queryByText("The Human Eye")).not.toBeInTheDocument();
  });

  test("concepts: adding a concept shows it as a removable badge and disables its add button; removing takes it out", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/admin/subjects") return Promise.resolve({ data: { subjects: [SUBJECT] } });
      if (url === "/admin/chapters") return Promise.resolve({ data: { chapters: [CHAPTER] } });
      if (url === "/admin/concepts") return Promise.resolve({ data: { concepts: [CONCEPT_A] } });
      return Promise.resolve({ data: {} });
    });
    render(
      <MemoryRouter initialEntries={["/admin/cases/new"]}>
        <Routes>
          <Route path="/admin/cases/new" element={<AdminCaseEditor />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());
    fireEvent.change(screen.getByText("Choose a subject...").closest("select"), {
      target: { value: "sub1" },
    });
    await waitFor(() => expect(screen.getByText("The Human Eye")).toBeInTheDocument());
    fireEvent.change(screen.getByText("Choose a chapter...").closest("select"), {
      target: { value: "ch1" },
    });
    await waitFor(() => expect(screen.getByText("+ Retina")).toBeInTheDocument());

    expect(screen.getByText("No concepts selected yet")).toBeInTheDocument();
    fireEvent.click(screen.getByText("+ Retina"));

    expect(screen.queryByText("No concepts selected yet")).not.toBeInTheDocument();
    expect(screen.getByText("+ Retina")).toBeDisabled();

    const badge = screen.getByText("Retina", { selector: ".role-badge" }).closest("span");
    fireEvent.click(within(badge).getByText("✕"));

    expect(screen.getByText("No concepts selected yet")).toBeInTheDocument();
  });

  test("drag & drop items: '+ Add item' appends a blank item; remove button only shows past the first item", async () => {
    renderNew();
    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());

    expect(screen.getAllByPlaceholderText(/Item \d/)).toHaveLength(1);
    expect(screen.queryByText("✕")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("+ Add item"));
    expect(screen.getAllByPlaceholderText(/Item \d/)).toHaveLength(2);

    const removeButtons = document
      .querySelectorAll(".admin-modal__remove-option");
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  test("matching pairs: '+ Add pair' appends a blank pair; single pair has no remove button", async () => {
    renderNew();
    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());

    expect(screen.getAllByPlaceholderText("Structure")).toHaveLength(1);
    fireEvent.click(screen.getByText("+ Add pair"));
    expect(screen.getAllByPlaceholderText("Structure")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("Role")).toHaveLength(2);
  });

  test("theory step: hidden by default, shown after checking the toggle; can add/select/remove options", async () => {
    renderNew();
    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());

    expect(screen.queryByText("Theory Prompt")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Include Theory step (optional)"));
    expect(screen.getByText("Theory Prompt")).toBeInTheDocument();

    fireEvent.click(screen.getByText("+ Add option"));
    fireEvent.click(screen.getByText("+ Add option"));
    const radios = screen.getAllByRole("radio").filter((r) => r.name === "theory_correct");
    expect(radios).toHaveLength(2);

    fireEvent.click(radios[1]);
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();

    const removeButtons = screen.getAllByText("✕").filter((b) => b.tagName === "BUTTON");
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(screen.getAllByRole("radio").filter((r) => r.name === "theory_correct")).toHaveLength(1);
  });

  test("experiment step: hidden by default, shown after checking the toggle", async () => {
    renderNew();
    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());

    expect(screen.queryByText("Variable Name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Include Experiment step (optional)"));
    expect(screen.getByText("Variable Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Min")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Max")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Threshold")).toBeInTheDocument();
  });

  test("Back / Cancel buttons navigate to the cases list without saving", async () => {
    renderNew();
    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());

    fireEvent.click(screen.getByText("← Back to Cases"));
    expect(navigateMock).toHaveBeenCalledWith("/admin/cases");

    navigateMock.mockClear();
    fireEvent.click(screen.getByText("Cancel"));
    expect(navigateMock).toHaveBeenCalledWith("/admin/cases");
    expect(api.post).not.toHaveBeenCalled();
  });

  test("creating a new case: posts a trimmed/coerced payload and navigates to the cases list on success", async () => {
    renderNew();
    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());
    api.post.mockResolvedValue({ data: { ok: true } });

    fireEvent.change(fieldControl("Title"), { target: { value: "The Case of the Blurry Vision" } });
    fireEvent.change(fieldControl("Intro Text"), { target: { value: "A patient reports blurry vision." } });
    fireEvent.change(fieldControl("Number of Clues"), { target: { value: "4" } });

    // Drag & drop: one filled item, one left blank (should be filtered out on save).
    fireEvent.change(screen.getByPlaceholderText("Item 1"), { target: { value: "Cornea" } });
    fireEvent.click(screen.getByText("+ Add item"));
    // second item left blank intentionally

    // Matching task: one complete pair.
    fireEvent.change(screen.getAllByPlaceholderText("Structure")[0], { target: { value: "Retina" } });
    fireEvent.change(screen.getAllByPlaceholderText("Role")[0], { target: { value: "Detects light" } });

    fireEvent.click(screen.getByText("Save Case"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/cases",
        expect.objectContaining({
          title: "The Case of the Blurry Vision",
          intro_text: "A patient reports blurry vision.",
          clue_count: 4,
          concept_ids: [],
          dragdrop_task: expect.objectContaining({ items: ["Cornea"] }),
          matching_task: expect.objectContaining({
            pairs: [{ structure: "Retina", role: "Detects light" }],
          }),
        }),
      );
    });
    const [, payload] = api.post.mock.calls[0];
    expect(payload).not.toHaveProperty("theory_prompt");
    expect(payload).not.toHaveProperty("experiment");

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/admin/cases");
    });
  });

  test("saving with theory and experiment included coerces experiment numbers and includes both blocks", async () => {
    renderNew();
    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());
    api.post.mockResolvedValue({ data: { ok: true } });

    fireEvent.change(fieldControl("Title"), { target: { value: "Case X" } });
    fireEvent.change(fieldControl("Intro Text"), { target: { value: "Intro" } });
    fireEvent.change(screen.getAllByPlaceholderText("Structure")[0], { target: { value: "A" } });
    fireEvent.change(screen.getAllByPlaceholderText("Role")[0], { target: { value: "B" } });

    fireEvent.click(screen.getByLabelText("Include Theory step (optional)"));
    fireEvent.change(fieldControl("Theory Prompt"), { target: { value: "Which one?" } });

    fireEvent.click(screen.getByLabelText("Include Experiment step (optional)"));
    fireEvent.change(fieldControl("Variable Name"), { target: { value: "Temperature" } });
    fireEvent.change(screen.getByPlaceholderText("Min"), { target: { value: "0" } });
    fireEvent.change(screen.getByPlaceholderText("Max"), { target: { value: "10" } });
    fireEvent.change(screen.getByPlaceholderText("Threshold"), { target: { value: "5" } });

    fireEvent.click(screen.getByText("Save Case"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/cases",
        expect.objectContaining({
          theory_prompt: "Which one?",
          experiment: expect.objectContaining({
            variable_name: "Temperature",
            min: 0,
            max: 10,
            threshold: 5,
          }),
        }),
      );
    });
  });

  test("editing a case patches the existing case id", async () => {
    renderEdit();
    await waitFor(() => {
      expect(screen.getByDisplayValue("The Case of the Blurry Vision")).toBeInTheDocument();
    });
    api.patch.mockResolvedValue({ data: { ok: true } });

    fireEvent.click(screen.getByText("Save Case"));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/admin/cases/c1", expect.any(Object));
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/admin/cases");
    });
  });

  test("shows the API error message when save fails, and does not navigate away", async () => {
    renderNew();
    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());
    api.post.mockRejectedValue({ response: { data: { message: "Title is required" } } });

    fireEvent.click(screen.getByText("Save Case"));

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  test("Save button shows a disabled 'Saving...' state while the request is in flight", async () => {
    renderNew();
    await waitFor(() => expect(screen.getByText("Biology (Grade 10)")).toBeInTheDocument());
    api.post.mockImplementation(() => new Promise(() => {}));

    fireEvent.click(screen.getByText("Save Case"));

    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Saving...")).toBeDisabled();
  });
});

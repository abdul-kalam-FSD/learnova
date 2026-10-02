import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import TeacherContests from "./TeacherContests";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const CONTEST_DRAFT = {
  id: "c1",
  title: "Weekly Fractions Blitz",
  description: "Play both games",
  grade: 6,
  subject: "Mathematics",
  chapterTitle: "Fractions",
  startAt: "2030-01-01T10:00:00.000Z",
  endAt: "2030-01-02T10:00:00.000Z",
  status: "DRAFT",
  phase: null,
  challenges: [{ id: "g1", title: "Build 1/2", label: "Fraction Builder", gameType: "MATH_FRACTION_BUILDER" }],
};

const CONTEST_LIVE = { ...CONTEST_DRAFT, id: "c2", title: "Live One", status: "PUBLISHED", phase: "ACTIVE" };

const TREE = [
  {
    id: "sub1",
    name: "Mathematics",
    chapters: [
      { id: "ch1", title: "Fractions", concepts: [] },
      { id: "ch2", title: "Decimals", concepts: [] },
    ],
  },
];

const GAMES = [
  { id: "g1", title: "Build 1/2", label: "Fraction Builder", difficulty: "easy", chapterId: "ch1", chapterTitle: "Fractions" },
  { id: "g2", title: "Match decimals", label: "Fraction Match", difficulty: "medium", chapterId: "ch2", chapterTitle: "Decimals" },
];

function mockApi({ contests = [CONTEST_DRAFT], games = GAMES } = {}) {
  api.get.mockImplementation((url) => {
    if (url === "/contests/my") return Promise.resolve({ data: { contests } });
    if (url === "/teacher/content-tree") return Promise.resolve({ data: { subjects: TREE } });
    if (url === "/contests/game-options") return Promise.resolve({ data: { games } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

function fieldControl(labelText) {
  const label = within(document.querySelector(".admin-modal")).getByText(labelText, {
    selector: ".admin-modal__label",
  });
  return label.parentElement.querySelector("input, select, textarea");
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherContests />
    </MemoryRouter>,
  );
}

// Walks the cascade: grade -> subject (-> optional chapter) -> one game.
async function fillCascade({ chapterId } = {}) {
  fireEvent.change(fieldControl("Grade"), { target: { value: "6" } });
  await screen.findByRole("option", { name: "Mathematics" });
  fireEvent.change(fieldControl("Subject"), { target: { value: "sub1" } });
  await screen.findByText(/Build 1\/2/);
  if (chapterId) {
    fireEvent.change(fieldControl("Chapter"), { target: { value: chapterId } });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/contests/game-options", { params: { subjectId: "sub1", chapterId } }));
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeacherContests list", () => {
  test("shows a loading state before contests resolve", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading contests...")).toBeInTheDocument();
  });

  test("renders contests with status, grade/subject/chapter, and their games", async () => {
    mockApi({ contests: [CONTEST_DRAFT, CONTEST_LIVE] });
    renderPage();
    expect(await screen.findByText("Weekly Fractions Blitz")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getAllByText(/Grade 6 · Mathematics · Fractions/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Build 1\/2 · Fraction Builder/).length).toBeGreaterThan(0);
    expect(api.get).toHaveBeenCalledWith("/contests/my");
  });

  test("shows an empty state when the teacher has no contests", async () => {
    mockApi({ contests: [] });
    renderPage();
    expect(await screen.findByText("No contests yet")).toBeInTheDocument();
  });

  test("shows the server error when the list fails to load", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Teacher access required" } } });
    renderPage();
    expect(await screen.findByText("Teacher access required")).toBeInTheDocument();
  });

  test("only DRAFT/REJECTED contests offer 'Submit for approval', and it updates the card", async () => {
    mockApi({ contests: [CONTEST_DRAFT, CONTEST_LIVE] });
    api.post.mockResolvedValue({ data: { ...CONTEST_DRAFT, status: "PENDING_APPROVAL" } });
    renderPage();
    await screen.findByText("Weekly Fractions Blitz");

    expect(screen.getAllByRole("button", { name: "Submit for approval" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/contests/c1/submit"));
    expect(await screen.findByText("Awaiting approval")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for approval" })).not.toBeInTheDocument();
  });

  test("a failed submit shows an inline error and keeps the list", async () => {
    mockApi();
    api.post.mockRejectedValue({ response: { data: { message: "Contest status changed, please refresh and try again" } } });
    renderPage();
    await screen.findByText("Weekly Fractions Blitz");
    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));
    expect(await screen.findByText(/status changed/)).toBeInTheDocument();
    expect(screen.getByText("Weekly Fractions Blitz")).toBeInTheDocument();
  });
});

describe("admin review feedback on the teacher's list", () => {
  const REJECTED = { ...CONTEST_DRAFT, id: "c3", title: "Rejected One", status: "REJECTED", reviewNote: "Add a harder game", reviewedAt: "2030-01-01T00:00:00Z" };
  const PENDING = { ...CONTEST_DRAFT, id: "c4", title: "Pending One", status: "PENDING_APPROVAL" };
  const PUBLISHED = { ...CONTEST_LIVE, id: "c5", title: "Published One", status: "PUBLISHED", phase: "UPCOMING", reviewNote: "" };

  test("a REJECTED contest shows the admin's reason, the no-editing hint, and can be resubmitted", async () => {
    mockApi({ contests: [REJECTED] });
    api.post.mockResolvedValue({ data: { ...REJECTED, status: "PENDING_APPROVAL" } });
    renderPage();
    expect(await screen.findByText("Needs changes")).toBeInTheDocument();
    expect(screen.getByText("Add a harder game")).toBeInTheDocument();
    expect(screen.getByText(/can't be edited yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/contests/c3/submit"));
    expect(await screen.findByText("Awaiting approval")).toBeInTheDocument();
    expect(screen.queryByText("Add a harder game")).not.toBeInTheDocument();
  });

  test("a rejection without a reason still renders sensibly", async () => {
    mockApi({ contests: [{ ...REJECTED, reviewNote: "" }] });
    renderPage();
    expect(await screen.findByText("No reason was given.")).toBeInTheDocument();
  });

  test("PENDING shows a waiting message and no submit button; PUBLISHED shows no feedback box", async () => {
    mockApi({ contests: [PENDING, PUBLISHED] });
    renderPage();
    await screen.findByText("Pending One");
    expect(screen.getByText(/waiting for an admin to review/)).toBeInTheDocument();
    expect(screen.getByText("Awaiting approval")).toBeInTheDocument();
    expect(screen.getByText("Published · Upcoming")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for approval" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Admin feedback/)).not.toBeInTheDocument();
  });
});

describe("Create Contest modal", () => {
  const openModal = async () => {
    mockApi();
    renderPage();
    await screen.findByText("Weekly Fractions Blitz");
    fireEvent.click(screen.getByRole("button", { name: "+ Create Contest" }));
    await screen.findByText("Contest title", { selector: ".admin-modal__label" });
  };

  test("loads subjects for the chosen grade and games for the chosen subject from the API", async () => {
    await openModal();
    fireEvent.change(fieldControl("Grade"), { target: { value: "6" } });
    await screen.findByRole("option", { name: "Mathematics" });
    expect(api.get).toHaveBeenCalledWith("/teacher/content-tree", { params: { grade: 6 } });

    fireEvent.change(fieldControl("Subject"), { target: { value: "sub1" } });
    await screen.findByText(/Match decimals/);
    expect(api.get).toHaveBeenCalledWith("/contests/game-options", { params: { subjectId: "sub1", chapterId: undefined } });
  });

  test("choosing a chapter re-queries games for that chapter and clears earlier picks", async () => {
    await openModal();
    await fillCascade();
    fireEvent.click(screen.getByRole("checkbox", { name: /Build 1\/2/ }));
    expect(screen.getByText(/1 selected/)).toBeInTheDocument();

    fireEvent.change(fieldControl("Chapter"), { target: { value: "ch2" } });
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/contests/game-options", { params: { subjectId: "sub1", chapterId: "ch2" } }),
    );
    expect(screen.getByText(/0 selected/)).toBeInTheDocument();
  });

  test("Save as Draft posts the full payload with submitForApproval:false, then reloads the list", async () => {
    await openModal();
    api.post.mockResolvedValue({ data: {} });
    fireEvent.change(fieldControl("Contest title"), { target: { value: "  Blitz  " } });
    fireEvent.change(fieldControl("Description / instructions (optional)"), { target: { value: "Have fun" } });
    await fillCascade({ chapterId: "ch1" });
    fireEvent.click(screen.getByRole("checkbox", { name: /Build 1\/2/ }));
    fireEvent.change(fieldControl("Starts"), { target: { value: "2030-01-01T10:00" } });
    fireEvent.change(fieldControl("Ends"), { target: { value: "2030-01-02T10:00" } });

    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith("/contests", {
      title: "Blitz",
      description: "Have fun",
      grade: 6,
      subjectId: "sub1",
      chapterId: "ch1",
      challengeIds: ["g1"],
      startAt: new Date("2030-01-01T10:00").toISOString(),
      endAt: new Date("2030-01-02T10:00").toISOString(),
      submitForApproval: false,
    });
    await waitFor(() => expect(document.querySelector(".admin-modal")).toBeNull());
    expect(api.get.mock.calls.filter(([u]) => u === "/contests/my").length).toBeGreaterThanOrEqual(2);
  });

  test("Submit for Approval posts submitForApproval:true", async () => {
    await openModal();
    api.post.mockResolvedValue({ data: {} });
    fireEvent.change(fieldControl("Contest title"), { target: { value: "Blitz" } });
    await fillCascade();
    fireEvent.click(screen.getByRole("checkbox", { name: /Build 1\/2/ }));
    fireEvent.change(fieldControl("Starts"), { target: { value: "2030-01-01T10:00" } });
    fireEvent.change(fieldControl("Ends"), { target: { value: "2030-01-02T10:00" } });

    fireEvent.click(screen.getByRole("button", { name: "Submit for Approval" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][1]).toMatchObject({ submitForApproval: true, chapterId: undefined });
  });

  test("blocks an incomplete form client-side without calling the API", async () => {
    await openModal();
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    expect(await screen.findByText("Give the contest a title")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("blocks end <= start client-side", async () => {
    await openModal();
    fireEvent.change(fieldControl("Contest title"), { target: { value: "Blitz" } });
    await fillCascade();
    fireEvent.click(screen.getByRole("checkbox", { name: /Build 1\/2/ }));
    fireEvent.change(fieldControl("Starts"), { target: { value: "2030-01-02T10:00" } });
    fireEvent.change(fieldControl("Ends"), { target: { value: "2030-01-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    expect(await screen.findByText("The end time must be after the start time")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("shows the server's validation message and keeps the modal open", async () => {
    await openModal();
    api.post.mockRejectedValue({ response: { data: { message: "One or more selected games do not belong to the chosen subject/chapter" } } });
    fireEvent.change(fieldControl("Contest title"), { target: { value: "Blitz" } });
    await fillCascade();
    fireEvent.click(screen.getByRole("checkbox", { name: /Build 1\/2/ }));
    fireEvent.change(fieldControl("Starts"), { target: { value: "2030-01-01T10:00" } });
    fireEvent.change(fieldControl("Ends"), { target: { value: "2030-01-02T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    expect(await screen.findByText(/do not belong/)).toBeInTheDocument();
    expect(document.querySelector(".admin-modal")).not.toBeNull();
  });
});

describe("results link", () => {
  test("only published contests that have started link to their results", async () => {
    mockApi({
      contests: [
        CONTEST_LIVE,
        { ...CONTEST_DRAFT, id: "c9", title: "Not started", status: "PUBLISHED", phase: "UPCOMING" },
        { ...CONTEST_DRAFT, id: "c8", title: "Pending", status: "PENDING_APPROVAL" },
        CONTEST_DRAFT,
      ],
    });
    renderPage();
    await screen.findByText("Live One");
    const links = screen.getAllByRole("link", { name: "View results" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/teacher/contests/c2/results");
  });
});

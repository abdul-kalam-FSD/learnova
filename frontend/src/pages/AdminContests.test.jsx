import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import AdminContests from "./AdminContests";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const ROW = (over = {}) => ({
  id: "c1",
  title: "Weekly Fractions Blitz",
  teacher: { id: "t1", name: "Tina Teacher", email: "t@x.com" },
  grade: 6,
  subject: "Mathematics",
  chapterTitle: "Fractions",
  challengeCount: 2,
  startAt: "2030-01-01T10:00:00.000Z",
  endAt: "2030-01-02T10:00:00.000Z",
  submittedAt: "2029-12-30T10:00:00.000Z",
  status: "PENDING_APPROVAL",
  ...over,
});

const DETAIL = (over = {}) => ({
  ...ROW(),
  description: "Play both games",
  createdAt: "2029-12-29T10:00:00.000Z",
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: "",
  challenges: [
    { id: "g1", title: "Build 1/2", label: "Fraction Builder", difficulty: "easy" },
    { id: "g2", title: "Match it", label: "Fraction Match", difficulty: "medium" },
  ],
  ...over,
});

const COUNTS = { PENDING_APPROVAL: 2, PUBLISHED: 1, REJECTED: 3 };
const listResponse = (contests, counts = COUNTS) => ({
  data: { contests, counts, page: 1, limit: 20, total: contests.length, totalPages: 1 },
});

function mockApi({ contests = [ROW(), ROW({ id: "c2", title: "Second" })], detail = DETAIL() } = {}) {
  api.get.mockImplementation((url) => {
    if (url === "/admin/contests") return Promise.resolve(listResponse(contests));
    if (url.startsWith("/admin/contests/")) return Promise.resolve({ data: detail });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminContests />
    </MemoryRouter>,
  );

const openReview = async (title = "Weekly Fractions Blitz") => {
  await screen.findByText(title, { selector: "td" });
  fireEvent.click(screen.getAllByRole("button", { name: /^(Review|View) / })[0]);
  await screen.findByRole("dialog");
  await screen.findByText(/Tina Teacher \(t@x.com\)/);
};

const listCalls = () => api.get.mock.calls.filter(([u]) => u === "/admin/contests");

let confirmSpy;
beforeEach(() => {
  vi.clearAllMocks();
  confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => confirmSpy.mockRestore());

describe("review queue", () => {
  test("shows a loading state, then the pending queue with the key review columns", async () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const { unmount } = renderPage();
    expect(screen.getByText("Loading contests...")).toBeInTheDocument();
    unmount();

    mockApi();
    renderPage();
    const row = (await screen.findByText("Weekly Fractions Blitz", { selector: "td" })).closest("tr");
    expect(within(row).getByText("Tina Teacher")).toBeInTheDocument();
    expect(within(row).getByText("6")).toBeInTheDocument();
    expect(within(row).getByText(/Mathematics · Fractions/)).toBeInTheDocument();
    expect(within(row).getByText("2")).toBeInTheDocument(); // games count
    expect(within(row).getByText("Pending")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Review Weekly Fractions Blitz" })).toBeInTheDocument();
  });

  test("defaults to the Pending filter and surfaces the pending count", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Weekly Fractions Blitz", { selector: "td" });
    expect(listCalls()[0][1]).toEqual({ params: { page: 1, limit: 20, status: "PENDING_APPROVAL" } });
    expect(screen.getByText("2 contests awaiting review")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pending approval (2)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Published (1)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rejected (3)" })).toBeInTheDocument();
  });

  test("changing the filter re-queries; 'All submitted' sends no status", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Weekly Fractions Blitz", { selector: "td" });
    const select = screen.getByLabelText("Filter by status");

    fireEvent.change(select, { target: { value: "REJECTED" } });
    await waitFor(() => expect(listCalls().at(-1)[1].params).toMatchObject({ status: "REJECTED" }));

    fireEvent.change(select, { target: { value: "" } });
    await waitFor(() => expect(listCalls().at(-1)[1].params).not.toHaveProperty("status"));
  });

  test("empty pending queue shows a friendly message", async () => {
    mockApi({ contests: [] });
    renderPage();
    expect(await screen.findByText("Nothing waiting for review")).toBeInTheDocument();
  });

  test("shows the server error if the list can't load", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Admin access required" } } });
    renderPage();
    expect(await screen.findByText("Admin access required")).toBeInTheDocument();
  });

  test("non-pending rows say 'View' and show their status badge", async () => {
    mockApi({ contests: [ROW({ status: "PUBLISHED" }), ROW({ id: "c2", title: "Rej", status: "REJECTED" })] });
    renderPage();
    await screen.findByText("Rej", { selector: "td" });
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Review / })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^View / })).toHaveLength(2);
  });
});

describe("review details modal", () => {
  test("loads the contest detail and shows enough to decide (no answer keys are requested or shown)", async () => {
    mockApi();
    renderPage();
    await openReview();
    expect(api.get).toHaveBeenCalledWith("/admin/contests/c1");
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Play both games")).toBeInTheDocument();
    expect(within(dialog).getByText(/Build 1\/2 · Fraction Builder/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Match it · Fraction Match/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Games \(2\)/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  test("a reviewed contest offers only Close and shows the previous decision", async () => {
    mockApi({
      contests: [ROW({ status: "REJECTED" })],
      detail: DETAIL({ status: "REJECTED", reviewedBy: { id: "a1", name: "Ada Admin" }, reviewedAt: "2030-01-01T00:00:00Z", reviewNote: "Too easy" }),
    });
    renderPage();
    await openReview();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Ada Admin/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Too easy/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    // The modal's own "✕" is also labelled Close, so target the footer button.
    expect(within(dialog).getByText("Close", { selector: "button.admin-page__page-btn" })).toBeInTheDocument();
  });

  test("a failed detail load is shown", async () => {
    api.get.mockImplementation((url) =>
      url === "/admin/contests"
        ? Promise.resolve(listResponse([ROW()]))
        : Promise.reject({ response: { status: 404, data: { message: "Contest not found" } } }),
    );
    renderPage();
    await screen.findByText("Weekly Fractions Blitz", { selector: "td" });
    fireEvent.click(screen.getByRole("button", { name: /^Review / }));
    expect(await screen.findByText("Contest not found")).toBeInTheDocument();
  });
});

describe("approve", () => {
  test("requires an intentional confirmation; cancelling sends nothing", async () => {
    mockApi();
    confirmSpy.mockReturnValue(false);
    renderPage();
    await openReview();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0][0]).toMatch(/Approve "Weekly Fractions Blitz"/);
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("confirming posts an EMPTY body (client never sends status/reviewer), closes the modal and refreshes the list", async () => {
    mockApi();
    api.post.mockResolvedValue({ data: DETAIL({ status: "PUBLISHED" }) });
    renderPage();
    await openReview();
    const callsBefore = listCalls().length;

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith("/admin/contests/c1/approve", {});
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(callsBefore));
  });

  test("buttons are disabled while the request is in flight (no double-approve)", async () => {
    mockApi();
    let release;
    api.post.mockImplementation(() => new Promise((r) => (release = r)));
    renderPage();
    await openReview();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    const approving = await screen.findByRole("button", { name: "Approving..." });
    expect(approving).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    fireEvent.click(approving);
    expect(api.post).toHaveBeenCalledTimes(1);
    release({ data: {} });
  });

  test("a 409 (already reviewed) shows the message, refreshes the detail and removes the action buttons", async () => {
    let detailCalls = 0;
    api.get.mockImplementation((url) => {
      if (url === "/admin/contests") return Promise.resolve(listResponse([ROW()]));
      detailCalls += 1;
      return Promise.resolve({
        data: detailCalls === 1 ? DETAIL() : DETAIL({ status: "PUBLISHED", reviewedBy: { id: "a2", name: "Abe Admin" }, reviewedAt: "2030-01-01T00:00:00Z" }),
      });
    });
    api.post.mockRejectedValue({ response: { status: 409, data: { message: "This contest has already been published, so it cannot be approved" } } });
    renderPage();
    await openReview();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByText(/already been published/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Abe Admin/)).toBeInTheDocument();
  });

  test("other API errors are shown inline and the actions stay available", async () => {
    mockApi();
    api.post.mockRejectedValue({ response: { status: 400, data: { message: "This contest's end time has already passed." } } });
    renderPage();
    await openReview();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText(/end time has already passed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).not.toBeDisabled();
  });
});

describe("reject", () => {
  const startReject = async () => {
    mockApi();
    renderPage();
    await openReview();
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    return screen.findByLabelText(/Reason for rejection/);
  };

  test("collects a reason first; Back returns to the decision buttons without sending anything", async () => {
    await startReject();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("a missing / too-short reason is blocked client-side", async () => {
    const box = await startReject();
    fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" }));
    expect(await screen.findByText(/reason of at least 5 characters/)).toBeInTheDocument();
    fireEvent.change(box, { target: { value: "  no " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" }));
    expect(api.post).not.toHaveBeenCalled();
  });

  test("a valid reason is trimmed and posted as { note } only, then the list refreshes", async () => {
    const box = await startReject();
    api.post.mockResolvedValue({ data: DETAIL({ status: "REJECTED" }) });
    const callsBefore = listCalls().length;
    fireEvent.change(box, { target: { value: "  Add a harder game for Grade 6  " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith("/admin/contests/c1/reject", { note: "Add a harder game for Grade 6" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(callsBefore));
  });

  test("a server validation error is shown and the reason is kept", async () => {
    const box = await startReject();
    api.post.mockRejectedValue({ response: { status: 400, data: { message: "Please give a reason of at least 5 characters" } } });
    fireEvent.change(box, { target: { value: "valid reason here" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" }));
    expect(await screen.findByText(/at least 5 characters/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for rejection/)).toHaveValue("valid reason here");
  });
});

describe("results link", () => {
  test("only published contests offer a Results link", async () => {
    mockApi({ contests: [ROW({ status: "PUBLISHED" }), ROW({ id: "c2", title: "Pending one", status: "PENDING_APPROVAL" }), ROW({ id: "c3", title: "Rejected one", status: "REJECTED" })] });
    renderPage();
    await screen.findByText("Pending one", { selector: "td" });
    const links = screen.getAllByRole("link", { name: /^Results for / });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/admin/contests/c1/results");
  });
});

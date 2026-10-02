import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ContestResultsView from "./ContestResultsView";
import api from "../api/axios";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const ROW = (over = {}) => ({
  rank: 1, studentId: "s1", name: "Ann", email: "ann@x.com", status: "COMPLETED", challengeCount: 3,
  challengesStarted: 3, challengesCompleted: 3, challengesSolved: 3, correctAnswers: 3, totalAnswers: 3, accuracy: 100,
  completionPercent: 100, xpEarned: 90, attempts: 3, firstStartedAt: "2030-01-01T10:05:00Z", lastCompletedAt: "2030-01-01T10:30:00Z",
  lastSolvedAt: "2030-01-01T10:30:00Z", elapsedSeconds: 1800, ...over,
});

const PAGE = (over = {}) => ({
  contest: { id: "c1", title: "Weekly Fractions Blitz", grade: 6, subject: "Mathematics", chapterTitle: "Fractions", startAt: "2030-01-01T10:00:00Z", endAt: "2030-01-02T10:00:00Z" },
  rankingRule: { summary: "Ranked by games solved, then total correct answers, then finish time." },
  final: false, phase: "ACTIVE",
  summary: { challengeCount: 3, participantCount: 3, completedCount: 1, partialCount: 1, inProgressCount: 1, rankedCount: 2 },
  rows: [
    ROW(),
    ROW({ rank: 2, studentId: "s2", name: "Ben", email: null, status: "PARTIAL", challengesCompleted: 1, challengesSolved: 1, correctAnswers: 1, totalAnswers: 1, xpEarned: 0, elapsedSeconds: 3725 }),
    ROW({ rank: null, studentId: "s3", name: "Cat", email: null, status: "IN_PROGRESS", challengesCompleted: 0, challengesSolved: 0, correctAnswers: 0, totalAnswers: 0, accuracy: null, xpEarned: 0, elapsedSeconds: null, lastCompletedAt: null }),
  ],
  page: 1, limit: 25, total: 3, totalPages: 1, ...over,
});

const DETAIL = {
  data: {
    challenges: [
      { id: "g1", title: "Build 1/2", label: "Fraction Builder", status: "COMPLETED", isCorrect: true, correctAnswers: 1, totalAnswers: 1, xpAwarded: 30, attempts: 2 },
      { id: "g2", title: "Match it", label: "Fraction Match", status: "IN_PROGRESS", isCorrect: null, correctAnswers: null, totalAnswers: null, xpAwarded: null, attempts: 1 },
      { id: "g3", title: "Speed", label: null, status: "NOT_STARTED", isCorrect: null, correctAnswers: null, totalAnswers: null, xpAwarded: null, attempts: 0 },
    ],
  },
};

let loadResults;
let loadParticipant;
beforeEach(() => {
  loadResults = vi.fn().mockResolvedValue({ data: PAGE() });
  loadParticipant = vi.fn().mockResolvedValue(DETAIL);
});

const renderView = () => render(<ContestResultsView loadResults={loadResults} loadParticipant={loadParticipant} />);

describe("ContestResultsView", () => {
  test("shows loading, then the summary, ranking rule and a row per student", async () => {
    renderView();
    expect(screen.getByText("Loading results...")).toBeInTheDocument();
    await screen.findByText("Ann");
    expect(loadResults).toHaveBeenCalledWith(1);
    expect(screen.getByText(/Weekly Fractions Blitz · Grade 6 · Mathematics · Fractions/)).toBeInTheDocument();
    expect(screen.getByText(/Live standings/)).toBeInTheDocument();
    expect(screen.getByText("Participants").previousSibling).toHaveTextContent("3");
    expect(screen.getByText("Ranked").previousSibling).toHaveTextContent("2");
    expect(screen.getByText(/Ranked by games solved, then total correct answers/)).toBeInTheDocument();
  });

  test("each row shows rank, solved, correct, accuracy, XP and finish time straight from the server", async () => {
    renderView();
    const ann = (await screen.findByText("Ann")).closest("tr");
    expect(within(ann).getByText("#1")).toBeInTheDocument();
    expect(within(ann).getByText("ann@x.com")).toBeInTheDocument();
    expect(within(ann).getByText("Completed all")).toBeInTheDocument();
    expect(within(ann).getAllByText("3/3")).toHaveLength(2); // solved 3/3 and correct 3/3
    expect(within(ann).getByText("100%")).toBeInTheDocument();
    expect(within(ann).getByText("90")).toBeInTheDocument();
    expect(within(ann).getByText("30m 0s")).toBeInTheDocument();
    const ben = screen.getByText("Ben").closest("tr");
    expect(within(ben).getByText("#2")).toBeInTheDocument();
    expect(within(ben).getByText("1h 2m")).toBeInTheDocument();
    expect(within(ben).queryByText(/@x.com/)).not.toBeInTheDocument(); // email outside the teacher's scope arrives as null
  });

  test("unranked students show a dash, not a rank, and no fake time or accuracy", async () => {
    renderView();
    const cat = (await screen.findByText("Cat")).closest("tr");
    expect(within(cat).getByText("Started")).toBeInTheDocument();
    expect(within(cat).queryByText(/^#/)).not.toBeInTheDocument();
    expect(within(cat).getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  test("final and upcoming contests are labelled", async () => {
    loadResults.mockResolvedValue({ data: PAGE({ final: true, phase: "ENDED" }) });
    const { unmount } = renderView();
    expect(await screen.findByText(/Final results/)).toBeInTheDocument();
    unmount();
    loadResults.mockResolvedValue({ data: PAGE({ phase: "UPCOMING", rows: [], total: 0, totalPages: 0 }) });
    renderView();
    expect(await screen.findByText(/Not started yet/)).toBeInTheDocument();
  });

  test("zero participants shows a proper empty state, not an empty table", async () => {
    loadResults.mockResolvedValue({ data: PAGE({ rows: [], total: 0, totalPages: 0, summary: { challengeCount: 3, participantCount: 0, completedCount: 0, partialCount: 0, inProgressCount: 0, rankedCount: 0 } }) });
    renderView();
    expect(await screen.findByText("No one has played yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("shows the server's error (e.g. not your contest)", async () => {
    loadResults.mockRejectedValue({ response: { data: { message: "Contest not found" } } });
    renderView();
    expect(await screen.findByText("Contest not found")).toBeInTheDocument();
  });

  test("pagination asks the server for the next/previous page", async () => {
    loadResults.mockResolvedValue({ data: PAGE({ page: 1, total: 60, totalPages: 3 }) });
    renderView();
    await screen.findByText("Page 1 of 3");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(loadResults).toHaveBeenLastCalledWith(2));
  });

  test("no pager when everything fits on one page", async () => {
    renderView();
    await screen.findByText("Ann");
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  test("Details opens a per-game breakdown loaded for that student", async () => {
    renderView();
    await screen.findByText("Ann");
    fireEvent.click(screen.getByRole("button", { name: "Details for Ann" }));
    expect(loadParticipant).toHaveBeenCalledWith("s1");
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Build 1/2");
    expect(within(dialog).getByText("Solved")).toBeInTheDocument();
    expect(within(dialog).getByText("In progress")).toBeInTheDocument();
    expect(within(dialog).getByText("Not started")).toBeInTheDocument();
    expect(within(dialog).getByText("30")).toBeInTheDocument();
    expect(within(dialog).getByText(/Rank #1 · 3 of 3 solved · 90 XP/)).toBeInTheDocument();
  });

  test("a failed detail load shows the error inside the modal", async () => {
    loadParticipant.mockRejectedValue({ response: { data: { message: "This student has not taken part in this contest" } } });
    renderView();
    await screen.findByText("Ann");
    fireEvent.click(screen.getByRole("button", { name: "Details for Ann" }));
    expect(await screen.findByText(/has not taken part/)).toBeInTheDocument();
  });
});

describe("export action", () => {
  test("is shown once the results have loaded, with the given url and button style", async () => {
    api.get.mockResolvedValue({ data: new Blob(["x"]), headers: {} });
    render(<ContestResultsView loadResults={loadResults} loadParticipant={loadParticipant} exportUrl="/contests/c1/results/export" exportButtonClassName="portal-btn" />);
    const button = await screen.findByRole("button", { name: "Export Excel" });
    expect(button).toHaveClass("portal-btn");
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    fireEvent.click(button);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/contests/c1/results/export", { responseType: "blob" }));
  });

  test("is NOT shown while loading", () => {
    loadResults.mockReturnValue(new Promise(() => {}));
    render(<ContestResultsView loadResults={loadResults} loadParticipant={loadParticipant} exportUrl="/x" />);
    expect(screen.queryByRole("button", { name: "Export Excel" })).not.toBeInTheDocument();
  });

  test("is NOT shown when the server refuses the results (not authorised / not found)", async () => {
    loadResults.mockRejectedValue({ response: { status: 404, data: { message: "Contest not found" } } });
    render(<ContestResultsView loadResults={loadResults} loadParticipant={loadParticipant} exportUrl="/x" />);
    await screen.findByText("Contest not found");
    expect(screen.queryByRole("button", { name: "Export Excel" })).not.toBeInTheDocument();
  });

  test("is NOT shown when no export url is supplied (no export action for that viewer)", async () => {
    render(<ContestResultsView loadResults={loadResults} loadParticipant={loadParticipant} />);
    await screen.findByText("Ann");
    expect(screen.queryByRole("button", { name: "Export Excel" })).not.toBeInTheDocument();
  });

  test("is still offered for a contest with zero participants (the file is valid and empty)", async () => {
    loadResults.mockResolvedValue({ data: PAGE({ rows: [], total: 0, totalPages: 0 }) });
    render(<ContestResultsView loadResults={loadResults} loadParticipant={loadParticipant} exportUrl="/x" />);
    await screen.findByText("No one has played yet");
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeInTheDocument();
  });
});

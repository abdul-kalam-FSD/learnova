import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "../api/axios";
import ContestResult from "./ContestResult";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const CONTEST = { id: "c1", title: "Weekly Fractions Blitz", grade: 6, subject: "Mathematics", chapterTitle: "Fractions" };
const RULE = { summary: "Ranked by games solved, then total correct answers, then finish time (sooner is better)." };

const OWN = (over = {}) => ({
  studentId: "me", name: "Ann", rank: 2, status: "COMPLETED", challengeCount: 3, challengesStarted: 3, challengesCompleted: 3, challengesSolved: 2,
  correctAnswers: 5, totalAnswers: 7, accuracy: 71.4, completionPercent: 100, xpEarned: 70, elapsedSeconds: 2400,
  challenges: [
    { id: "g1", title: "Build 1/2", label: "Fraction Builder", status: "COMPLETED", isCorrect: true, correctAnswers: 1, totalAnswers: 1, xpAwarded: 30 },
    { id: "g2", title: "Match it", label: "Fraction Match", status: "COMPLETED", isCorrect: false, correctAnswers: 3, totalAnswers: 5, xpAwarded: 10 },
    { id: "g3", title: "Speed", label: "Speed", status: "NOT_STARTED", isCorrect: null, correctAnswers: null, totalAnswers: null, xpAwarded: null },
  ], ...over,
});

const MINE = (over = {}) => ({ contest: CONTEST, phase: "ACTIVE", final: false, rankingRule: RULE, participated: true, result: OWN(), rankedCount: 6, participantCount: 9, ...over });
const BOARD = (over = {}) => ({
  contest: { id: "c1", title: "Weekly Fractions Blitz", phase: "ACTIVE" }, final: false, rankingRule: RULE, rankedCount: 6, currentUser: null,
  leaderboard: [
    { rank: 1, name: "Ben", challengesSolved: 3, challengesCompleted: 3, correctAnswers: 3, totalAnswers: 3, accuracy: 100, elapsedSeconds: 1200, isCurrentUser: false },
    { rank: 2, name: "Ann", challengesSolved: 2, challengesCompleted: 3, correctAnswers: 5, totalAnswers: 7, accuracy: 71.4, elapsedSeconds: 2400, isCurrentUser: true },
    { rank: 2, name: "Cat", challengesSolved: 2, challengesCompleted: 3, correctAnswers: 5, totalAnswers: 7, accuracy: 71.4, elapsedSeconds: 2400, isCurrentUser: false },
  ], ...over,
});

function mockApi({ mine = MINE(), board = BOARD() } = {}) {
  api.get.mockImplementation((url) => {
    if (url.endsWith("/result")) return Promise.resolve({ data: mine });
    if (url.endsWith("/leaderboard")) return Promise.resolve({ data: board });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/contests/c1/results"]}>
      <Routes>
        <Route path="/contests/:contestId/results" element={<ContestResult />} />
        <Route path="/contests/:contestId" element={<div>contest page</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => vi.clearAllMocks());

describe("ContestResult (student)", () => {
  test("loads both the result and the leaderboard for this contest from the server", async () => {
    mockApi();
    renderPage();
    expect(screen.getByText("Loading results...")).toBeInTheDocument();
    await screen.findByText("Your result");
    expect(api.get).toHaveBeenCalledWith("/student/contests/c1/result");
    expect(api.get).toHaveBeenCalledWith("/student/contests/c1/leaderboard");
    expect(api.get).toHaveBeenCalledTimes(2); // no grade/score/rank is ever sent
  });

  test("shows the student's own rank, accuracy, XP, time and per-game outcome", async () => {
    mockApi();
    renderPage();
    expect(await screen.findByText("You're #2 of 6")).toBeInTheDocument();
    const stat = (label) => screen.getByText(label).previousSibling;
    expect(stat("Games solved")).toHaveTextContent("2 of 3");
    expect(stat("Correct answers")).toHaveTextContent("5/7");
    expect(stat("Accuracy")).toHaveTextContent("71.4%");
    expect(stat("XP earned")).toHaveTextContent("70");
    expect(stat("Finish time")).toHaveTextContent("40m 0s");
    expect(screen.getByText("Solved · +30 XP")).toBeInTheDocument();
    expect(screen.getByText("Not solved")).toBeInTheDocument();
    expect(screen.getByText("Not started")).toBeInTheDocument();
  });

  test("an unranked participant is told how to get on the board, with no invented rank", async () => {
    mockApi({ mine: MINE({ result: OWN({ rank: null, challengesSolved: 0, status: "PARTIAL", elapsedSeconds: null }) }) });
    renderPage();
    expect(await screen.findByText("Not ranked yet")).toBeInTheDocument();
    expect(screen.getByText(/Solve a game \(all answers right\) to join the leaderboard/)).toBeInTheDocument();
    expect(screen.queryByText(/You're #/)).not.toBeInTheDocument();
  });

  test("a student who hasn't played gets a friendly empty state and a link to play (while live)", async () => {
    mockApi({ mine: MINE({ participated: false, result: null }) });
    renderPage();
    expect(await screen.findByText("You haven't played this contest yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to contest" })).toHaveAttribute("href", "/contests/c1");
  });

  test("after the contest ends there is no 'go play' prompt and results are labelled final", async () => {
    mockApi({ mine: MINE({ participated: false, result: null, phase: "ENDED", final: true }), board: BOARD({ final: true }) });
    renderPage();
    expect(await screen.findByText(/final results/)).toBeInTheDocument();
    expect(screen.getByText("You didn't take part in this contest.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Go to contest" })).not.toBeInTheDocument();
  });

  test("an upcoming contest says there are no results yet", async () => {
    mockApi({ mine: MINE({ participated: false, result: null, phase: "UPCOMING" }), board: BOARD({ leaderboard: [], rankedCount: 0 }) });
    renderPage();
    expect(await screen.findByText(/hasn't started yet, so there are no results/)).toBeInTheDocument();
  });

  test("the leaderboard shows ranks (ties share one), highlights the student and shows only public info", async () => {
    mockApi();
    renderPage();
    const list = await screen.findByRole("list", { name: "Leaderboard" });
    const rows = within(list).getAllByText(/solved ·/);
    expect(rows).toHaveLength(3);
    expect(within(list).getByText("Ann (you)")).toBeInTheDocument();
    expect(within(list).getByText("Ben")).toBeInTheDocument();
    const ranks = Array.from(list.querySelectorAll(".contest-leaderboard__rank")).map((n) => n.textContent);
    expect(ranks).toEqual(["1", "2", "2"]); // the tie is shown honestly
    expect(list.querySelector(".contest-leaderboard__row--me")).toHaveTextContent("Ann (you)");
    // other students' rows carry no email and no XP
    expect(list.textContent).not.toMatch(/@|XP/);
  });

  test("a student below the visible list still sees their own position", async () => {
    mockApi({ board: BOARD({ currentUser: { rank: 11, name: "Ann", challengesSolved: 1, challengesCompleted: 1, correctAnswers: 1, totalAnswers: 1, accuracy: 100, elapsedSeconds: 9000, isCurrentUser: true } }) });
    renderPage();
    expect(await screen.findByText("Your position")).toBeInTheDocument();
    expect(screen.getAllByText("Ann (you)").length).toBeGreaterThanOrEqual(1);
  });

  test("an empty leaderboard shows an empty state", async () => {
    mockApi({ board: BOARD({ leaderboard: [], rankedCount: 0 }) });
    renderPage();
    expect(await screen.findByText("No one is on the leaderboard yet")).toBeInTheDocument();
  });

  test("shows the ranking rule so the order is explained", async () => {
    mockApi();
    renderPage();
    expect(await screen.findByText(/Ranked by games solved, then total correct answers/)).toBeInTheDocument();
  });

  test("a contest the student can't see (404) shows not-found; other failures show an error", async () => {
    api.get.mockRejectedValue({ response: { status: 404, data: { message: "Contest not found" } } });
    const { unmount } = renderPage();
    expect(await screen.findByText("Contest not found")).toBeInTheDocument();
    unmount();
    api.get.mockRejectedValue({ response: { status: 500, data: { message: "Server exploded" } } });
    renderPage();
    expect(await screen.findByText("Error: Server exploded")).toBeInTheDocument();
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import api from "../api/axios";
import ContestDetails from "./ContestDetails";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const CHALLENGES = [
  { id: "g1", title: "Build 1/2", gameType: "MATH_FRACTION_BUILDER", label: "Fraction Builder", difficulty: "easy", status: "COMPLETED", isCorrect: true, xpAwarded: 30, completedAt: "2030-01-01T11:00:00Z", canPlay: false },
  { id: "g2", title: "Match it", gameType: "MATH_FRACTION_MATCH", label: "Fraction Match", difficulty: "medium", status: "IN_PROGRESS", isCorrect: null, xpAwarded: null, completedAt: null, canPlay: true },
  { id: "g3", title: "Build 3/4", gameType: "MATH_FRACTION_BUILDER", label: "Fraction Builder", difficulty: "hard", status: "NOT_STARTED", isCorrect: null, xpAwarded: null, completedAt: null, canPlay: true },
  { id: "g4", title: "Try again", gameType: "MATH_FRACTION_BUILDER", label: "Fraction Builder", difficulty: "easy", status: "COMPLETED", isCorrect: false, xpAwarded: 0, completedAt: "2030-01-01T11:30:00Z", canPlay: false },
];

const DETAIL = (over = {}) => ({
  id: "c1",
  title: "Weekly Fractions Blitz",
  description: "Play them all",
  grade: 6,
  subject: "Mathematics",
  chapterTitle: "Fractions",
  teacherName: "Tina Teacher",
  startAt: "2030-01-01T10:00:00.000Z",
  endAt: "2030-01-02T10:00:00.000Z",
  phase: "ACTIVE",
  challengeCount: 4,
  challenges: CHALLENGES,
  progress: { completed: 2, total: 4 },
  ...over,
});

// Shows where a Play tap actually navigated, and the state it carried.
function GameProbe() {
  const location = useLocation();
  return (
    <div>
      <div data-testid="game-path">{location.pathname}</div>
      <div data-testid="game-state">{JSON.stringify(location.state)}</div>
    </div>
  );
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/contests/c1"]}>
      <Routes>
        <Route path="/contests/:contestId" element={<ContestDetails />} />
        <Route path="/contests" element={<div>contest list</div>} />
        <Route path="/games/*" element={<GameProbe />} />
      </Routes>
    </MemoryRouter>,
  );

const row = (title) => screen.getByText(new RegExp(title)).closest(".contest-challenge");

beforeEach(() => vi.clearAllMocks());

describe("ContestDetails", () => {
  test("loads the contest by id and shows its header, description and progress", async () => {
    api.get.mockResolvedValue({ data: DETAIL() });
    renderPage();
    expect(screen.getByText("Loading contest...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Weekly Fractions Blitz" })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/student/contests/c1");
    expect(screen.getByText(/Mathematics · Fractions · by Tina Teacher/)).toBeInTheDocument();
    expect(screen.getByText("Play them all")).toBeInTheDocument();
    expect(screen.getByText("2 of 4 games completed")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  test("shows each game's own status: completed (with XP), wrong, in progress, not started", async () => {
    api.get.mockResolvedValue({ data: DETAIL() });
    renderPage();
    await screen.findByText(/Build 1\/2/);
    expect(within(row("Build 1/2")).getByText("Completed · +30 XP")).toBeInTheDocument();
    expect(within(row("Try again")).getByText("Completed")).toBeInTheDocument();
    expect(within(row("Match it")).getByText("In progress")).toBeInTheDocument();
    expect(within(row("Build 3/4")).getByText("Not started")).toBeInTheDocument();
    expect(within(row("Match it")).getByText(/Fraction Match · medium/)).toBeInTheDocument();
  });

  test("only unfinished games are playable while the contest is live", async () => {
    api.get.mockResolvedValue({ data: DETAIL() });
    renderPage();
    await screen.findByText(/Build 1\/2/);
    expect(within(row("Build 1/2")).getByRole("button")).toBeDisabled();
    expect(within(row("Build 1/2")).getByRole("button")).toHaveTextContent("Done");
    expect(within(row("Match it")).getByRole("button", { name: "Continue Match it" })).toBeEnabled();
    expect(within(row("Build 3/4")).getByRole("button", { name: "Play Build 3/4" })).toBeEnabled();
  });

  test("Play opens the EXISTING game route and carries the contest in navigation state", async () => {
    api.get.mockResolvedValue({ data: DETAIL() });
    renderPage();
    await screen.findByText(/Build 3\/4/);
    fireEvent.click(screen.getByRole("button", { name: "Play Build 3/4" }));
    expect(await screen.findByTestId("game-path")).toHaveTextContent("/games/fraction-builder");
    expect(JSON.parse(screen.getByTestId("game-state").textContent)).toEqual({
      contest: { id: "c1", title: "Weekly Fractions Blitz", gameType: "MATH_FRACTION_BUILDER" },
    });
    // the page never posts anything itself: starting is the game's own /games/start
    expect(api.post).not.toHaveBeenCalled();
  });

  test("a different game type routes to its own game", async () => {
    api.get.mockResolvedValue({ data: DETAIL() });
    renderPage();
    await screen.findByText(/Match it/);
    fireEvent.click(screen.getByRole("button", { name: "Continue Match it" }));
    expect(await screen.findByTestId("game-path")).toHaveTextContent("/games/fraction-match");
    expect(JSON.parse(screen.getByTestId("game-state").textContent).contest.gameType).toBe("MATH_FRACTION_MATCH");
  });

  test("an upcoming contest can be viewed but nothing can be played", async () => {
    api.get.mockResolvedValue({
      data: DETAIL({ phase: "UPCOMING", challenges: CHALLENGES.map((c) => ({ ...c, status: "NOT_STARTED", canPlay: false })), progress: { completed: 0, total: 4 } }),
    });
    renderPage();
    await screen.findByText(/This contest starts/);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    buttons.forEach((b) => {
      expect(b).toBeDisabled();
      expect(b).toHaveTextContent("Not open yet");
    });
  });

  test("an ended contest says so and disables unfinished games", async () => {
    api.get.mockResolvedValue({
      data: DETAIL({ phase: "ENDED", challenges: CHALLENGES.map((c) => (c.status === "COMPLETED" ? c : { ...c, canPlay: false })) }),
    });
    renderPage();
    await screen.findByText(/This contest ended/);
    expect(within(row("Build 3/4")).getByRole("button")).toBeDisabled();
    expect(within(row("Build 3/4")).getByRole("button")).toHaveTextContent("Contest ended");
    expect(within(row("Build 1/2")).getByRole("button")).toHaveTextContent("Done");
  });

  test("a game with no known route, or removed content, can't be launched", async () => {
    api.get.mockResolvedValue({
      data: DETAIL({ challenges: [{ ...CHALLENGES[2], id: "gx", title: "Mystery", gameType: "NOT_A_REGISTERED_GAME", canPlay: true }, { ...CHALLENGES[2], id: "gy", title: "Removed content", gameType: null, label: null, canPlay: false }] }),
    });
    renderPage();
    await screen.findByText(/Mystery/);
    screen.getAllByRole("button").forEach((b) => expect(b).toBeDisabled());
  });

  test("a contest the student can't see (404) shows a friendly not-found state", async () => {
    api.get.mockRejectedValue({ response: { status: 404, data: { message: "Contest not found" } } });
    renderPage();
    expect(await screen.findByText("Contest not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Contests" })).toHaveAttribute("href", "/contests");
  });

  test("other failures show an error", async () => {
    api.get.mockRejectedValue({ response: { status: 500, data: { message: "Server exploded" } } });
    renderPage();
    expect(await screen.findByText("Error: Server exploded")).toBeInTheDocument();
  });

  test("the back link returns to the contest list", async () => {
    api.get.mockResolvedValue({ data: DETAIL() });
    renderPage();
    const back = await screen.findByRole("link", { name: /All contests/ });
    expect(back).toHaveAttribute("href", "/contests");
  });
});

describe("results link", () => {
  test("live and ended contests link to results; upcoming ones don't", async () => {
    api.get.mockResolvedValue({ data: DETAIL() });
    const live = renderPage();
    const link = await screen.findByRole("link", { name: /View results/ });
    expect(link).toHaveAttribute("href", "/contests/c1/results");
    live.unmount();

    api.get.mockResolvedValue({ data: DETAIL({ phase: "ENDED" }) });
    const ended = renderPage();
    expect(await screen.findByRole("link", { name: /View results/ })).toBeInTheDocument();
    ended.unmount();

    api.get.mockResolvedValue({ data: DETAIL({ phase: "UPCOMING" }) });
    renderPage();
    await screen.findByText(/This contest starts/);
    expect(screen.queryByRole("link", { name: /View results/ })).not.toBeInTheDocument();
  });
});

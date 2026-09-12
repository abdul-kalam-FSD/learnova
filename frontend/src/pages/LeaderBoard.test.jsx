import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import api from "../api/axios";
import Leaderboard from "./LeaderBoard";

// Phase 8: LeaderBoard.jsx previously had no test coverage at all
// (see PHASE_8_PROFILE_PROGRESS_AUDIT.md, issue #3). Minimal
// coverage of the loading/empty/populated states, and a regression
// lock on the Phase 8 wording fix (issue #2).

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

function mockApi({ leaderboard = [], currentUser = null, error = null } = {}) {
  api.get.mockImplementation((url) => {
    if (url.startsWith("/leaderboard")) {
      return error
        ? Promise.reject(error)
        : Promise.resolve({ data: { leaderboard, currentUser } });
    }
    return Promise.reject(new Error(`unmocked url: ${url}`));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Leaderboard", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    render(<Leaderboard />);
    expect(screen.getByText("Loading leaderboard...")).toBeInTheDocument();
  });

  test("shows an error state when the request fails", async () => {
    mockApi({ error: new Error("Network down") });
    render(<Leaderboard />);
    await waitFor(() => {
      expect(screen.getByText("Error: Network down")).toBeInTheDocument();
    });
  });

  test("renders ranked entries when the leaderboard has data", async () => {
    mockApi({
      leaderboard: [
        { userId: "u1", name: "Asha", xp: 900, rank: 1, isCurrentUser: false },
      ],
    });
    render(<Leaderboard />);
    await screen.findByText("Asha");
  });

  // Phase 8 (item #2 — legacy wording audit): the empty state used to
  // read "Complete an investigation to appear here.", which only
  // described case sessions even though ranking is driven by XP from
  // any completed session, games included.
  test("empty state uses game wording, not 'investigation'", async () => {
    mockApi({ leaderboard: [] });
    render(<Leaderboard />);
    await screen.findByText("Play a game to appear here.");
    expect(
      screen.queryByText("Complete an investigation to appear here."),
    ).not.toBeInTheDocument();
  });
});

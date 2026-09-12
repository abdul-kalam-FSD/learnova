import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import { ThemeProvider } from "../context/themeContext";
import Profile from "./Profile";

// Phase 8: Profile.jsx previously had no test coverage at all (see
// PHASE_8_PROFILE_PROGRESS_AUDIT.md, issue #3). This suite is
// deliberately minimal — it covers the loading/error states already
// present and locks in the Phase 8 wording fixes (issue #2) so they
// can't silently regress back to the legacy Bio Detective / Cases
// copy. It does not attempt full coverage of every existing branch.

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => vi.fn() };
});

const USER = { name: "Priya", grade: 8, xp_total: 450, streak_count: 4 };

function mockApi({ user = USER, userError = null, stats = null, progress = null } = {}) {
  api.get.mockImplementation((url) => {
    if (url === "/auth/me") {
      return userError
        ? Promise.reject(userError)
        : Promise.resolve({ data: { user } });
    }
    if (url === "/profile/stats") {
      return stats ? Promise.resolve({ data: stats }) : Promise.reject(new Error("no stats"));
    }
    if (url === "/progress") {
      return progress ? Promise.resolve({ data: progress }) : Promise.reject(new Error("no progress"));
    }
    if (url.startsWith("/public/standards/")) {
      return Promise.resolve({ data: { streams: [] } });
    }
    return Promise.reject(new Error(`unmocked url: ${url}`));
  });
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Profile />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Profile - loading and error states", () => {
  test("shows a loading state before /auth/me resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderProfile();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("shows an error state when /auth/me fails", async () => {
    mockApi({ userError: new Error("Network down") });
    renderProfile();
    await waitFor(() => {
      expect(screen.getByText("Error: Network down")).toBeInTheDocument();
    });
  });

  test("renders core user info even when /profile/stats fails", async () => {
    mockApi();
    renderProfile();
    await screen.findByText("Priya");
    expect(screen.queryByText("Games Played")).not.toBeInTheDocument();
  });
});

describe("Profile - Phase 8 wording fixes (issue #2)", () => {
  const STATS = {
    quizzesPlayed: 3,
    accuracy: 90,
    totalScore: 450,
    recentQuizzes: [],
  };

  test("tagline reads 'Learnova Student', not the legacy 'Bio Detective'", async () => {
    mockApi({ stats: STATS });
    renderProfile();
    await screen.findByText("Learnova Student");
    expect(screen.queryByText("Bio Detective")).not.toBeInTheDocument();
  });

  test("stat grid labels the session count 'Games Played', not 'Cases Played'", async () => {
    mockApi({ stats: STATS });
    renderProfile();
    await screen.findByText("Games Played");
    expect(screen.queryByText("Cases Played")).not.toBeInTheDocument();
  });

  test("empty Recent Activity uses game wording, not 'solve your first case'", async () => {
    mockApi({ stats: { ...STATS, quizzesPlayed: 0, recentQuizzes: [] } });
    renderProfile();
    await screen.findByText("No games played yet — play your first game!");
    expect(
      screen.queryByText("No investigations yet — solve your first case!"),
    ).not.toBeInTheDocument();
  });

  test("achievements grid uses 'First Game Completed', not 'First Case Solved'", async () => {
    mockApi({ stats: STATS });
    renderProfile();
    await screen.findByText("First Game Completed");
    expect(screen.queryByText("First Case Solved")).not.toBeInTheDocument();
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import FractionBuilder from "./FractionBuilder";

vi.mock("../../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

const LEVEL = {
  id: "lvl1",
  title: "Half Bridge",
  difficulty: "easy",
  payload: { target: { numerator: 1, denominator: 2 } },
};

const FULL_PAYLOAD = {
  target: { numerator: 1, denominator: 2 },
  pieces: [{ id: "p1", numerator: 1, denominator: 2 }],
  hint: "Try a single half piece.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 2, xp_total: 50 } });
    }
    return Promise.reject(new Error(`unmocked GET ${url}`));
  });

  api.post.mockImplementation((url) => {
    if (url === "/games/start") {
      return Promise.resolve({
        data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } },
      });
    }
    if (url === "/games/sess1/attempt") {
      return Promise.resolve({ data: { isCorrect: true } });
    }
    if (url === "/games/sess1/complete") {
      return Promise.resolve({
        data: { xpAwarded: 10, newStreak: 3, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <FractionBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FractionBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Fraction Builder...")).toBeInTheDocument();
  });

  test("shows an error state when loading content fails", async () => {
    api.get.mockImplementation((url) =>
      url === "/games/content"
        ? Promise.reject({ response: { data: { message: "No content for this grade" } } })
        : Promise.resolve({ data: { streak_count: 0, xp_total: 0 } }),
    );
    renderGame();
    await waitFor(() => {
      expect(
        screen.getByText("We couldn't load this game: No content for this grade"),
      ).toBeInTheDocument();
    });
  });
});

describe("FractionBuilder - full play flow", () => {
  test("select level -> play -> submit correct answer -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Half Bridge");
    expect(screen.getByText("Target: 1/2")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Half Bridge"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled(); // session isn't created until Start Mission
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", { gameType: "MATH_FRACTION_BUILDER", contentId: "lvl1" });

    // ---- Play screen ----
    await screen.findByText("Build a bridge worth 1/2");
    const checkButton = screen.getByRole("button", { name: "Check Bridge" });
    expect(checkButton).toBeDisabled(); // nothing placed yet

    // Tap the only available piece to place it on the bridge.
    fireEvent.click(screen.getByText("1/2"));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", { selectedPieceIds: ["p1"] });

    await screen.findByText("✓ Bridge holds!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+10 XP");
    expect(screen.getByText("🔥 Streak 3")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect attempt shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "Not quite — try again." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Half Bridge");
    fireEvent.click(screen.getByText("Half Bridge"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Build a bridge worth 1/2");

    fireEvent.click(screen.getByText("1/2"));
    fireEvent.click(screen.getByRole("button", { name: "Check Bridge" }));

    await screen.findByText("✕ The bridge collapses.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    // Still shows "Check Bridge", not "Claim Reward" — the student hasn't solved it.
    expect(screen.getByRole("button", { name: "Check Bridge" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("removing a placed piece disables Check Bridge again", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Half Bridge");
    fireEvent.click(screen.getByText("Half Bridge"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Build a bridge worth 1/2");

    fireEvent.click(screen.getByText("1/2")); // place it
    const checkButton = screen.getByRole("button", { name: "Check Bridge" });
    expect(checkButton).not.toBeDisabled();

    // The same fraction now appears in the "placed" row — tap it there to remove.
    fireEvent.click(screen.getAllByText("1/2")[0]);
    expect(checkButton).toBeDisabled();
  });
});

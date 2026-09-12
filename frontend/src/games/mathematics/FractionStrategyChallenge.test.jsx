import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import FractionStrategyChallenge from "./FractionStrategyChallenge";

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
  title: "Cross to 3/4",
  difficulty: "medium",
  payload: {
    target: { numerator: 3, denominator: 4 },
    max_moves: 3,
  },
};

const FULL_PAYLOAD = {
  target: { numerator: 3, denominator: 4 },
  pieces: [
    { id: "p1", numerator: 1, denominator: 4 },
    { id: "p2", numerator: 1, denominator: 2 },
    { id: "p3", numerator: 1, denominator: 8 },
  ],
  max_moves: 3,
  hint: "1/2 and 1/4 together make 3/4.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 2, xp_total: 40 } });
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
        data: { xpAwarded: 18, newStreak: 3, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <FractionStrategyChallenge />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FractionStrategyChallenge - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Fraction Strategy Challenge...")).toBeInTheDocument();
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

describe("FractionStrategyChallenge - full play flow", () => {
  test("select level -> play -> commit pieces toward the target -> submit correct -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Cross to 3/4");
    expect(screen.getByText("Target: 3/4 · 3 moves")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cross to 3/4"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_FRACTION_STRATEGY_CHALLENGE",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("TARGET 3/4");
    expect(screen.getByText("3 / 3 moves left")).toBeInTheDocument();

    // Commit 1/2, then 1/4 — no undo, each tap is a spent move. One
    // move is left to spare, so the Check button stays available.
    fireEvent.click(screen.getByRole("button", { name: "1/2" }));
    expect(screen.getByText("2 / 3 moves left")).toBeInTheDocument();
    expect(screen.getByText("Moves spent:")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1/4" }));
    expect(screen.getByText("1 / 3 moves left")).toBeInTheDocument();

    const checkButton = screen.getByRole("button", { name: "Check Crossing" });
    expect(checkButton).not.toBeDisabled();
    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedPieceIds: ["p2", "p1"],
    });

    await screen.findByText("✓ You crossed it!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+18 XP");
    expect(screen.getByText("🔥 Streak 3")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("a rejected combination shows failure feedback", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "That combination overshoots the target." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Cross to 3/4");
    fireEvent.click(screen.getByText("Cross to 3/4"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("TARGET 3/4");

    fireEvent.click(screen.getByRole("button", { name: "1/2" }));
    fireEvent.click(screen.getByRole("button", { name: "1/8" }));
    expect(screen.getByText("1 / 3 moves left")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check Crossing" }));

    await screen.findByText("✕ That's not the right combination.");
    expect(screen.getByText("That combination overshoots the target.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("running out of moves before crossing shows an out-of-moves message and Try Again resets the board", async () => {
    const tightLevel = { ...LEVEL, payload: { ...LEVEL.payload, max_moves: 1 } };
    const tightPayload = { ...FULL_PAYLOAD, max_moves: 1 };

    api.get.mockImplementation((url) => {
      if (url === "/games/content") {
        return Promise.resolve({ data: { content: [tightLevel] } });
      }
      if (url === "/home") {
        return Promise.resolve({ data: { streak_count: 0, xp_total: 0 } });
      }
      return Promise.reject(new Error(`unmocked GET ${url}`));
    });
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({
          data: { sessionId: "sess1", content: { payload: tightPayload } },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Cross to 3/4");
    fireEvent.click(screen.getByText("Cross to 3/4"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("TARGET 3/4");

    // Only one move allowed — a single 1/4 piece can't reach 3/4 alone.
    fireEvent.click(screen.getByRole("button", { name: "1/4" }));

    await screen.findByText("Out of moves.");
    expect(screen.queryByRole("button", { name: "Check Crossing" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    // Board resets — all pieces available again, no moves spent.
    expect(screen.getByText("1 / 1 moves left")).toBeInTheDocument();
    expect(screen.queryByText("Moves spent:")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1/4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1/2" })).toBeInTheDocument();
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import EquationBalanceStrategy from "./EquationBalanceStrategy";

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
  title: "Balance 2x + 6 = 20",
  difficulty: "medium",
  payload: { max_moves: 2 },
};

const FULL_PAYLOAD = {
  equation_label: "2x + 6 = 20",
  initial_equation: { a: 2, b: 6, c: 20 },
  available_ops: [
    { id: "op1", op: "subtract", value: 6, label: "−6" },
    { id: "op2", op: "divide", value: 2, label: "÷2" },
  ],
  max_moves: 2,
  hint: "Undo the addition first, then the multiplication.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 1, xp_total: 30 } });
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
        data: { xpAwarded: 19, newStreak: 2, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <EquationBalanceStrategy />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EquationBalanceStrategy - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Equation Balance Strategy...")).toBeInTheDocument();
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

describe("EquationBalanceStrategy - full play flow", () => {
  test("select level -> play -> apply operations to both sides -> submit correct -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Balance 2x + 6 = 20");
    expect(screen.getByText("2 moves")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Balance 2x + 6 = 20"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_EQUATION_BALANCE_STRATEGY",
      contentId: "lvl1",
    });

    // ---- Play screen: starting state ----
    await screen.findByText("2x + 6 = 20");
    expect(screen.getByText("2x + 6")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("2 / 2 moves left")).toBeInTheDocument();

    // Apply -6 to both sides: 2x = 14
    fireEvent.click(screen.getByRole("button", { name: "−6" }));
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("1 / 2 moves left")).toBeInTheDocument();
    expect(screen.getByText("Moves applied:")).toBeInTheDocument();

    // Apply ÷2 to both sides: x = 7
    fireEvent.click(screen.getByRole("button", { name: "÷2" }));
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("0 / 2 moves left")).toBeInTheDocument();

    const checkButton = screen.getByRole("button", { name: "Check Balance" });
    expect(checkButton).not.toBeDisabled();
    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      operationSequence: ["op1", "op2"],
    });

    await screen.findByText("✓ Balanced!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+19 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("a rejected attempt (server disagrees) shows failure feedback without resetting the moves used", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "That's not balanced — check your arithmetic." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Balance 2x + 6 = 20");
    fireEvent.click(screen.getByText("Balance 2x + 6 = 20"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("2x + 6 = 20");

    fireEvent.click(screen.getByRole("button", { name: "−6" }));
    fireEvent.click(screen.getByRole("button", { name: "÷2" }));
    fireEvent.click(screen.getByRole("button", { name: "Check Balance" }));

    await screen.findByText("✕ That's not balanced within your moves.");
    expect(screen.getByText("That's not balanced — check your arithmetic.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
    // The two moves already spent are still shown as used, not undone.
    expect(screen.getByText("0 / 2 moves left")).toBeInTheDocument();
  });

  test("running out of moves before solving shows an out-of-moves message and Try Again resets the board", async () => {
    const tightLevel = { ...LEVEL, payload: { max_moves: 1 } };
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
    await screen.findByText("Balance 2x + 6 = 20");
    fireEvent.click(screen.getByText("Balance 2x + 6 = 20"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("2x + 6 = 20");

    // Only one move allowed — applying just "-6" isn't enough to solve it.
    fireEvent.click(screen.getByRole("button", { name: "−6" }));

    await screen.findByText("Out of moves — not balanced yet.");
    expect(screen.queryByRole("button", { name: "Check Balance" })).not.toBeInTheDocument();
    const tryAgainButton = screen.getByRole("button", { name: "Try Again" });

    fireEvent.click(tryAgainButton);

    // Board resets to the original equation with all moves restored.
    expect(screen.getByText("2x + 6")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("1 / 1 moves left")).toBeInTheDocument();
    expect(screen.queryByText("Moves applied:")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "−6" })).toBeInTheDocument();
  });
});

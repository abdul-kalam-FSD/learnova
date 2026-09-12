import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import EquationBuilder from "./EquationBuilder";

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
  title: "Build: x = 5",
  difficulty: "easy",
  payload: {
    scrambled_pieces: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
  },
};

const FULL_PAYLOAD = {
  scrambled_pieces: [
    { id: "p1", label: "5" },
    { id: "p2", label: "x" },
    { id: "p3", label: "=" },
  ],
  hint: "The variable comes first, then the equals sign, then the value.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 1, xp_total: 25 } });
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
        data: { xpAwarded: 14, newStreak: 2, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <EquationBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EquationBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Equation Builder...")).toBeInTheDocument();
  });

  test("shows an error state when loading content fails, and Back to Home navigates away", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });
});

describe("EquationBuilder - full play flow", () => {
  test("select level -> mission briefing -> tap pieces in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Build: x = 5");
    expect(screen.getByText("3 pieces to arrange")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Build: x = 5"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_EQUATION_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("BUILD THE EQUATION");
    const checkButton = screen.getByRole("button", { name: "Check Equation" });
    expect(checkButton).toBeDisabled();

    // Tap pieces in the correct order: x, =, 5
    fireEvent.click(screen.getByText("x"));
    fireEvent.click(screen.getByText("="));
    fireEvent.click(screen.getByText("5"));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["p2", "p3", "p1"],
    });

    await screen.findByText("✓ Valid equation!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+14 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("a wrong-order equation shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "That's out of order — try again." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Build: x = 5");
    fireEvent.click(screen.getByText("Build: x = 5"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("BUILD THE EQUATION");

    fireEvent.click(screen.getByText("5"));
    fireEvent.click(screen.getByText("x"));
    fireEvent.click(screen.getByText("="));
    fireEvent.click(screen.getByRole("button", { name: "Check Equation" }));

    await screen.findByText("✕ That's not a valid equation.");
    expect(screen.getByText("That's out of order — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Equation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("undo-to-here removes a piece and everything placed after it", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Build: x = 5");
    fireEvent.click(screen.getByText("Build: x = 5"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("BUILD THE EQUATION");

    fireEvent.click(screen.getByText("x"));
    fireEvent.click(screen.getByText("="));
    fireEvent.click(screen.getByText("5"));

    const checkButton = screen.getByRole("button", { name: "Check Equation" });
    expect(checkButton).not.toBeDisabled();

    // Tap the first slot to undo back to it — every piece returns to the tray.
    fireEvent.click(screen.getByText("x"));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(screen.getByText("=")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});

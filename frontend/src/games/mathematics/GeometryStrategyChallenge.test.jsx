import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import GeometryStrategyChallenge from "./GeometryStrategyChallenge";

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
  title: "Rectangle Perimeter 12",
  difficulty: "medium",
  payload: {
    target_perimeter: 12,
    unit: "cm",
    max_moves: 2,
  },
};

const FULL_PAYLOAD = {
  shape_label: "rectangle",
  target_perimeter: 12,
  unit: "cm",
  max_moves: 2,
  pieces: [
    { id: "p1", length: 6 },
    { id: "p2", length: 6 },
    { id: "p3", length: 4 },
    { id: "p4", length: 8 },
  ],
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
        data: { xpAwarded: 15, newStreak: 2, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <GeometryStrategyChallenge />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GeometryStrategyChallenge - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Geometry Strategy Challenge...")).toBeInTheDocument();
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

describe("GeometryStrategyChallenge - full play flow", () => {
  test("select level -> play -> pick a combo -> submit correct -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Rectangle Perimeter 12");
    expect(screen.getByText("Target 12 cm · max 2 moves")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Rectangle Perimeter 12"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_GEOMETRY_STRATEGY_CHALLENGE",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Target perimeter: 12 cm");
    expect(screen.getByText("Selected: 0 cm")).toBeInTheDocument();
    expect(screen.getByText("Moves left: 2")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "Submit Combo" });
    expect(submitButton).toBeDisabled();

    // Select both 6cm pieces to reach the 12cm target.
    const sixPieces = screen.getAllByRole("button", { name: "6 cm" });
    fireEvent.click(sixPieces[0]);
    expect(screen.getByText("Selected: 6 cm")).toBeInTheDocument();
    expect(screen.getByText("Moves left: 1")).toBeInTheDocument();

    fireEvent.click(sixPieces[1]);
    expect(screen.getByText("Selected: 12 cm")).toBeInTheDocument();
    expect(screen.getByText("Moves left: 0")).toBeInTheDocument();
    // Budget spent — the untouched pieces are now disabled.
    expect(screen.getByRole("button", { name: "4 cm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "8 cm" })).toBeDisabled();

    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedPieceIds: ["p1", "p2"],
    });

    await screen.findByText("✓ Perfect combo!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+15 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("Back mid-strategy-round asks to confirm, and Leave returns to level select", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Rectangle Perimeter 12");
    fireEvent.click(screen.getByText("Rectangle Perimeter 12"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Target perimeter: 12 cm");

    fireEvent.click(screen.getByLabelText("Go back"));
    expect(await screen.findByText("Leave this mission?")).toBeInTheDocument();
    expect(screen.getByText("Target perimeter: 12 cm")).toBeInTheDocument(); // still mid-round underneath

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(screen.queryByText("Leave this mission?")).not.toBeInTheDocument();
    await screen.findByText("Rectangle Perimeter 12"); // back on level select
  });

  test("a wrong combo lets the student retry with a cleared board", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "That combo doesn't hit 12cm." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Rectangle Perimeter 12");
    fireEvent.click(screen.getByText("Rectangle Perimeter 12"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Target perimeter: 12 cm");

    fireEvent.click(screen.getByRole("button", { name: "4 cm" }));
    fireEvent.click(screen.getByRole("button", { name: "8 cm" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Combo" }));

    await screen.findByText("Not quite — try a different combo.");
    expect(screen.getByText("That combo doesn't hit 12cm.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    // Board resets — selection cleared, submit disabled again.
    expect(screen.getByText("Selected: 0 cm")).toBeInTheDocument();
    expect(screen.getByText("Moves left: 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Combo" })).toBeDisabled();
  });

  test("toggling a selected piece off before submitting deselects it and frees up a move", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Rectangle Perimeter 12");
    fireEvent.click(screen.getByText("Rectangle Perimeter 12"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Target perimeter: 12 cm");

    const fourCm = screen.getByRole("button", { name: "4 cm" });
    fireEvent.click(fourCm);
    expect(screen.getByText("Selected: 4 cm")).toBeInTheDocument();
    expect(screen.getByText("Moves left: 1")).toBeInTheDocument();

    // Tap it again to deselect.
    fireEvent.click(fourCm);
    expect(screen.getByText("Selected: 0 cm")).toBeInTheDocument();
    expect(screen.getByText("Moves left: 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Combo" })).toBeDisabled();
  });
});
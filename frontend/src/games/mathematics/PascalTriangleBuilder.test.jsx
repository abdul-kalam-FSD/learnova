import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import PascalTriangleBuilder from "./PascalTriangleBuilder";

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
  title: "Row 3 of Pascal's Triangle",
  difficulty: "medium",
  payload: {
    prior_rows: [[1], [1, 1], [1, 2, 1]],
  },
};

const FULL_PAYLOAD = {
  prior_rows: [[1], [1, 1], [1, 2, 1]],
  scrambled_pieces: [
    { id: "t1", label: "3" },
    { id: "t2", label: "1" },
    { id: "t3", label: "3" },
    { id: "t4", label: "1" },
  ],
  hint: "Each number is the sum of the two entries directly above it.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 1, xp_total: 20 } });
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
        data: { xpAwarded: 15, newStreak: 2, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <PascalTriangleBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PascalTriangleBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Pascal's Triangle Builder...")).toBeInTheDocument();
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

describe("PascalTriangleBuilder - full play flow", () => {
  test("select level -> mission briefing -> tap tiles in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Row 3 of Pascal's Triangle");
    fireEvent.click(screen.getByText("Row 3 of Pascal's Triangle"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_PASCAL_TRIANGLE_BUILD",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("BUILD ROW 4");
    const checkButton = screen.getByRole("button", { name: "Check Row" });
    expect(checkButton).toBeDisabled();

    // Tap tiles from the tray in order: 1, 3, 3, 1. Tray buttons have a
    // plain "N" accessible name; once placed a tile becomes an undo
    // button named "N ↺", so this never matches an already-placed tile.
    const tapTrayTile = (label) => {
      fireEvent.click(screen.getAllByRole("button", { name: label })[0]);
    };
    tapTrayTile("1");
    tapTrayTile("3");
    tapTrayTile("3");
    tapTrayTile("1");
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["t2", "t1", "t3", "t4"],
    });

    await screen.findByText("✓ That's the row!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+15 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("a wrong row shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "Check the sums again." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Row 3 of Pascal's Triangle");
    fireEvent.click(screen.getByText("Row 3 of Pascal's Triangle"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("BUILD ROW 4");

    const tray = screen.getByText("Tap tiles to add them in order:").nextElementSibling;
    let buttons = tray.querySelectorAll("button");
    fireEvent.click(buttons[0]);
    buttons = tray.querySelectorAll("button");
    fireEvent.click(buttons[0]);
    buttons = tray.querySelectorAll("button");
    fireEvent.click(buttons[0]);
    buttons = tray.querySelectorAll("button");
    fireEvent.click(buttons[0]);

    fireEvent.click(screen.getByRole("button", { name: "Check Row" }));

    await screen.findByText("✕ Not quite — check the sums above.");
    expect(screen.getByText("Check the sums again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Row" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("tapping a placed tile's undo button removes it and everything after it", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Row 3 of Pascal's Triangle");
    fireEvent.click(screen.getByText("Row 3 of Pascal's Triangle"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("BUILD ROW 4");

    const trayContainer = () =>
      screen.getByText("Tap tiles to add them in order:").nextElementSibling;
    fireEvent.click(trayContainer().querySelectorAll("button")[0]);
    fireEvent.click(trayContainer().querySelectorAll("button")[0]);
    fireEvent.click(trayContainer().querySelectorAll("button")[0]);
    fireEvent.click(trayContainer().querySelectorAll("button")[0]);

    const checkButton = screen.getByRole("button", { name: "Check Row" });
    expect(checkButton).not.toBeDisabled();
    expect(trayContainer().querySelectorAll("button")).toHaveLength(0);

    // Undo the first placed tile — everything placed returns to the tray.
    const undoButtons = screen.getAllByText((content) => content.includes("↺"));
    fireEvent.click(undoButtons[0]);

    expect(checkButton).toBeDisabled();
    expect(trayContainer().querySelectorAll("button")).toHaveLength(4);
  });
});

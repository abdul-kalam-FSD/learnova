import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import CodeOrderBuilder from "./CodeOrderBuilder";

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
  title: "Assign Before Use",
  difficulty: "easy",
  payload: {
    scrambled_lines: [{ id: "l1", label: "x = 5" }, { id: "l2", label: "print(x)" }],
  },
};

const FULL_PAYLOAD = {
  scenario_label: "A simple two-line script",
  scrambled_lines: [
    { id: "l2", label: "print(x)" },
    { id: "l1", label: "x = 5" },
  ],
  hint: "Variables must be defined before they're used.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 3, xp_total: 40 } });
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
        data: { xpAwarded: 12, newStreak: 4, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <CodeOrderBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CodeOrderBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Code Order Builder...")).toBeInTheDocument();
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

describe("CodeOrderBuilder - full play flow", () => {
  test("select level -> mission briefing -> arrange lines in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Assign Before Use");
    expect(screen.getByText("2-line program")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Assign Before Use"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "CS_CODE_ORDER_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("A simple two-line script");
    const runButton = screen.getByRole("button", { name: "Run Program" });
    expect(runButton).toBeDisabled();

    // Tap lines in the order the program must execute.
    fireEvent.click(screen.getByText("x = 5"));
    fireEvent.click(screen.getByText("print(x)"));
    expect(runButton).not.toBeDisabled();

    fireEvent.click(runButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["l1", "l2"],
    });

    await screen.findByText("✓ Program runs correctly!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+12 XP");
    expect(screen.getByText("🔥 Streak 4")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect order shows failure feedback and does not unlock the reward button", async () => {
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
    await screen.findByText("Assign Before Use");
    fireEvent.click(screen.getByText("Assign Before Use"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("A simple two-line script");

    fireEvent.click(screen.getByText("print(x)"));
    fireEvent.click(screen.getByText("x = 5"));
    fireEvent.click(screen.getByRole("button", { name: "Run Program" }));

    await screen.findByText("✕ That's not the right order.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Program" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("tapping an earlier placed line undoes it and everything after it, back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Assign Before Use");
    fireEvent.click(screen.getByText("Assign Before Use"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("A simple two-line script");

    fireEvent.click(screen.getByText("x = 5"));
    fireEvent.click(screen.getByText("print(x)"));
    const runButton = screen.getByRole("button", { name: "Run Program" });
    expect(runButton).not.toBeDisabled();

    // Undo the first placed line — both lines should return to the tray.
    fireEvent.click(screen.getByText("1. x = 5"));
    expect(runButton).toBeDisabled();
    expect(screen.getByText("x = 5")).toBeInTheDocument();
    expect(screen.getByText("print(x)")).toBeInTheDocument();
  });
});

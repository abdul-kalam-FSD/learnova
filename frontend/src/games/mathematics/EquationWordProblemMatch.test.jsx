import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import EquationWordProblemMatch from "./EquationWordProblemMatch";

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
  title: "Translating Word Problems",
  difficulty: "medium",
  payload: {
    slots: [{ id: "s1", label: "A number increased by 5 equals 12." }],
  },
};

const FULL_PAYLOAD = {
  scenario: "Match each word problem to its correct equation.",
  slots: [{ id: "s1", label: "A number increased by 5 equals 12." }],
  components: [
    { id: "c1", label: "x + 5 = 12" },
    { id: "c2", label: "x - 5 = 12" },
  ],
  hint: "Look for the operation the words describe — the phrase 'increased by' means addition.",
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
        data: { xpAwarded: 13, newStreak: 2, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <EquationWordProblemMatch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EquationWordProblemMatch - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Equation Word Problem Match...")).toBeInTheDocument();
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

describe("EquationWordProblemMatch - full play flow", () => {
  test("select level -> mission briefing -> pick item, assign to slot -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Translating Word Problems");
    expect(screen.getByText("1 stories")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Translating Word Problems"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_EQUATION_WORD_PROBLEM_MATCH",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Match each word problem to its correct equation.");
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).toBeDisabled();

    fireEvent.click(screen.getByText("x + 5 = 12"));
    fireEvent.click(screen.getByText("A number increased by 5 equals 12."));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      mapping: { s1: "c1" },
    });

    await screen.findByText("✓ All matched correctly!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+13 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect match shows failure feedback and does not unlock the reward button", async () => {
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
    await screen.findByText("Translating Word Problems");
    fireEvent.click(screen.getByText("Translating Word Problems"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Match each word problem to its correct equation.");

    fireEvent.click(screen.getByText("x - 5 = 12"));
    fireEvent.click(screen.getByText("A number increased by 5 equals 12."));
    fireEvent.click(screen.getByRole("button", { name: "Check Matches" }));

    await screen.findByText("✕ Not quite right.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Matches" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("re-tapping a filled slot with nothing selected frees it back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Translating Word Problems");
    fireEvent.click(screen.getByText("Translating Word Problems"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Match each word problem to its correct equation.");

    fireEvent.click(screen.getByText("x + 5 = 12"));
    fireEvent.click(screen.getByText("A number increased by 5 equals 12."));
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).not.toBeDisabled();

    // Tap the now-filled slot again with nothing selected — it should free up.
    fireEvent.click(screen.getByText("A number increased by 5 equals 12."));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("x + 5 = 12")).toBeInTheDocument();
  });
});

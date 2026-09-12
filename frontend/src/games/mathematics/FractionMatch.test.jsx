import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import FractionMatch from "./FractionMatch";

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
  title: "Comparing Unit Fractions",
  difficulty: "medium",
  payload: {
    slots: [{ id: "s1", label: "3/4" }],
  },
};

const FULL_PAYLOAD = {
  scenario: "Match each fraction to its correct description.",
  slots: [{ id: "s1", label: "3/4" }],
  components: [
    { id: "c1", label: "Equivalent to 6/8" },
    { id: "c2", label: "Equivalent to 1/2" },
  ],
  hint: "Simplify each fraction and compare.",
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
      <FractionMatch />
    </MemoryRouter>,
  );
}

function renderGameFromChapter(chapterId) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: "/games/fraction-match", state: { chapterId } }]}
    >
      <FractionMatch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FractionMatch - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Fraction Match...")).toBeInTheDocument();
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

  test("Back from the error state returns to the chapter mission when launched with a chapterId", async () => {
    api.get.mockImplementation((url) =>
      url === "/games/content"
        ? Promise.reject({ response: { data: { message: "No content for this grade" } } })
        : Promise.resolve({ data: { streak_count: 0, xp_total: 0 } }),
    );
    renderGameFromChapter("ch-42");
    await waitFor(() => {
      expect(
        screen.getByText("We couldn't load this game: No content for this grade"),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith("/mission/ch-42");
  });

  test("Back from the level-select screen goes to /home on direct entry (no chapterId)", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Comparing Unit Fractions");
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("Back from the level-select screen returns to the chapter mission when launched with a chapterId", async () => {
    mockHappyPath();
    renderGameFromChapter("ch-7");
    await screen.findByText("Comparing Unit Fractions");
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(navigateMock).toHaveBeenCalledWith("/mission/ch-7");
  });
});

describe("FractionMatch - full play flow", () => {
  test("select level -> mission briefing -> pick item, assign to slot -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Comparing Unit Fractions");
    expect(screen.getByText("1 fractions")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Comparing Unit Fractions"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_FRACTION_MATCH",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Match each fraction to its correct description.");
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).toBeDisabled();

    fireEvent.click(screen.getByText("Equivalent to 6/8"));
    fireEvent.click(screen.getByText("3/4"));
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
    await screen.findByText("Comparing Unit Fractions");
    fireEvent.click(screen.getByText("Comparing Unit Fractions"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Match each fraction to its correct description.");

    fireEvent.click(screen.getByText("Equivalent to 1/2"));
    fireEvent.click(screen.getByText("3/4"));
    fireEvent.click(screen.getByRole("button", { name: "Check Matches" }));

    await screen.findByText("✕ Not quite right.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Matches" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("re-tapping a filled slot with nothing selected frees it back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Comparing Unit Fractions");
    fireEvent.click(screen.getByText("Comparing Unit Fractions"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Match each fraction to its correct description.");

    fireEvent.click(screen.getByText("Equivalent to 6/8"));
    fireEvent.click(screen.getByText("3/4"));
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).not.toBeDisabled();

    // Tap the now-filled slot again with nothing selected — it should free up.
    fireEvent.click(screen.getByText("3/4"));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("Equivalent to 6/8")).toBeInTheDocument();
  });
});

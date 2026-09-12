import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import WordForge from "./WordForge";

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
  title: "Prefix Practice",
  difficulty: "easy",
  payload: {
    scrambled_pieces: [
      { id: "p1", label: "re" },
      { id: "p2", label: "do" },
    ],
  },
};

const FULL_PAYLOAD = {
  target_meaning: "to do again",
  scrambled_pieces: [
    { id: "p2", label: "do" },
    { id: "p1", label: "re" },
  ],
  hint: "The prefix meaning 'again' comes first.",
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
      <WordForge />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WordForge - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Word Forge...")).toBeInTheDocument();
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

describe("WordForge - full play flow", () => {
  test("select level -> mission briefing -> assemble morphemes in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Prefix Practice");
    expect(screen.getByText("2 pieces")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Prefix Practice"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "ENGLISH_WORD_FORGE",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("to do again");
    const checkButton = screen.getByRole("button", { name: "Check Word" });
    expect(checkButton).toBeDisabled();

    // Tap pieces in the correct morpheme order: prefix, then root.
    fireEvent.click(screen.getByRole("button", { name: "re" }));
    fireEvent.click(screen.getByRole("button", { name: "do" }));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["p1", "p2"],
    });

    await screen.findByText("✓ Word forged correctly!");

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
    await screen.findByText("Prefix Practice");
    fireEvent.click(screen.getByText("Prefix Practice"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("to do again");

    fireEvent.click(screen.getByRole("button", { name: "do" }));
    fireEvent.click(screen.getByRole("button", { name: "re" }));
    fireEvent.click(screen.getByRole("button", { name: "Check Word" }));

    await screen.findByText("✕ That's not quite the word.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Word" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("tapping an earlier placed piece undoes it and everything after it, back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Prefix Practice");
    fireEvent.click(screen.getByText("Prefix Practice"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("to do again");

    fireEvent.click(screen.getByRole("button", { name: "re" }));
    fireEvent.click(screen.getByRole("button", { name: "do" }));
    const checkButton = screen.getByRole("button", { name: "Check Word" });
    expect(checkButton).not.toBeDisabled();

    // Undo the first placed piece — both pieces should return to the tray.
    fireEvent.click(screen.getAllByRole("button", { name: "re" })[0]);
    expect(checkButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "re" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "do" })).toBeInTheDocument();
  });
});

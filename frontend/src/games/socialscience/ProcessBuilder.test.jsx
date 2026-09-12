import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import ProcessBuilder from "./ProcessBuilder";

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
  title: "How a Bill Becomes Law",
  difficulty: "medium",
  payload: {
    scrambled_steps: [{ id: "s1" }, { id: "s2" }],
  },
};

const FULL_PAYLOAD = {
  scenario_label: "Trace the civic process from proposal to enactment.",
  scrambled_steps: [
    { id: "s2", label: "The bill is signed into law" },
    { id: "s1", label: "A bill is introduced in the legislature" },
  ],
  hint: "A bill can't be signed before it's introduced.",
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
        data: { xpAwarded: 22, newStreak: 4, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <ProcessBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProcessBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Civic Process Builder...")).toBeInTheDocument();
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

describe("ProcessBuilder - level select", () => {
  test("lists the level with its step count", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("How a Bill Becomes Law");
    expect(screen.getByText("2-step process")).toBeInTheDocument();
  });
});

describe("ProcessBuilder - full play flow", () => {
  test("select level -> mission briefing -> place steps in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("How a Bill Becomes Law");
    fireEvent.click(screen.getByText("How a Bill Becomes Law"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "SOCIAL_SCIENCE_PROCESS_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Trace the civic process from proposal to enactment.");
    const checkButton = screen.getByRole("button", { name: "Check Process" });
    expect(checkButton).toBeDisabled();

    // Placeholder shown before any step is placed.
    expect(screen.getByText("— tap steps below to start —")).toBeInTheDocument();

    // Tap steps in the correct order.
    fireEvent.click(screen.getByText("A bill is introduced in the legislature"));
    fireEvent.click(screen.getByText("The bill is signed into law"));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["s1", "s2"],
    });

    await screen.findByText("✓ That's the correct process order!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+22 XP");
    expect(screen.getByText("🔥 Streak 4")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect order shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({
          data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } },
        });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "Not quite — try again." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("How a Bill Becomes Law");
    fireEvent.click(screen.getByText("How a Bill Becomes Law"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Trace the civic process from proposal to enactment.");

    fireEvent.click(screen.getByText("The bill is signed into law"));
    fireEvent.click(screen.getByText("A bill is introduced in the legislature"));
    fireEvent.click(screen.getByRole("button", { name: "Check Process" }));

    await screen.findByText("✕ That's not quite the right order.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Process" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("tapping an earlier placed step undoes it and everything after it, back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("How a Bill Becomes Law");
    fireEvent.click(screen.getByText("How a Bill Becomes Law"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Trace the civic process from proposal to enactment.");

    fireEvent.click(screen.getByText("A bill is introduced in the legislature"));
    fireEvent.click(screen.getByText("The bill is signed into law"));
    const checkButton = screen.getByRole("button", { name: "Check Process" });
    expect(checkButton).not.toBeDisabled();

    // Undo the first placed step — both steps should return to the tray.
    fireEvent.click(screen.getByText("1. A bill is introduced in the legislature"));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("A bill is introduced in the legislature")).toBeInTheDocument();
    expect(screen.getByText("The bill is signed into law")).toBeInTheDocument();
    expect(screen.getByText("— tap steps below to start —")).toBeInTheDocument();
  });
});

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
  title: "The Accounting Cycle",
  difficulty: "medium",
  payload: {
    scrambled_steps: [
      { id: "st1", label: "Prepare the trial balance" },
      { id: "st2", label: "Record the transaction in the journal" },
    ],
  },
};

const FULL_PAYLOAD = {
  scenario_label: "Closing the books for the month",
  scrambled_steps: [
    { id: "st1", label: "Prepare the trial balance" },
    { id: "st2", label: "Record the transaction in the journal" },
  ],
  hint: "Every transaction has to be recorded before it can be summarized.",
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
      <ProcessBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Commerce ProcessBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Commerce Process Builder...")).toBeInTheDocument();
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

describe("Commerce ProcessBuilder - full play flow", () => {
  test("select level -> mission briefing -> arrange steps in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("The Accounting Cycle");
    expect(screen.getByText("2-step process")).toBeInTheDocument();
    fireEvent.click(screen.getByText("The Accounting Cycle"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "COMMERCE_PROCESS_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Closing the books for the month");
    const checkButton = screen.getByRole("button", { name: "Check Process" });
    expect(checkButton).toBeDisabled();

    // Tap steps in the correct chronological order.
    fireEvent.click(screen.getByText("Record the transaction in the journal"));
    fireEvent.click(screen.getByText("Prepare the trial balance"));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["st2", "st1"],
    });

    await screen.findByText("✓ That's the correct process order!");

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
    await screen.findByText("The Accounting Cycle");
    fireEvent.click(screen.getByText("The Accounting Cycle"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Closing the books for the month");

    fireEvent.click(screen.getByText("Prepare the trial balance"));
    fireEvent.click(screen.getByText("Record the transaction in the journal"));
    fireEvent.click(screen.getByRole("button", { name: "Check Process" }));

    await screen.findByText("✕ That's not quite the right order.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Process" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("tapping an earlier placed step undoes it and everything after it, back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("The Accounting Cycle");
    fireEvent.click(screen.getByText("The Accounting Cycle"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Closing the books for the month");

    fireEvent.click(screen.getByText("Record the transaction in the journal"));
    fireEvent.click(screen.getByText("Prepare the trial balance"));
    const checkButton = screen.getByRole("button", { name: "Check Process" });
    expect(checkButton).not.toBeDisabled();

    // Undo the first placed step — both steps should return to the tray.
    fireEvent.click(screen.getByText("1. Record the transaction in the journal"));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("Record the transaction in the journal")).toBeInTheDocument();
    expect(screen.getByText("Prepare the trial balance")).toBeInTheDocument();
  });
});

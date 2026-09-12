import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import TimelineBuilder from "./TimelineBuilder";

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
  title: "Rise of the Mauryas",
  difficulty: "medium",
  payload: {
    scrambled_events: [
      { id: "e1", label: "Alexander invades the Indus valley" },
      { id: "e2", label: "Chandragupta Maurya founds the empire" },
    ],
  },
};

const FULL_PAYLOAD = {
  era_label: "Ancient India",
  scrambled_events: [
    { id: "e2", label: "Chandragupta Maurya founds the empire" },
    { id: "e1", label: "Alexander invades the Indus valley" },
  ],
  hint: "Think about who came to power after whom.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 2, xp_total: 50 } });
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
        data: { xpAwarded: 15, newStreak: 3, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <TimelineBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TimelineBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Timeline Builder...")).toBeInTheDocument();
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

describe("TimelineBuilder - full play flow", () => {
  test("select level -> mission briefing -> sequence events in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Rise of the Mauryas");
    expect(screen.getByText("2-event timeline")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Rise of the Mauryas"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "HISTORY_TIMELINE_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Ancient India");
    const checkButton = screen.getByRole("button", { name: "Check Timeline" });
    expect(checkButton).toBeDisabled();

    // Tap events in the correct chronological order.
    fireEvent.click(screen.getByText("Chandragupta Maurya founds the empire"));
    fireEvent.click(screen.getByText("Alexander invades the Indus valley"));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["e2", "e1"],
    });

    await screen.findByText("✓ Timeline reconstructed correctly!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+15 XP");
    expect(screen.getByText("🔥 Streak 3")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect sequence shows failure feedback and does not unlock the reward button", async () => {
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
    await screen.findByText("Rise of the Mauryas");
    fireEvent.click(screen.getByText("Rise of the Mauryas"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Ancient India");

    fireEvent.click(screen.getByText("Alexander invades the Indus valley"));
    fireEvent.click(screen.getByText("Chandragupta Maurya founds the empire"));
    fireEvent.click(screen.getByRole("button", { name: "Check Timeline" }));

    await screen.findByText("✕ That's not the right sequence.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Timeline" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("tapping an earlier step undoes it and everything after it, back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Rise of the Mauryas");
    fireEvent.click(screen.getByText("Rise of the Mauryas"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Ancient India");

    fireEvent.click(screen.getByText("Chandragupta Maurya founds the empire"));
    fireEvent.click(screen.getByText("Alexander invades the Indus valley"));
    const checkButton = screen.getByRole("button", { name: "Check Timeline" });
    expect(checkButton).not.toBeDisabled();

    // Undo the first placed step — both events should return to the tray.
    fireEvent.click(screen.getByText("1. Chandragupta Maurya founds the empire"));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("Chandragupta Maurya founds the empire")).toBeInTheDocument();
    expect(screen.getByText("Alexander invades the Indus valley")).toBeInTheDocument();
  });
});

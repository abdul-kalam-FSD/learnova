import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import CauseEffectMatch from "./CauseEffectMatch";

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
  title: "The Fall of an Empire",
  difficulty: "hard",
  payload: {
    slots: [{ id: "s1", label: "Heavy taxation on colonies" }],
  },
};

const FULL_PAYLOAD = {
  scenario: "A declining empire raises taxes to fund its wars.",
  slots: [{ id: "s1", label: "Heavy taxation on colonies" }],
  components: [
    { id: "c1", label: "Colonial unrest and eventual revolt" },
    { id: "c2", label: "A sudden population boom" },
  ],
  hint: "Think about what taxation without benefit tends to provoke.",
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
        data: { xpAwarded: 20, newStreak: 2, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <CauseEffectMatch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CauseEffectMatch - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Cause & Effect Match...")).toBeInTheDocument();
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

describe("CauseEffectMatch - full play flow", () => {
  test("select level -> mission briefing -> pick outcome, assign to event -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("The Fall of an Empire");
    expect(screen.getByText("1 events")).toBeInTheDocument();
    fireEvent.click(screen.getByText("The Fall of an Empire"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "HISTORY_CAUSE_EFFECT_MATCH",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText(/A declining empire raises taxes/);
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).toBeDisabled();

    // Pick the correct outcome from the tray, then assign it to the event slot.
    fireEvent.click(screen.getByText("Colonial unrest and eventual revolt"));
    fireEvent.click(screen.getByText("Heavy taxation on colonies"));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      mapping: { s1: "c1" },
    });

    await screen.findByText("✓ Every event matched correctly!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+20 XP");
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
    await screen.findByText("The Fall of an Empire");
    fireEvent.click(screen.getByText("The Fall of an Empire"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A declining empire raises taxes/);

    fireEvent.click(screen.getByText("A sudden population boom"));
    fireEvent.click(screen.getByText("Heavy taxation on colonies"));
    fireEvent.click(screen.getByRole("button", { name: "Check Matches" }));

    await screen.findByText("✕ Not quite — some pairs are wrong.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Matches" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("re-tapping a filled slot with nothing selected frees it back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("The Fall of an Empire");
    fireEvent.click(screen.getByText("The Fall of an Empire"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A declining empire raises taxes/);

    fireEvent.click(screen.getByText("Colonial unrest and eventual revolt"));
    fireEvent.click(screen.getByText("Heavy taxation on colonies"));
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).not.toBeDisabled();

    // Tap the now-filled slot again with nothing selected — it should free up.
    fireEvent.click(screen.getByText("Heavy taxation on colonies"));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("Colonial unrest and eventual revolt")).toBeInTheDocument();
  });
});

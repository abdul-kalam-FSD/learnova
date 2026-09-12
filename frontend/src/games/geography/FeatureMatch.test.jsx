import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import FeatureMatch from "./FeatureMatch";

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
  title: "Landforms of the Coast",
  difficulty: "medium",
  payload: {
    slots: [{ id: "s1", label: "Delta" }],
  },
};

const FULL_PAYLOAD = {
  scenario: "A river slows down as it reaches the sea, dropping its sediment load.",
  slots: [{ id: "s1", label: "Delta" }],
  components: [
    { id: "c1", label: "A fan-shaped landform built from deposited sediment" },
    { id: "c2", label: "A steep-walled valley carved by glacial ice" },
  ],
  hint: "Think about where a river's speed drops sharply.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 4, xp_total: 80 } });
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
        data: { xpAwarded: 25, newStreak: 5, masteryUpdate: { new_state: "proficient" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <FeatureMatch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeatureMatch - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Feature Match...")).toBeInTheDocument();
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

describe("FeatureMatch - full play flow", () => {
  test("select level -> mission briefing -> pick description, assign to feature -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Landforms of the Coast");
    expect(screen.getByText("1 features")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Landforms of the Coast"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "GEOGRAPHY_FEATURE_MATCH",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText(/A river slows down as it reaches the sea/);
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).toBeDisabled();

    // Pick the correct description from the tray, then assign it to the feature slot.
    fireEvent.click(screen.getByText("A fan-shaped landform built from deposited sediment"));
    fireEvent.click(screen.getByText("Delta"));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      mapping: { s1: "c1" },
    });

    await screen.findByText("✓ Every feature matched correctly!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+25 XP");
    expect(screen.getByText("🔥 Streak 5")).toBeInTheDocument();
    expect(screen.getByText("Updated to: proficient")).toBeInTheDocument();

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
    await screen.findByText("Landforms of the Coast");
    fireEvent.click(screen.getByText("Landforms of the Coast"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A river slows down as it reaches the sea/);

    fireEvent.click(screen.getByText("A steep-walled valley carved by glacial ice"));
    fireEvent.click(screen.getByText("Delta"));
    fireEvent.click(screen.getByRole("button", { name: "Check Matches" }));

    await screen.findByText("✕ Not quite — some pairs are wrong.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Matches" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("re-tapping a filled slot with nothing selected frees it back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Landforms of the Coast");
    fireEvent.click(screen.getByText("Landforms of the Coast"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A river slows down as it reaches the sea/);

    fireEvent.click(screen.getByText("A fan-shaped landform built from deposited sediment"));
    fireEvent.click(screen.getByText("Delta"));
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).not.toBeDisabled();

    // Tap the now-filled slot again with nothing selected — it should free up.
    fireEvent.click(screen.getByText("Delta"));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("A fan-shaped landform built from deposited sediment")).toBeInTheDocument();
  });
});

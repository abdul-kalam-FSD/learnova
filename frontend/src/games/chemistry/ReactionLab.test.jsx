import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import ReactionLab from "./ReactionLab";

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
  title: "Reaction Types",
  difficulty: "medium",
  payload: {
    slots: [{ id: "s1", label: "Zn + HCl" }],
  },
};

const FULL_PAYLOAD = {
  scenario: "Zinc metal is added to hydrochloric acid.",
  slots: [{ id: "s1", label: "Zn + HCl" }],
  components: [
    { id: "c1", label: "Zinc chloride forms and hydrogen gas is released" },
    { id: "c2", label: "No reaction occurs at room temperature" },
  ],
  hint: "Reactive metals displace hydrogen from acids.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 3, xp_total: 60 } });
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
        data: { xpAwarded: 16, newStreak: 4, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <ReactionLab />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReactionLab - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Reaction Lab...")).toBeInTheDocument();
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

describe("ReactionLab - full play flow", () => {
  test("select level -> mission briefing -> predict outcome, assign to beaker -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Reaction Types");
    expect(screen.getByText("1 beakers to classify")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reaction Types"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "CHEMISTRY_REACTION_LAB",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Zinc metal is added to hydrochloric acid.");
    const runButton = screen.getByRole("button", { name: "Run Reactions" });
    expect(runButton).toBeDisabled();

    // Pick the correct outcome card from the tray, then assign it to the beaker.
    fireEvent.click(
      screen.getByText("Zinc chloride forms and hydrogen gas is released"),
    );
    fireEvent.click(screen.getByText("🧪 Zn + HCl"));
    expect(runButton).not.toBeDisabled();

    fireEvent.click(runButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      mapping: { s1: "c1" },
    });

    await screen.findByText("✓ All reactions correctly predicted!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+16 XP");
    expect(screen.getByText("🔥 Streak 4")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect prediction shows failure feedback and does not unlock the reward button", async () => {
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
    await screen.findByText("Reaction Types");
    fireEvent.click(screen.getByText("Reaction Types"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Zinc metal is added to hydrochloric acid.");

    fireEvent.click(screen.getByText("No reaction occurs at room temperature"));
    fireEvent.click(screen.getByText("🧪 Zn + HCl"));
    fireEvent.click(screen.getByRole("button", { name: "Run Reactions" }));

    await screen.findByText("✕ Not all predictions match.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Reactions" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("re-tapping a filled beaker with nothing selected frees it back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Reaction Types");
    fireEvent.click(screen.getByText("Reaction Types"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Zinc metal is added to hydrochloric acid.");

    fireEvent.click(
      screen.getByText("Zinc chloride forms and hydrogen gas is released"),
    );
    fireEvent.click(screen.getByText("🧪 Zn + HCl"));
    const runButton = screen.getByRole("button", { name: "Run Reactions" });
    expect(runButton).not.toBeDisabled();

    // Tap the now-filled beaker again with nothing selected — it should free up.
    fireEvent.click(screen.getByText("🧪 Zn + HCl"));
    expect(runButton).toBeDisabled();
    expect(
      screen.getByText("Zinc chloride forms and hydrogen gas is released"),
    ).toBeInTheDocument();
  });
});

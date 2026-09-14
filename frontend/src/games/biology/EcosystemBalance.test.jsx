import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import EcosystemBalance from "./EcosystemBalance";

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
  title: "Wolves Return to the Valley",
  difficulty: "medium",
  payload: {
    scrambled_effects: [{ id: "e1" }, { id: "e2" }, { id: "e3" }],
  },
};

const FULL_PAYLOAD = {
  trigger: "Wolves are reintroduced to a valley where deer had overgrazed.",
  scrambled_effects: [
    { id: "e1", label: "Deer population drops" },
    { id: "e2", label: "Overgrazed vegetation recovers" },
    { id: "e3", label: "Beavers return as willow and aspen regrow" },
  ],
  hint: "Start with the most direct effect of a new predator.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 2, xp_total: 40 } });
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
        data: { xpAwarded: 17, newStreak: 3, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <EcosystemBalance />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EcosystemBalance - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Ecosystem Balance...")).toBeInTheDocument();
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

describe("EcosystemBalance - full play flow", () => {
  test("select level -> mission briefing -> tap effects in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Wolves Return to the Valley");
    expect(screen.getByText("3-step chain")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Wolves Return to the Valley"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "BIO_ECOSYSTEM_BALANCE",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Wolves are reintroduced to a valley where deer had overgrazed.");
    const checkButton = screen.getByRole("button", { name: "Check Chain" });
    expect(checkButton).toBeDisabled();

    // Tap effects in the correct order.
    fireEvent.click(screen.getByText("Deer population drops"));
    fireEvent.click(screen.getByText("Overgrazed vegetation recovers"));
    fireEvent.click(screen.getByText("Beavers return as willow and aspen regrow"));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["e1", "e2", "e3"],
    });

    await screen.findByText("✓ Ecosystem traced correctly!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+17 XP");
    expect(screen.getByText("🔥 Streak 3")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("Back during active play asks to confirm, and Leave returns to level select", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Wolves Return to the Valley");
    fireEvent.click(screen.getByText("Wolves Return to the Valley"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Wolves are reintroduced to a valley where deer had overgrazed.");

    fireEvent.click(screen.getByLabelText("Go back"));
    expect(await screen.findByText("Leave this mission?")).toBeInTheDocument();
    expect(
      screen.getByText("Wolves are reintroduced to a valley where deer had overgrazed."),
    ).toBeInTheDocument(); // still on the play screen underneath, nothing discarded yet

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(screen.queryByText("Leave this mission?")).not.toBeInTheDocument();
    await screen.findByText("Wolves Return to the Valley"); // back on level select
  });

  test("a wrong-order chain shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "That's out of order — try again." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Wolves Return to the Valley");
    fireEvent.click(screen.getByText("Wolves Return to the Valley"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Wolves are reintroduced to a valley where deer had overgrazed.");

    fireEvent.click(screen.getByText("Beavers return as willow and aspen regrow"));
    fireEvent.click(screen.getByText("Deer population drops"));
    fireEvent.click(screen.getByText("Overgrazed vegetation recovers"));
    fireEvent.click(screen.getByRole("button", { name: "Check Chain" }));

    await screen.findByText("✕ That's not how it unfolds.");
    expect(screen.getByText("That's out of order — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Chain" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("undo-to-here removes a step and everything placed after it", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Wolves Return to the Valley");
    fireEvent.click(screen.getByText("Wolves Return to the Valley"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Wolves are reintroduced to a valley where deer had overgrazed.");

    fireEvent.click(screen.getByText("Deer population drops"));
    fireEvent.click(screen.getByText("Overgrazed vegetation recovers"));
    fireEvent.click(screen.getByText("Beavers return as willow and aspen regrow"));

    const checkButton = screen.getByRole("button", { name: "Check Chain" });
    expect(checkButton).not.toBeDisabled();

    // Tap step 1 in the chain to undo back to it — steps 1-3 all return to the tray.
    fireEvent.click(screen.getByText("1. Deer population drops"));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("Deer population drops")).toBeInTheDocument();
    expect(screen.getByText("Overgrazed vegetation recovers")).toBeInTheDocument();
    expect(screen.getByText("Beavers return as willow and aspen regrow")).toBeInTheDocument();
    expect(screen.getByText("1. —")).toBeInTheDocument();
  });
});
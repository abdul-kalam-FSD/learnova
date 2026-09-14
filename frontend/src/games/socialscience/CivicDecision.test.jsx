import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import CivicDecision from "./CivicDecision";

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
  title: "The Contested Permit",
  difficulty: "medium",
  payload: {
    options: [{ id: "opt1" }, { id: "opt2" }, { id: "opt3" }],
  },
};

const FULL_PAYLOAD = {
  scenario_label:
    "A neighborhood association wants to deny a building permit without a public hearing.",
  options: [
    { id: "opt1", label: "Approve it immediately to avoid delay" },
    { id: "opt2", label: "Hold the legally required public hearing first" },
    { id: "opt3", label: "Deny it without explanation" },
  ],
  hint: "Due process requires a hearing before a binding decision.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 1, xp_total: 30 } });
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
        data: { xpAwarded: 18, newStreak: 2, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <CivicDecision />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CivicDecision - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Civic Decision...")).toBeInTheDocument();
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

describe("CivicDecision - level select", () => {
  test("lists the level with its response count", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("The Contested Permit");
    expect(screen.getByText("3 possible responses")).toBeInTheDocument();
  });
});

describe("CivicDecision - full play flow", () => {
  test("select level -> mission briefing -> choose a response -> submit -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("The Contested Permit");
    fireEvent.click(screen.getByText("The Contested Permit"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "SOCIAL_SCIENCE_CIVIC_DECISION",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText(/A neighborhood association wants to deny/);
    const decideButton = screen.getByRole("button", { name: "Make the Call" });
    expect(decideButton).toBeDisabled();

    // Selecting an option enables the submit button.
    fireEvent.click(screen.getByText("Hold the legally required public hearing first"));
    expect(decideButton).not.toBeDisabled();

    fireEvent.click(decideButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedHotspotId: "opt2",
    });

    await screen.findByText("✓ That's the democratic choice.");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+18 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("Back during an active scenario asks to confirm, and Leave returns to level select", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("The Contested Permit");
    fireEvent.click(screen.getByText("The Contested Permit"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A neighborhood association wants to deny/);

    fireEvent.click(screen.getByLabelText("Go back"));
    expect(await screen.findByText("Leave this mission?")).toBeInTheDocument();
    expect(screen.getByText(/A neighborhood association wants to deny/)).toBeInTheDocument(); // still mid-scenario underneath

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(screen.queryByText("Leave this mission?")).not.toBeInTheDocument();
    await screen.findByText("The Contested Permit"); // back on level select
  });

  test("an incorrect decision shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({
          data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } },
        });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({
          data: { isCorrect: false, hint: "That skips the required hearing." },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("The Contested Permit");
    fireEvent.click(screen.getByText("The Contested Permit"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A neighborhood association wants to deny/);

    fireEvent.click(screen.getByText("Deny it without explanation"));
    fireEvent.click(screen.getByRole("button", { name: "Make the Call" }));

    await screen.findByText("✕ Think again.");
    expect(screen.getByText("That skips the required hearing.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make the Call" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("selecting a different option before submitting swaps the selection", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("The Contested Permit");
    fireEvent.click(screen.getByText("The Contested Permit"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A neighborhood association wants to deny/);

    const decideButton = screen.getByRole("button", { name: "Make the Call" });
    fireEvent.click(screen.getByText("Approve it immediately to avoid delay"));
    expect(decideButton).not.toBeDisabled();

    // Picking a different option before submitting is allowed and still enables submit.
    fireEvent.click(screen.getByText("Hold the legally required public hearing first"));
    expect(decideButton).not.toBeDisabled();

    fireEvent.click(decideButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedHotspotId: "opt2",
    });
  });
});
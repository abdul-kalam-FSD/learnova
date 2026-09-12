import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import PlaceValueMatch from "./PlaceValueMatch";

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
  title: "Place Value in Large Numbers",
  difficulty: "easy",
  payload: {
    slots: [{ id: "s1", number: "4729", highlightIndex: 1 }],
  },
};

const FULL_PAYLOAD = {
  scenario: "Identify the place value of the highlighted digit in each number.",
  slots: [{ id: "s1", number: "4729", highlightIndex: 1 }],
  components: [
    { id: "c1", label: "Hundreds" },
    { id: "c2", label: "Tens" },
  ],
  hint: "Count the digit's position from the right, starting at ones.",
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
        data: { xpAwarded: 12, newStreak: 2, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <PlaceValueMatch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlaceValueMatch - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Place Value Match...")).toBeInTheDocument();
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

describe("PlaceValueMatch - full play flow", () => {
  test("select level -> mission briefing -> pick place value, assign to number -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Place Value in Large Numbers");
    expect(screen.getByText("1 numbers")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Place Value in Large Numbers"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_PLACE_VALUE_MATCH",
      contentId: "lvl1",
    });

    // ---- Play screen: the whole number renders as one accessible unit ----
    await screen.findByText("Identify the place value of the highlighted digit in each number.");
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).toBeDisabled();

    fireEvent.click(screen.getByText("Hundreds"));
    fireEvent.click(
      screen.getByText((_, element) => element?.getAttribute?.("aria-label") === "Number 4729"),
    );
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
    await screen.findByText("+12 XP");
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
    await screen.findByText("Place Value in Large Numbers");
    fireEvent.click(screen.getByText("Place Value in Large Numbers"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Identify the place value of the highlighted digit in each number.");

    fireEvent.click(screen.getByText("Tens"));
    fireEvent.click(
      screen.getByText((_, element) => element?.getAttribute?.("aria-label") === "Number 4729"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Check Matches" }));

    await screen.findByText("✕ Not quite right.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Matches" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("re-tapping a filled slot with nothing selected frees it back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Place Value in Large Numbers");
    fireEvent.click(screen.getByText("Place Value in Large Numbers"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Identify the place value of the highlighted digit in each number.");

    fireEvent.click(screen.getByText("Hundreds"));
    fireEvent.click(
      screen.getByText((_, element) => element?.getAttribute?.("aria-label") === "Number 4729"),
    );
    const checkButton = screen.getByRole("button", { name: "Check Matches" });
    expect(checkButton).not.toBeDisabled();

    // Tap the now-filled slot again with nothing selected — it should free up.
    fireEvent.click(
      screen.getByText((_, element) => element?.getAttribute?.("aria-label") === "Number 4729"),
    );
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("Hundreds")).toBeInTheDocument();
  });
});

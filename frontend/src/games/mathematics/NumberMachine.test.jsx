import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import NumberMachine from "./NumberMachine";

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
  title: "Solve for x",
  difficulty: "easy",
  payload: { equation_label: "x + 3 = 10" },
};

const FULL_PAYLOAD = {
  equation_label: "x + 3 = 10",
  dial_min: 0,
  dial_max: 10,
  hint: "Subtract 3 from both sides.",
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
        data: { xpAwarded: 10, newStreak: 2, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <NumberMachine />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NumberMachine - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Number Machine...")).toBeInTheDocument();
  });

  test("shows an error state when loading content fails", async () => {
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
  });
});

describe("NumberMachine - full play flow", () => {
  test("select level -> play -> dial in the answer -> submit correct -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Solve for x");
    expect(screen.getByText("x + 3 = 10")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Solve for x"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_NUMBER_MACHINE",
      contentId: "lvl1",
    });

    // ---- Play screen: dial starts at dial_min ----
    await screen.findByText("Dial: 0–10");
    expect(screen.getByText("0")).toBeInTheDocument();

    const minusButton = screen.getByRole("button", { name: "−" });
    const plusButton = screen.getByRole("button", { name: "+" });
    expect(minusButton).toBeDisabled(); // already at dial_min

    // Dial up to 7.
    for (let i = 0; i < 7; i++) fireEvent.click(plusButton);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(minusButton).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Power the Machine" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", { answer: 7 });

    await screen.findByText("✓ The machine powers on!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+10 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("a wrong dial value shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "Try subtracting first." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Solve for x");
    fireEvent.click(screen.getByText("Solve for x"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Dial: 0–10");

    fireEvent.click(screen.getByRole("button", { name: "Power the Machine" }));

    await screen.findByText("✕ Not quite — the machine stays dark.");
    expect(screen.getByText("Try subtracting first.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Power the Machine" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("the dial is clamped between dial_min and dial_max", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Solve for x");
    fireEvent.click(screen.getByText("Solve for x"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Dial: 0–10");

    const minusButton = screen.getByRole("button", { name: "−" });
    const plusButton = screen.getByRole("button", { name: "+" });

    // Already at the floor (0) — extra minus clicks have no effect.
    expect(minusButton).toBeDisabled();
    fireEvent.click(minusButton);
    expect(screen.getByText("0")).toBeInTheDocument();

    // Dial all the way up to the ceiling (10), then confirm + disables.
    for (let i = 0; i < 10; i++) fireEvent.click(plusButton);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(plusButton).toBeDisabled();

    // One more click past the cap has no effect.
    fireEvent.click(plusButton);
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  test("adjusting the dial after a wrong attempt clears the stale feedback", async () => {
    mockHappyPath();
    let attemptCount = 0;
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        attemptCount += 1;
        return Promise.resolve({
          data: attemptCount === 1 ? { isCorrect: false, hint: "Try again." } : { isCorrect: true },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Solve for x");
    fireEvent.click(screen.getByText("Solve for x"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Dial: 0–10");

    fireEvent.click(screen.getByRole("button", { name: "Power the Machine" }));
    await screen.findByText("✕ Not quite — the machine stays dark.");

    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.queryByText("✕ Not quite — the machine stays dark.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Power the Machine" }));
    await screen.findByText("✓ The machine powers on!");
  });
});

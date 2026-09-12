import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import EquationBossChallenge from "./EquationBossChallenge";

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
  title: "Face the Balance Keeper: Round 1",
  difficulty: "medium",
  payload: {
    questions: [{ id: "q1" }, { id: "q2" }],
    time_limit_seconds: 10,
  },
};

const FULL_PAYLOAD = {
  time_limit_seconds: 10,
  questions: [
    {
      id: "q1",
      prompt: "Solve for x: x + 5 = 12",
      options: [
        { id: "a", label: "x = 7" },
        { id: "b", label: "x = 17" },
      ],
    },
    {
      id: "q2",
      prompt: "Solve for x: 3x = 21",
      options: [
        { id: "a", label: "x = 63" },
        { id: "b", label: "x = 7" },
      ],
    },
  ],
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 1, xp_total: 35 } });
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
      return Promise.resolve({
        data: { correctCount: 2, totalCount: 2, isCorrect: true },
      });
    }
    if (url === "/games/sess1/complete") {
      return Promise.resolve({
        data: { xpAwarded: 26, newStreak: 2, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <EquationBossChallenge />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EquationBossChallenge - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Equation Boss Challenge...")).toBeInTheDocument();
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

describe("EquationBossChallenge - full play flow", () => {
  test("select round -> land both hits -> boss defeated -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Round select screen ----
    await screen.findByText("Face the Balance Keeper: Round 1");
    expect(screen.getByText("2 questions · 10s each")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Face the Balance Keeper: Round 1"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_EQUATION_BOSS_CHALLENGE",
      contentId: "lvl1",
    });

    // ---- Attack 1 ----
    await screen.findByText("ATTACK 1 / 2");
    expect(screen.getByText("Solve for x: x + 5 = 12")).toBeInTheDocument();
    fireEvent.click(screen.getByText("x = 7"));

    // ---- Advances to Attack 2 after the feedback pause ----
    await waitFor(() => expect(screen.getByText("ATTACK 2 / 2")).toBeInTheDocument());
    expect(screen.getByText("Solve for x: 3x = 21")).toBeInTheDocument();
    fireEvent.click(screen.getByText("x = 7"));

    // ---- Round scored -> batch attempt submitted ----
    await waitFor(() => expect(screen.getByText("BOSS HEALTH")).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      answers: [
        { questionId: "q1", selectedOptionId: "a" },
        { questionId: "q2", selectedOptionId: "b" },
      ],
    });
    expect(screen.getByText("2 / 2 hits landed")).toBeInTheDocument();
    expect(screen.getByText("✓ The Balance Keeper is down!")).toBeInTheDocument();

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+26 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rematch the Keeper" })).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("a single miss leaves the boss standing", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({
          data: {
            correctCount: 1,
            totalCount: 2,
            isCorrect: false,
            hint: "Check your second answer.",
          },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Face the Balance Keeper: Round 1");
    fireEvent.click(screen.getByText("Face the Balance Keeper: Round 1"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("ATTACK 1 / 2");

    fireEvent.click(screen.getByText("x = 7"));
    await waitFor(() => expect(screen.getByText("ATTACK 2 / 2")).toBeInTheDocument());
    fireEvent.click(screen.getByText("x = 63"));

    await waitFor(() => expect(screen.getByText("1 / 2 hits landed")).toBeInTheDocument());
    expect(
      screen.getByText("The Balance Keeper is still standing — one miss was all it took."),
    ).toBeInTheDocument();
    expect(screen.getByText("Check your second answer.")).toBeInTheDocument();
  });

  test("letting the timer run out submits a null answer and shows the timeout message", async () => {
    const quickLevel = {
      ...LEVEL,
      payload: { ...LEVEL.payload, time_limit_seconds: 1 },
    };
    const quickPayload = { ...FULL_PAYLOAD, time_limit_seconds: 1 };

    api.get.mockImplementation((url) => {
      if (url === "/games/content") {
        return Promise.resolve({ data: { content: [quickLevel] } });
      }
      if (url === "/home") {
        return Promise.resolve({ data: { streak_count: 0, xp_total: 0 } });
      }
      return Promise.reject(new Error(`unmocked GET ${url}`));
    });
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({
          data: { sessionId: "sess1", content: { payload: quickPayload } },
        });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { correctCount: 0, totalCount: 2, isCorrect: false } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Face the Balance Keeper: Round 1");
    fireEvent.click(screen.getByText("Face the Balance Keeper: Round 1"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("ATTACK 1 / 2");

    await waitFor(
      () =>
        expect(
          screen.getByText("⏱ Time's up — the Balance Keeper shrugs it off."),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );

    await waitFor(() => expect(screen.getByText("ATTACK 2 / 2")).toBeInTheDocument(), {
      timeout: 2000,
    });
  }, 10000);
});

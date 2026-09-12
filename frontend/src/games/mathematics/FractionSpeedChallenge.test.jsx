import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import FractionSpeedChallenge from "./FractionSpeedChallenge";

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
  title: "Speed Round: Adding Fractions",
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
      prompt: "1/4 + 1/4 = ?",
      options: [
        { id: "a", label: "1/2" },
        { id: "b", label: "2/8" },
      ],
    },
    {
      id: "q2",
      prompt: "1/3 + 1/6 = ?",
      options: [
        { id: "a", label: "1/2" },
        { id: "b", label: "2/9" },
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
      return Promise.resolve({
        data: { correctCount: 2, totalCount: 2, isCorrect: true },
      });
    }
    if (url === "/games/sess1/complete") {
      return Promise.resolve({
        data: { xpAwarded: 24, newStreak: 2, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <FractionSpeedChallenge />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FractionSpeedChallenge - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Fraction Speed Challenge...")).toBeInTheDocument();
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

describe("FractionSpeedChallenge - full play flow", () => {
  test("select round -> tap an answer for both questions -> perfect round -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Round select screen ----
    await screen.findByText("Speed Round: Adding Fractions");
    expect(screen.getByText("2 questions · 10s each")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Speed Round: Adding Fractions"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_FRACTION_SPEED_CHALLENGE",
      contentId: "lvl1",
    });

    // ---- Question 1 ----
    await screen.findByText("QUESTION 1 / 2");
    expect(screen.getByText("1/4 + 1/4 = ?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("1/2"));

    // ---- Advances to Question 2 after the feedback pause ----
    await waitFor(() => expect(screen.getByText("QUESTION 2 / 2")).toBeInTheDocument());
    expect(screen.getByText("1/3 + 1/6 = ?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("2/9"));

    // ---- Round complete -> batch attempt submitted ----
    await waitFor(() => expect(screen.getByText("ROUND COMPLETE")).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      answers: [
        { questionId: "q1", selectedOptionId: "a" },
        { questionId: "q2", selectedOptionId: "b" },
      ],
    });
    expect(screen.getByText("2 / 2 correct")).toBeInTheDocument();
    expect(screen.getByText("✓ Perfect round!")).toBeInTheDocument();

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+24 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();
    // Phase 6C-A: the round's correctCount/totalCount (2/2) now carries
    // through to the final result screen as accuracyPct.
    expect(screen.getByText("🎯 100% accuracy")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  // Phase 6C-A: accuracy plumbing — verifies the final result screen shows
  // the correct accuracyPct for a non-perfect round (2 correct / 3 total).
  test("shows accuracy percentage on the final result screen for a 2-of-3 round", async () => {
    const threeQPayload = {
      time_limit_seconds: 10,
      questions: [
        ...FULL_PAYLOAD.questions,
        {
          id: "q3",
          prompt: "1/2 + 1/2 = ?",
          options: [
            { id: "a", label: "1" },
            { id: "b", label: "2" },
          ],
        },
      ],
    };
    const threeQLevel = { ...LEVEL, payload: { ...LEVEL.payload, questions: threeQPayload.questions } };

    api.get.mockImplementation((url) => {
      if (url === "/games/content") {
        return Promise.resolve({ data: { content: [threeQLevel] } });
      }
      if (url === "/home") {
        return Promise.resolve({ data: { streak_count: 1, xp_total: 30 } });
      }
      return Promise.reject(new Error(`unmocked GET ${url}`));
    });
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: threeQPayload } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { correctCount: 2, totalCount: 3, isCorrect: false } });
      }
      if (url === "/games/sess1/complete") {
        return Promise.resolve({ data: { xpAwarded: 18, newStreak: 2 } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Speed Round: Adding Fractions");
    fireEvent.click(screen.getByText("Speed Round: Adding Fractions"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));

    await screen.findByText("QUESTION 1 / 3");
    fireEvent.click(screen.getByText("1/2"));
    await waitFor(() => expect(screen.getByText("QUESTION 2 / 3")).toBeInTheDocument());
    fireEvent.click(screen.getByText("2/9"));
    await waitFor(() => expect(screen.getByText("QUESTION 3 / 3")).toBeInTheDocument());
    fireEvent.click(screen.getByText("1"));

    await waitFor(() => expect(screen.getByText("2 / 3 correct")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));

    await screen.findByText("+18 XP");
    expect(screen.getByText("🎯 67% accuracy")).toBeInTheDocument();
  });

  test("an imperfect round shows the 'nice try' verdict and explanation", async () => {
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
            hint: "Find a common denominator before adding the numerators.",
          },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Speed Round: Adding Fractions");
    fireEvent.click(screen.getByText("Speed Round: Adding Fractions"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("QUESTION 1 / 2");

    fireEvent.click(screen.getByText("2/8"));
    await waitFor(() => expect(screen.getByText("QUESTION 2 / 2")).toBeInTheDocument());

    fireEvent.click(screen.getByText("1/2"));

    await waitFor(() => expect(screen.getByText("1 / 2 correct")).toBeInTheDocument());
    expect(
      screen.getByText("Nice try — check the ones you missed next time."),
    ).toBeInTheDocument();
    expect(screen.getByText("Find a common denominator before adding the numerators.")).toBeInTheDocument();
  });

  test("letting the timer run out records no answer and shows the timeout message", async () => {
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
    await screen.findByText("Speed Round: Adding Fractions");
    fireEvent.click(screen.getByText("Speed Round: Adding Fractions"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("QUESTION 1 / 2");

    await waitFor(() => expect(screen.getByText("⏱ Time's up — moving on.")).toBeInTheDocument(), {
      timeout: 3000,
    });

    await waitFor(() => expect(screen.getByText("QUESTION 2 / 2")).toBeInTheDocument(), {
      timeout: 2000,
    });
  }, 10000);
});

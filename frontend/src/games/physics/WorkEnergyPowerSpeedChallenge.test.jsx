import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import WorkEnergyPowerSpeedChallenge from "./WorkEnergyPowerSpeedChallenge";

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
  title: "Work & Energy Round",
  difficulty: "medium",
  payload: {
    questions: [{ id: "q1" }, { id: "q2" }],
    time_limit_seconds: 10,
  },
};

const FULL_PAYLOAD = {
  time_limit_seconds: 10,
  questions: [
    { id: "q1", prompt: "A 10 N force moves a box 5 m. Find the work done.", unit: "J" },
    { id: "q2", prompt: "A machine does 200 J of work in 4 s. Find its power.", unit: "W" },
  ],
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 3, xp_total: 50 } });
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
        data: { xpAwarded: 20, newStreak: 4, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <WorkEnergyPowerSpeedChallenge />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WorkEnergyPowerSpeedChallenge - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Work, Energy & Power Speed Challenge...")).toBeInTheDocument();
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

describe("WorkEnergyPowerSpeedChallenge - full play flow", () => {
  test("select round -> answer both questions -> perfect round -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Round select screen ----
    await screen.findByText("Work & Energy Round");
    expect(screen.getByText("2 questions · 10s each")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Work & Energy Round"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "PHYSICS_WORK_ENERGY_POWER_SPEED_CHALLENGE",
      contentId: "lvl1",
    });

    // ---- Question 1 ----
    await screen.findByText("QUESTION 1 / 2");
    expect(screen.getByText("A 10 N force moves a box 5 m. Find the work done.")).toBeInTheDocument();
    expect(screen.getByText("Answer in J")).toBeInTheDocument();

    const goButton = screen.getByRole("button", { name: "Go" });
    expect(goButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("?"), { target: { value: "50" } });
    fireEvent.click(goButton);

    // ---- Advances to Question 2 after the feedback pause ----
    await waitFor(() => expect(screen.getByText("QUESTION 2 / 2")).toBeInTheDocument());
    expect(
      screen.getByText("A machine does 200 J of work in 4 s. Find its power."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("?"), { target: { value: "50" } });
    fireEvent.keyDown(screen.getByPlaceholderText("?"), { key: "Enter" });

    // ---- Round complete -> batch attempt submitted ----
    await waitFor(() => expect(screen.getByText("ROUND COMPLETE")).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      answers: [
        { questionId: "q1", answerValue: 50 },
        { questionId: "q2", answerValue: 50 },
      ],
    });
    expect(screen.getByText("2 / 2 correct")).toBeInTheDocument();
    expect(screen.getByText("✓ Perfect round!")).toBeInTheDocument();

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+20 XP");
    expect(screen.getByText("🔥 Streak 4")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
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
            hint: "Power is work divided by time.",
          },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Work & Energy Round");
    fireEvent.click(screen.getByText("Work & Energy Round"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("QUESTION 1 / 2");

    fireEvent.change(screen.getByPlaceholderText("?"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    await waitFor(() => expect(screen.getByText("QUESTION 2 / 2")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("?"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));

    await waitFor(() => expect(screen.getByText("1 / 2 correct")).toBeInTheDocument());
    expect(
      screen.getByText("Nice try — check the ones you missed next time."),
    ).toBeInTheDocument();
    expect(screen.getByText("Power is work divided by time.")).toBeInTheDocument();
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
    await screen.findByText("Work & Energy Round");
    fireEvent.click(screen.getByText("Work & Energy Round"));
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

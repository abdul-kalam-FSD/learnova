import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import FractionBossChallenge from "./FractionBossChallenge";

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
  title: "Defeat the Denominator Dragon",
  difficulty: "medium",
  payload: {
    questions: [{ id: "q1" }, { id: "q2" }],
    max_lives: 2,
  },
};

const FULL_PAYLOAD = {
  max_lives: 2,
  questions: [
    {
      id: "q1",
      prompt: "Which is larger: 1/2 or 1/3?",
      options: [
        { id: "a", label: "1/2" },
        { id: "b", label: "1/3" },
      ],
    },
    {
      id: "q2",
      prompt: "Simplify 4/8.",
      options: [
        { id: "a", label: "1/2" },
        { id: "b", label: "2/3" },
      ],
    },
  ],
};

function renderGame() {
  return render(
    <MemoryRouter>
      <FractionBossChallenge />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FractionBossChallenge - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Fraction Boss Challenge...")).toBeInTheDocument();
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

describe("FractionBossChallenge - full play flow", () => {
  test("select round -> answer both correctly -> boss defeated -> claim reward -> result screen", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/games/content") {
        return Promise.resolve({ data: { content: [LEVEL] } });
      }
      if (url === "/home") {
        return Promise.resolve({ data: { streak_count: 1, xp_total: 30 } });
      }
      return Promise.reject(new Error(`unmocked GET ${url}`));
    });
    api.post.mockImplementation((url, body) => {
      if (url === "/games/start") {
        return Promise.resolve({
          data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } },
        });
      }
      if (url === "/games/sess1/attempt") {
        // Each cumulative-answers call reports how many of them were right.
        return Promise.resolve({ data: { correctCount: body.answers.length, totalCount: 2 } });
      }
      if (url === "/games/sess1/complete") {
        return Promise.resolve({
          data: { xpAwarded: 22, newStreak: 2, masteryUpdate: { new_state: "strong" } },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();

    // ---- Round select screen ----
    await screen.findByText("Defeat the Denominator Dragon");
    expect(screen.getByText("2 questions · 2 lives")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Defeat the Denominator Dragon"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_FRACTION_BOSS_CHALLENGE",
      contentId: "lvl1",
    });

    // ---- Question 1: answer correctly ----
    await screen.findByText("QUESTION 1 / 2");
    expect(screen.getByText("Which is larger: 1/2 or 1/3?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("1/2"));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
        answers: [{ questionId: "q1", selectedOptionId: "a" }],
      }),
    );

    // ---- Advances to Question 2 with no life lost ----
    await waitFor(() => expect(screen.getByText("QUESTION 2 / 2")).toBeInTheDocument());
    expect(screen.getByText("Simplify 4/8.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("1/2"));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
        answers: [
          { questionId: "q1", selectedOptionId: "a" },
          { questionId: "q2", selectedOptionId: "a" },
        ],
      }),
    );

    // ---- Boss defeated screen ----
    await waitFor(() => expect(screen.getByText("BOSS DEFEATED")).toBeInTheDocument());
    expect(screen.getByText("2 / 2 correct")).toBeInTheDocument();
    expect(screen.getByText("✓ The Denominator Dragon is defeated!")).toBeInTheDocument();

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+22 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();
    // Phase 6C-A: this game names its local variable `finalScoreResult`
    // before storing it in `scoreResult` state — confirms that path also
    // reaches the result screen as accuracyPct.
    expect(screen.getByText("🎯 100% accuracy")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("Back mid-boss-fight asks to confirm, and Leave returns to round select", async () => {
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
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Defeat the Denominator Dragon");
    fireEvent.click(screen.getByText("Defeat the Denominator Dragon"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("QUESTION 1 / 2");

    fireEvent.click(screen.getByLabelText("Go back"));
    expect(await screen.findByText("Leave this mission?")).toBeInTheDocument();
    expect(screen.getByText("QUESTION 1 / 2")).toBeInTheDocument(); // still mid-fight underneath

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(screen.queryByText("Leave this mission?")).not.toBeInTheDocument();
    await screen.findByText("Defeat the Denominator Dragon"); // back on round select
  });

  test("running out of lives on the very first question ends the round early with the boss escaping", async () => {
    const tightLevel = { ...LEVEL, payload: { ...LEVEL.payload, max_lives: 1 } };
    const tightPayload = { ...FULL_PAYLOAD, max_lives: 1 };

    api.get.mockImplementation((url) => {
      if (url === "/games/content") {
        return Promise.resolve({ data: { content: [tightLevel] } });
      }
      if (url === "/home") {
        return Promise.resolve({ data: { streak_count: 0, xp_total: 0 } });
      }
      return Promise.reject(new Error(`unmocked GET ${url}`));
    });
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({
          data: { sessionId: "sess1", content: { payload: tightPayload } },
        });
      }
      if (url === "/games/sess1/attempt") {
        // A wrong pick: correctCount never rises above 0.
        return Promise.resolve({ data: { correctCount: 0, totalCount: 2, hint: "Compare the denominators." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Defeat the Denominator Dragon");
    fireEvent.click(screen.getByText("Defeat the Denominator Dragon"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("QUESTION 1 / 2");

    // With only 1 life, a single wrong answer ends the round immediately —
    // the student never even sees question 2.
    fireEvent.click(screen.getByText("1/3"));

    await waitFor(() => expect(screen.getByText("💔 Life lost — the dragon shrugs it off.")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("BOSS ESCAPED")).toBeInTheDocument());
    expect(screen.queryByText("QUESTION 2 / 2")).not.toBeInTheDocument();
    expect(screen.getByText("0 / 2 correct")).toBeInTheDocument();
    expect(screen.getByText("Out of lives — the dragon got away this time.")).toBeInTheDocument();
    expect(screen.getByText("Compare the denominators.")).toBeInTheDocument();
  });
});
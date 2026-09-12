import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import EquationBalancer from "./EquationBalancer";

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
  title: "Hydrogen + Oxygen",
  difficulty: "medium",
  payload: {
    species: [
      { id: "s1", formula: "H2", side: "reactant" },
      { id: "s2", formula: "O2", side: "reactant" },
      { id: "s3", formula: "H2O", side: "product" },
    ],
  },
};

const FULL_PAYLOAD = {
  species: [
    { id: "s1", formula: "H2", side: "reactant" },
    { id: "s2", formula: "O2", side: "reactant" },
    { id: "s3", formula: "H2O", side: "product" },
  ],
  max_coefficient: 4,
  hint: "Balance the oxygen atoms last.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 1, xp_total: 40 } });
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
        data: { xpAwarded: 15, newStreak: 2, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <EquationBalancer />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EquationBalancer - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Equation Balancer...")).toBeInTheDocument();
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

describe("EquationBalancer - full play flow", () => {
  test("select level -> play -> adjust coefficients -> submit correct -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Hydrogen + Oxygen");
    expect(screen.getByText("3 species to balance")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Hydrogen + Oxygen"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled(); // session isn't created until Start Mission
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "CHEMISTRY_EQUATION_BALANCER",
      contentId: "lvl1",
    });

    // ---- Play screen: every species starts at coefficient 1 ----
    await screen.findByText("REACTION");
    expect(screen.getByText("1 H₂")).toBeInTheDocument();
    expect(screen.getByText("1 O₂")).toBeInTheDocument();
    expect(screen.getByText("1 H₂O")).toBeInTheDocument();

    // Bump the H2O coefficient up twice: 1 -> 2 -> 2 (capped by second click test below)
    const h2oRow = screen.getByText("1 H₂O").closest("div");
    const [minusH2O, plusH2O] = h2oRow.querySelectorAll("button");
    fireEvent.click(plusH2O);
    expect(screen.getByText("2 H₂O")).toBeInTheDocument();

    // Decrement back down
    fireEvent.click(minusH2O);
    expect(screen.getByText("1 H₂O")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check Balance" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      coefficients: { s1: 1, s2: 1, s3: 1 },
    });

    await screen.findByText("✓ Balanced!");
    expect(
      screen.getByText(
        "The law of conservation of mass means the same number of each atom must appear on both sides of a balanced equation.",
        { exact: false },
      ),
    ).toBeInTheDocument();

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+15 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an unbalanced attempt shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({
          data: { isCorrect: false, hint: "Count the oxygen atoms again." },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Hydrogen + Oxygen");
    fireEvent.click(screen.getByText("Hydrogen + Oxygen"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("REACTION");

    fireEvent.click(screen.getByRole("button", { name: "Check Balance" }));

    await screen.findByText("✕ Not balanced yet.");
    expect(screen.getByText("Count the oxygen atoms again.")).toBeInTheDocument();
    // Still shows "Check Balance", not "Claim Reward" — the student hasn't solved it.
    expect(screen.getByRole("button", { name: "Check Balance" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("coefficients are clamped between 1 and max_coefficient", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Hydrogen + Oxygen");
    fireEvent.click(screen.getByText("Hydrogen + Oxygen"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("REACTION");

    const h2Row = screen.getByText("1 H₂").closest("div");
    const [minusH2] = h2Row.querySelectorAll("button");

    // Already at the minimum (1) — the minus button is disabled and stays at 1.
    expect(minusH2).toBeDisabled();
    fireEvent.click(minusH2);
    expect(screen.getByText("1 H₂")).toBeInTheDocument();

    // Push the same species to its max_coefficient (4), then confirm + is disabled.
    const row = () => screen.getByText(/H₂$/).closest("div");
    const plusOf = () => row().querySelectorAll("button")[1];
    fireEvent.click(plusOf()); // 2
    fireEvent.click(plusOf()); // 3
    fireEvent.click(plusOf()); // 4
    expect(screen.getByText("4 H₂")).toBeInTheDocument();
    expect(plusOf()).toBeDisabled();

    // One more click has no effect past the cap.
    fireEvent.click(plusOf());
    expect(screen.getByText("4 H₂")).toBeInTheDocument();
  });

  test("checking balance again after a wrong attempt clears the previous feedback", async () => {
    mockHappyPath();
    let attemptCount = 0;
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        attemptCount += 1;
        return Promise.resolve({
          data:
            attemptCount === 1
              ? { isCorrect: false, hint: "Try again." }
              : { isCorrect: true },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Hydrogen + Oxygen");
    fireEvent.click(screen.getByText("Hydrogen + Oxygen"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("REACTION");

    fireEvent.click(screen.getByRole("button", { name: "Check Balance" }));
    await screen.findByText("✕ Not balanced yet.");

    // Adjusting a coefficient after a wrong attempt clears the stale feedback.
    const h2Row = screen.getByText("1 H₂").closest("div");
    const plusH2 = h2Row.querySelectorAll("button")[1];
    fireEvent.click(plusH2);
    expect(screen.queryByText("✕ Not balanced yet.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check Balance" }));
    await screen.findByText("✓ Balanced!");
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import CircuitBuilder from "./CircuitBuilder";

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
  title: "Simple Series Circuit",
  difficulty: "easy",
  payload: {
    slots: [{ id: "s1", label: "Power source" }],
  },
};

const FULL_PAYLOAD = {
  scenario: "A bulb needs to light up in a simple loop.",
  slots: [{ id: "s1", label: "Power source" }],
  components: [
    { id: "c1", label: "Battery" },
    { id: "c2", label: "Switch" },
  ],
  hint: "Every circuit needs a source of electrical energy.",
};

// A themed variant — same mechanic, reused for Electrostatics content.
const THEMED_LEVEL = {
  id: "lvl2",
  title: "Charging a Capacitor",
  difficulty: "medium",
  payload: {
    slots: [{ id: "s1", label: "Dielectric" }],
    theme: {
      topBarLabel: "Capacitor Challenge",
      badge: "PHYSICS · ELECTROSTATICS",
      heading: "Assemble the Capacitor",
      intro: "Assign each part to its correct role in the capacitor.",
      itemsNoun: "parts to place",
      objective: "Assign each part so the capacitor can store charge correctly.",
      slotsLabel: "Capacitor slots (tap a part below, then tap a slot to place it):",
      componentsLabel: "Parts:",
      testButtonLabel: "Test Capacitor",
      testingLabel: "Charging...",
      verdictCorrect: "✓ Capacitor charged!",
      verdictIncorrect: "✕ The capacitor won't hold charge yet.",
      whatYouLearned: "A capacitor stores energy in the electric field between its plates.",
      resultTopBarLabel: "Capacitor Complete",
      resultBadge: "CAPACITOR CHARGED",
      playAnotherLabel: "Charge Another Capacitor",
    },
  },
};

const THEMED_FULL_PAYLOAD = {
  ...THEMED_LEVEL.payload,
  scenario: "A parallel-plate capacitor needs its dielectric placed correctly.",
  components: [
    { id: "c1", label: "Insulating material between the plates" },
    { id: "c2", label: "A second layer of conducting plate" },
  ],
  hint: "The dielectric sits between the two conducting plates.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 1, xp_total: 25 } });
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
        data: { xpAwarded: 15, newStreak: 2, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <CircuitBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CircuitBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Circuit Builder...")).toBeInTheDocument();
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

describe("CircuitBuilder - default theme play flow", () => {
  test("select level -> mission briefing -> wire circuit -> result screen using default copy", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Simple Series Circuit");
    expect(screen.getByText("1 components to place")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Simple Series Circuit"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "PHYSICS_CIRCUIT_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen (default circuit-wiring copy) ----
    await screen.findByText("A bulb needs to light up in a simple loop.");
    const testButton = screen.getByRole("button", { name: "Test Circuit" });
    expect(testButton).toBeDisabled();

    fireEvent.click(screen.getByText("Battery"));
    fireEvent.click(screen.getByText("Power source"));
    expect(testButton).not.toBeDisabled();

    fireEvent.click(testButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      mapping: { s1: "c1" },
    });

    await screen.findByText("✓ Circuit complete!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen (default copy) ----
    await screen.findByText("+15 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wire Another Circuit" })).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incomplete circuit shows failure feedback and does not unlock the reward button", async () => {
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
    await screen.findByText("Simple Series Circuit");
    fireEvent.click(screen.getByText("Simple Series Circuit"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("A bulb needs to light up in a simple loop.");

    fireEvent.click(screen.getByText("Switch"));
    fireEvent.click(screen.getByText("Power source"));
    fireEvent.click(screen.getByRole("button", { name: "Test Circuit" }));

    await screen.findByText("✕ The circuit doesn't work yet.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test Circuit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("re-tapping a filled slot with nothing selected frees it back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Simple Series Circuit");
    fireEvent.click(screen.getByText("Simple Series Circuit"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("A bulb needs to light up in a simple loop.");

    fireEvent.click(screen.getByText("Battery"));
    fireEvent.click(screen.getByText("Power source"));
    const testButton = screen.getByRole("button", { name: "Test Circuit" });
    expect(testButton).not.toBeDisabled();

    // Tap the now-filled slot again with nothing selected — it should free up.
    fireEvent.click(screen.getByText("Power source"));
    expect(testButton).toBeDisabled();
    expect(screen.getByText("Battery")).toBeInTheDocument();
  });
});

describe("CircuitBuilder - themed payload play flow", () => {
  function mockThemedHappyPath() {
    api.get.mockImplementation((url) => {
      if (url === "/games/content") {
        return Promise.resolve({ data: { content: [THEMED_LEVEL] } });
      }
      if (url === "/home") {
        return Promise.resolve({ data: { streak_count: 0, xp_total: 5 } });
      }
      return Promise.reject(new Error(`unmocked GET ${url}`));
    });

    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({
          data: { sessionId: "sess2", content: { payload: THEMED_FULL_PAYLOAD } },
        });
      }
      if (url === "/games/sess2/attempt") {
        return Promise.resolve({ data: { isCorrect: true } });
      }
      if (url === "/games/sess2/complete") {
        return Promise.resolve({
          data: { xpAwarded: 20, newStreak: 1, masteryUpdate: { new_state: "learning" } },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });
  }

  test("a themed payload overrides every piece of on-screen copy", async () => {
    mockThemedHappyPath();
    renderGame();

    // ---- Level select screen uses the theme's top bar label and noun ----
    await screen.findByText("Capacitor Challenge");
    expect(screen.getByText("Assemble the Capacitor")).toBeInTheDocument();
    expect(screen.getByText("1 parts to place")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Charging a Capacitor"));

    // ---- Mission briefing uses the theme's objective ----
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));

    // ---- Play screen uses themed labels throughout ----
    await screen.findByText("A parallel-plate capacitor needs its dielectric placed correctly.");
    expect(
      screen.getByText("Capacitor slots (tap a part below, then tap a slot to place it):"),
    ).toBeInTheDocument();
    expect(screen.getByText("Parts:")).toBeInTheDocument();

    const testButton = screen.getByRole("button", { name: "Test Capacitor" });
    expect(testButton).toBeDisabled();

    fireEvent.click(screen.getByText("Insulating material between the plates"));
    fireEvent.click(screen.getByText("Dielectric"));
    expect(testButton).not.toBeDisabled();

    fireEvent.click(testButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess2/attempt", {
      mapping: { s1: "c1" },
    });

    await screen.findByText("✓ Capacitor charged!");
    expect(
      screen.getByText("A capacitor stores energy in the electric field between its plates.", {
        exact: false,
      }),
    ).toBeInTheDocument();

    // ---- Claim reward -> triggers /complete, using the themed result copy ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess2/complete");

    await screen.findByText("+20 XP");
    expect(screen.getByRole("button", { name: "Charge Another Capacitor" })).toBeInTheDocument();
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import RouteBuilder from "./RouteBuilder";

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
  title: "Source to Sea",
  difficulty: "easy",
  payload: {
    scrambled_stops: [
      { id: "st1", label: "River mouth" },
      { id: "st2", label: "Mountain spring" },
    ],
  },
};

const FULL_PAYLOAD = {
  journey_label: "Tracing a River's Course",
  scrambled_stops: [
    { id: "st2", label: "Mountain spring" },
    { id: "st1", label: "River mouth" },
  ],
  hint: "A river starts high and flows downhill toward the sea.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 3, xp_total: 40 } });
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
        data: { xpAwarded: 12, newStreak: 4, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <RouteBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RouteBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Route Builder...")).toBeInTheDocument();
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

describe("RouteBuilder - full play flow", () => {
  test("select level -> mission briefing -> plot stops in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Source to Sea");
    expect(screen.getByText("2-stop route")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Source to Sea"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "GEOGRAPHY_ROUTE_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Tracing a River's Course");
    const checkButton = screen.getByRole("button", { name: "Check Route" });
    expect(checkButton).toBeDisabled();

    // Tap stops in the correct geographic order (upstream to downstream).
    fireEvent.click(screen.getByText("📍 Mountain spring"));
    fireEvent.click(screen.getByText("📍 River mouth"));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["st2", "st1"],
    });

    await screen.findByText("✓ Route plotted correctly!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+12 XP");
    expect(screen.getByText("🔥 Streak 4")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect order shows failure feedback and does not unlock the reward button", async () => {
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
    await screen.findByText("Source to Sea");
    fireEvent.click(screen.getByText("Source to Sea"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Tracing a River's Course");

    fireEvent.click(screen.getByText("📍 River mouth"));
    fireEvent.click(screen.getByText("📍 Mountain spring"));
    fireEvent.click(screen.getByRole("button", { name: "Check Route" }));

    await screen.findByText("✕ That's not the right order.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Route" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("tapping an earlier stop undoes it and everything after it, back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Source to Sea");
    fireEvent.click(screen.getByText("Source to Sea"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Tracing a River's Course");

    fireEvent.click(screen.getByText("📍 Mountain spring"));
    fireEvent.click(screen.getByText("📍 River mouth"));
    const checkButton = screen.getByRole("button", { name: "Check Route" });
    expect(checkButton).not.toBeDisabled();

    // Undo the first placed stop — both stops should return to the tray.
    fireEvent.click(screen.getByText("1. Mountain spring"));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("📍 Mountain spring")).toBeInTheDocument();
    expect(screen.getByText("📍 River mouth")).toBeInTheDocument();
  });
});

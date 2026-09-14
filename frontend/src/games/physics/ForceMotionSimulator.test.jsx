import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import ForceMotionSimulator from "./ForceMotionSimulator";

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
  title: "Push the Cart",
  difficulty: "medium",
  payload: { scenario_text: "A 2 kg cart is pushed with 10 N of force." },
};

const FULL_PAYLOAD = {
  scenario_text: "A 2 kg cart is pushed with 10 N of force.",
  force_n: 10,
  mass_kg: 2,
  explore_min_force: 1,
  explore_max_force: 20,
  explore_min_mass: 1,
  explore_max_mass: 10,
  unit: "m/s²",
  hint: "Divide force by mass to get acceleration.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 2, xp_total: 35 } });
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
        data: { xpAwarded: 22, newStreak: 3, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <ForceMotionSimulator />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ForceMotionSimulator - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Force Simulator...")).toBeInTheDocument();
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

describe("ForceMotionSimulator - full play flow", () => {
  test("select level -> explore sliders -> predict -> submit correct -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Push the Cart");
    expect(screen.getByText("A 2 kg cart is pushed with 10 N of force.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Push the Cart"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "PHYSICS_FORCE_SIMULATOR",
      contentId: "lvl1",
    });

    // ---- Explore phase: sliders start at the challenge's own force/mass ----
    await screen.findByText("Free Play — no scenario yet");
    expect(screen.getByText("Force: 10 N")).toBeInTheDocument();
    expect(screen.getByText("Mass: 2 kg")).toBeInTheDocument();
    // ratio 10/2 = 5 -> "Fast" bucket
    expect(screen.getByText("Fast")).toBeInTheDocument();

    const [forceSlider, massSlider] = screen.getAllByRole("slider");
    // Push force way up relative to mass -> "Very fast" bucket (ratio 20/2 = 10)
    fireEvent.change(forceSlider, { target: { value: "20" } });
    expect(screen.getByText("Force: 20 N")).toBeInTheDocument();
    expect(screen.getByText("Very fast")).toBeInTheDocument();

    // Increase mass to slow it back down -> ratio 20/10 = 2 -> "Slow" bucket
    fireEvent.change(massSlider, { target: { value: "10" } });
    expect(screen.getByText("Mass: 10 kg")).toBeInTheDocument();
    expect(screen.getByText("Slow")).toBeInTheDocument();

    // ---- Move to the Predict phase ----
    fireEvent.click(screen.getByRole("button", { name: "Try the Real Scenario →" }));

    await screen.findByText("A 2 kg cart is pushed with 10 N of force.");
    expect(screen.getByText("Force: 10 N")).toBeInTheDocument();
    expect(screen.getByText("Mass: 2 kg")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "Submit Prediction" });
    expect(submitButton).toBeDisabled(); // no answer typed yet

    const answerInput = screen.getByPlaceholderText("?");
    fireEvent.change(answerInput, { target: { value: "5" } });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", { answer: 5 });

    await screen.findByText("✓ Correct — the cart matches your prediction!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+22 XP");
    expect(screen.getByText("🔥 Streak 3")).toBeInTheDocument();
    expect(screen.getByText("Updated to: strong")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("Back during an active simulation asks to confirm, and Leave returns to level select", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Push the Cart");
    fireEvent.click(screen.getByText("Push the Cart"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Free Play — no scenario yet");

    fireEvent.click(screen.getByLabelText("Go back"));
    expect(await screen.findByText("Leave this mission?")).toBeInTheDocument();
    expect(screen.getByText("Free Play — no scenario yet")).toBeInTheDocument(); // still mid-simulation underneath

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(screen.queryByText("Leave this mission?")).not.toBeInTheDocument();
    await screen.findByText("Push the Cart"); // back on level select
  });

  test("an incorrect prediction shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "Check your division." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Push the Cart");
    fireEvent.click(screen.getByText("Push the Cart"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Free Play — no scenario yet");

    fireEvent.click(screen.getByRole("button", { name: "Try the Real Scenario →" }));
    await screen.findByPlaceholderText("?");

    fireEvent.change(screen.getByPlaceholderText("?"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Prediction" }));

    await screen.findByText("✕ Not quite yet.");
    expect(screen.getByText("Check your division.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Prediction" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("the back button from the Predict phase returns to Explore, not Home", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Push the Cart");
    fireEvent.click(screen.getByText("Push the Cart"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Free Play — no scenario yet");

    fireEvent.click(screen.getByRole("button", { name: "Try the Real Scenario →" }));
    await screen.findByPlaceholderText("?");

    // The top bar's back control returns to Explore rather than navigating home.
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    await screen.findByText("Free Play — no scenario yet");
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
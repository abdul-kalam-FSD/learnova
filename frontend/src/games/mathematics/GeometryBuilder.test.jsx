import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import GeometryBuilder from "./GeometryBuilder";

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
  title: "Build a Square",
  difficulty: "easy",
  payload: {
    target: { shape: "square", perimeter: 20, unit: "cm" },
  },
};

const FULL_PAYLOAD = {
  target: { shape: "square", perimeter: 20, unit: "cm" },
  pieces: [
    { id: "p1", length: 5 },
    { id: "p2", length: 5 },
    { id: "p3", length: 5 },
    { id: "p4", length: 5 },
    { id: "p5", length: 8 },
  ],
  hint: "A square has four equal sides — find four pieces that add to the perimeter.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 0, xp_total: 15 } });
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
        data: { xpAwarded: 16, newStreak: 1, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <GeometryBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GeometryBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Geometry Builder...")).toBeInTheDocument();
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

describe("GeometryBuilder - full play flow", () => {
  test("select level -> play -> add sides -> submit correct -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Build a Square");
    expect(screen.getByText("Target: 20cm")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Build a Square"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "MATH_GEOMETRY_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Build a square with perimeter 20cm");
    const checkButton = screen.getByRole("button", { name: "Check Construction" });
    expect(checkButton).toBeDisabled(); // nothing placed yet

    // Add the four 5cm sides from the pool (skip the 8cm distractor).
    const fiveCmPieces = screen.getAllByRole("button", { name: "5cm" });
    fireEvent.click(fiveCmPieces[0]);
    // Re-query after each click since the pool re-renders.
    fireEvent.click(screen.getAllByRole("button", { name: "5cm" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "5cm" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "5cm" })[0]);
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedPieceIds: ["p1", "p2", "p3", "p4"],
    });

    await screen.findByText("✓ Shape constructed!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+16 XP");
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("including the 8cm distractor shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({
          data: { isCorrect: false, hint: "That doesn't add up to the target perimeter." },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Build a Square");
    fireEvent.click(screen.getByText("Build a Square"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Build a square with perimeter 20cm");

    fireEvent.click(screen.getByRole("button", { name: "8cm" }));
    fireEvent.click(screen.getByRole("button", { name: "Check Construction" }));

    await screen.findByText("✕ That doesn't build the target shape.");
    expect(screen.getByText("That doesn't add up to the target perimeter.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Construction" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("removing a placed side sends it back to the pool", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Build a Square");
    fireEvent.click(screen.getByText("Build a Square"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Build a square with perimeter 20cm");

    fireEvent.click(screen.getAllByRole("button", { name: "5cm" })[0]);
    const checkButton = screen.getByRole("button", { name: "Check Construction" });
    expect(checkButton).not.toBeDisabled();
    expect(screen.getByText("Sides placed (tap to remove):")).toBeInTheDocument();

    // Only one 5cm piece is placed — the pool now has three 5cm pieces
    // left, plus the one 5cm piece sitting in the "placed" panel below.
    expect(screen.getAllByRole("button", { name: "5cm" })).toHaveLength(4);

    // Remove the placed side — it goes back to the pool and the panel disappears.
    const placedPanel = screen.getByText("Sides placed (tap to remove):").nextElementSibling;
    fireEvent.click(placedPanel.querySelector("button"));

    expect(checkButton).toBeDisabled();
    expect(screen.queryByText("Sides placed (tap to remove):")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "5cm" })).toHaveLength(4);
  });
});

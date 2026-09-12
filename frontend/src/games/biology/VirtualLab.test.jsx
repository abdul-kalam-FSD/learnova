import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import VirtualLab from "./VirtualLab";

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
  title: "Plant Cell Basics",
  difficulty: "easy",
  payload: { specimen: "plant_cell" },
};

const FULL_PAYLOAD = {
  prompt: "Identify the structure that controls what enters and exits the cell.",
  hotspots: [
    { id: "h1", label: "Cell membrane", x: 20, y: 30 },
    { id: "h2", label: "Nucleus", x: 60, y: 50 },
  ],
  hint: "It sits at the very edge of the cell.",
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
      <VirtualLab />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VirtualLab - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Virtual Lab...")).toBeInTheDocument();
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

describe("VirtualLab - full play flow", () => {
  test("select level -> mission briefing -> pick hotspot -> examine -> log finding -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Plant Cell Basics");
    expect(screen.getByText("plant cell")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Plant Cell Basics"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "BIO_VIRTUAL_LAB",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Identify the structure that controls what enters and exits the cell.");
    const examineButton = screen.getByRole("button", { name: "Examine Specimen" });
    expect(examineButton).toBeDisabled(); // nothing picked yet

    fireEvent.click(screen.getByText("Cell membrane"));
    expect(examineButton).not.toBeDisabled();

    fireEvent.click(examineButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedHotspotId: "h1",
    });

    await screen.findByText("✓ Correct identification!");

    // ---- Log finding -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Log Finding →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+10 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("picking the wrong structure shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "That's not it — look again." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Plant Cell Basics");
    fireEvent.click(screen.getByText("Plant Cell Basics"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Identify the structure that controls what enters and exits the cell.");

    fireEvent.click(screen.getByText("Nucleus"));
    fireEvent.click(screen.getByRole("button", { name: "Examine Specimen" }));

    await screen.findByText("✕ Not quite.");
    expect(screen.getByText("That's not it — look again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Examine Specimen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log Finding →" })).not.toBeInTheDocument();
  });

  test("re-picking a different hotspot before submitting updates the selection", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Plant Cell Basics");
    fireEvent.click(screen.getByText("Plant Cell Basics"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Identify the structure that controls what enters and exits the cell.");

    fireEvent.click(screen.getByText("Nucleus"));
    fireEvent.click(screen.getByText("Cell membrane"));
    fireEvent.click(screen.getByRole("button", { name: "Examine Specimen" }));

    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedHotspotId: "h1",
    });
    await screen.findByText("✓ Correct identification!");
  });
});

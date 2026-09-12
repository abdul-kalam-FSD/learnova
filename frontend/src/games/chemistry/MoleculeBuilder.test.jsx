import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import MoleculeBuilder from "./MoleculeBuilder";

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
  title: "Build Water",
  difficulty: "easy",
  payload: {
    atom_pool: [
      { id: "a1", symbol: "H" },
      { id: "a2", symbol: "H" },
      { id: "a3", symbol: "O" },
      { id: "a4", symbol: "Na" },
    ],
  },
};

const FULL_PAYLOAD = {
  target_formula: "H2O",
  target_name: "Water",
  atom_pool: [
    { id: "a1", symbol: "H" },
    { id: "a2", symbol: "H" },
    { id: "a3", symbol: "O" },
    { id: "a4", symbol: "Na" },
  ],
  hint: "Water needs two hydrogen atoms and one oxygen atom.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 0, xp_total: 10 } });
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
        data: { xpAwarded: 18, newStreak: 1, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <MoleculeBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MoleculeBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Molecule Builder...")).toBeInTheDocument();
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

describe("MoleculeBuilder - full play flow", () => {
  test("select level -> play -> add atoms -> submit correct -> claim reward -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Build Water");
    expect(screen.getByText("4 atoms in the pool")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Build Water"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "CHEMISTRY_MOLECULE_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("Build Water (H₂O)");
    const checkButton = screen.getByRole("button", { name: "Check Molecule" });
    expect(checkButton).toBeDisabled(); // nothing placed yet
    expect(screen.getByText("Empty — tap atoms above")).toBeInTheDocument();

    // Tap the two H atoms and the O atom from the pool (skip the Na distractor).
    const pool = screen.getByText("Atom pool — tap to add:").nextElementSibling;
    const [firstH, secondH, oxygen] = pool.querySelectorAll("button");
    fireEvent.click(firstH);
    fireEvent.click(secondH);
    fireEvent.click(oxygen);
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedPieceIds: ["a1", "a2", "a3"],
    });

    await screen.findByText("✓ Molecule assembled!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+18 XP");
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("including the distractor atom shows failure feedback and does not unlock the reward button", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({
          data: { isCorrect: false, hint: "Sodium isn't part of a water molecule." },
        });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Build Water");
    fireEvent.click(screen.getByText("Build Water"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Build Water (H₂O)");

    fireEvent.click(screen.getAllByRole("button", { name: "H" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Na" }));

    fireEvent.click(screen.getByRole("button", { name: "Check Molecule" }));

    await screen.findByText("✕ Not quite this molecule.");
    expect(screen.getByText("Sodium isn't part of a water molecule.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Molecule" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("removing a placed atom sends it back to the pool and can empty the molecule again", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Build Water");
    fireEvent.click(screen.getByText("Build Water"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Build Water (H₂O)");

    const pool = () => screen.getByText("Atom pool — tap to add:").nextElementSibling;
    fireEvent.click(pool().querySelectorAll("button")[0]); // place first H
    const checkButton = screen.getByRole("button", { name: "Check Molecule" });
    expect(checkButton).not.toBeDisabled();

    // The placed atom now appears in the "your molecule" row — tap it there to remove.
    const placedRow = screen.getByText("Your molecule (tap to remove):").nextElementSibling;
    fireEvent.click(placedRow.querySelectorAll("button")[0]);

    expect(checkButton).toBeDisabled();
    expect(screen.getByText("Empty — tap atoms above")).toBeInTheDocument();
    // It's back in the pool: 4 atoms available again.
    expect(pool().querySelectorAll("button")).toHaveLength(4);
  });
});

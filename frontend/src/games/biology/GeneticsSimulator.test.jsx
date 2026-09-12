import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import GeneticsSimulator from "./GeneticsSimulator";

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
  title: "Tall vs Short Pea Plants",
  difficulty: "easy",
  payload: {
    cells: [
      { id: "cell_0_0", row: 0, col: 0 },
      { id: "cell_0_1", row: 0, col: 1 },
      { id: "cell_1_0", row: 1, col: 0 },
      { id: "cell_1_1", row: 1, col: 1 },
    ],
  },
};

// The two cells that should both end up "Tt" are the deliberate,
// historically-buggy case: two boxes filled with an identical genotype
// string. Because genotypeOptions has only one reusable "Tt" stamp
// (not two indistinguishable tile instances) and both the stamps and
// the grid cells carry their own data-testid, tests can target each
// one precisely without ever relying on visible text being unique —
// which it isn't, once more than one cell shares a genotype.
const FULL_PAYLOAD = {
  scenario: "Cross two heterozygous (Tt) pea plants.",
  trait: "T = Tall (dominant), t = short (recessive)",
  parent1Label: "Parent 1: Tt",
  parent2Label: "Parent 2: Tt",
  colAlleles: ["T", "t"],
  rowAlleles: ["T", "t"],
  cells: [
    { id: "cell_0_0", row: 0, col: 0 },
    { id: "cell_0_1", row: 0, col: 1 },
    { id: "cell_1_0", row: 1, col: 0 },
    { id: "cell_1_1", row: 1, col: 1 },
  ],
  genotypeOptions: ["TT", "Tt", "tt"],
  hint: "Combine the column allele and the row allele — capital letters come first.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 2, xp_total: 40 } });
    }
    return Promise.reject(new Error(`unmocked GET ${url}`));
  });

  api.post.mockImplementation((url) => {
    if (url === "/games/start") {
      return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
    }
    if (url === "/games/sess1/attempt") {
      return Promise.resolve({
        data: {
          isCorrect: true,
          explanation: "This cross produces a 3 Tall : 1 short phenotype ratio.",
        },
      });
    }
    if (url === "/games/sess1/complete") {
      return Promise.resolve({
        data: { xpAwarded: 15, newStreak: 3, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <GeneticsSimulator />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GeneticsSimulator - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Genetics Simulator...")).toBeInTheDocument();
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

describe("GeneticsSimulator - level select", () => {
  test("lists the level with its box count", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Tall vs Short Pea Plants");
    expect(screen.getByText("4-box Punnett square")).toBeInTheDocument();
  });
});

describe("GeneticsSimulator - filling the Punnett square", () => {
  async function playToBoard() {
    renderGame();
    await screen.findByText("Tall vs Short Pea Plants");
    fireEvent.click(screen.getByText("Tall vs Short Pea Plants"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("Cross two heterozygous (Tt) pea plants.");
  }

  test("each box starts empty and Run Cross is disabled", async () => {
    mockHappyPath();
    await playToBoard();

    expect(screen.getByTestId("cell-cell_0_0")).toHaveTextContent("—");
    expect(screen.getByTestId("cell-cell_0_1")).toHaveTextContent("—");
    expect(screen.getByTestId("cell-cell_1_0")).toHaveTextContent("—");
    expect(screen.getByTestId("cell-cell_1_1")).toHaveTextContent("—");
    expect(screen.getByRole("button", { name: "Run Cross" })).toBeDisabled();
  });

  test("tap a genotype then tap a box to fill it — including two boxes sharing the same genotype", async () => {
    mockHappyPath();
    await playToBoard();

    // Fill the two homozygous corners first.
    fireEvent.click(screen.getByTestId("genotype-TT"));
    fireEvent.click(screen.getByTestId("cell-cell_0_0"));
    expect(screen.getByTestId("cell-cell_0_0")).toHaveTextContent("TT");

    fireEvent.click(screen.getByTestId("genotype-tt"));
    fireEvent.click(screen.getByTestId("cell-cell_1_1"));
    expect(screen.getByTestId("cell-cell_1_1")).toHaveTextContent("tt");

    // Fill BOTH heterozygous boxes with the same reusable "Tt" stamp —
    // this is exactly the historically-ambiguous case, asserted here
    // per-cell via data-testid rather than by matching "Tt" text.
    fireEvent.click(screen.getByTestId("genotype-Tt"));
    fireEvent.click(screen.getByTestId("cell-cell_0_1"));
    fireEvent.click(screen.getByTestId("genotype-Tt"));
    fireEvent.click(screen.getByTestId("cell-cell_1_0"));

    expect(screen.getByTestId("cell-cell_0_1")).toHaveTextContent("Tt");
    expect(screen.getByTestId("cell-cell_1_0")).toHaveTextContent("Tt");
    // The "Tt" stamp itself is still a single element throughout — it
    // was never consumed or duplicated, even though two cells now
    // display the same "Tt" text it produced.
    expect(screen.getAllByTestId("genotype-Tt")).toHaveLength(1);

    expect(screen.getByRole("button", { name: "Run Cross" })).not.toBeDisabled();
  });

  test("tapping a filled box with no genotype selected clears it", async () => {
    mockHappyPath();
    await playToBoard();

    fireEvent.click(screen.getByTestId("genotype-TT"));
    fireEvent.click(screen.getByTestId("cell-cell_0_0"));
    expect(screen.getByTestId("cell-cell_0_0")).toHaveTextContent("TT");

    fireEvent.click(screen.getByTestId("cell-cell_0_0"));
    expect(screen.getByTestId("cell-cell_0_0")).toHaveTextContent("—");
  });

  test("submitting a correct cross reveals the phenotype-ratio explanation, then completes the session", async () => {
    mockHappyPath();
    await playToBoard();

    fireEvent.click(screen.getByTestId("genotype-TT"));
    fireEvent.click(screen.getByTestId("cell-cell_0_0"));
    fireEvent.click(screen.getByTestId("genotype-Tt"));
    fireEvent.click(screen.getByTestId("cell-cell_0_1"));
    fireEvent.click(screen.getByTestId("genotype-Tt"));
    fireEvent.click(screen.getByTestId("cell-cell_1_0"));
    fireEvent.click(screen.getByTestId("genotype-tt"));
    fireEvent.click(screen.getByTestId("cell-cell_1_1"));

    fireEvent.click(screen.getByRole("button", { name: "Run Cross" }));

    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      mapping: { cell_0_0: "TT", cell_0_1: "Tt", cell_1_0: "Tt", cell_1_1: "tt" },
    });

    await screen.findByText("✓ Cross complete!");
    expect(
      screen.getByText("This cross produces a 3 Tall : 1 short phenotype ratio."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    await screen.findByText("+15 XP");
    expect(screen.getByText("🔥 Streak 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect cross shows the hint but never leaks the explanation", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "Check the tt corner again." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    await playToBoard();

    fireEvent.click(screen.getByTestId("genotype-TT"));
    fireEvent.click(screen.getByTestId("cell-cell_0_0"));
    fireEvent.click(screen.getByTestId("genotype-TT"));
    fireEvent.click(screen.getByTestId("cell-cell_0_1"));
    fireEvent.click(screen.getByTestId("genotype-Tt"));
    fireEvent.click(screen.getByTestId("cell-cell_1_0"));
    fireEvent.click(screen.getByTestId("genotype-tt"));
    fireEvent.click(screen.getByTestId("cell-cell_1_1"));

    fireEvent.click(screen.getByRole("button", { name: "Run Cross" }));

    await screen.findByText("✕ That's not quite the right cross.");
    expect(screen.getByText("Check the tt corner again.")).toBeInTheDocument();
    expect(screen.queryByText(/phenotype ratio/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });
});

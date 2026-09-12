import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import Diagnosis from "./Diagnosis";

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
  title: "The Tired Sailor",
  difficulty: "easy",
  payload: {
    evidence: [{ id: "ev1" }, { id: "ev2" }, { id: "ev3" }],
  },
};

const FULL_PAYLOAD = {
  scenario: "A sailor reports bleeding gums and slow-healing wounds after months without fresh produce.",
  evidence: [
    { id: "ev1", label: "Bleeding gums", detail: "Gums bleed with light brushing." },
    { id: "ev2", label: "Mild fever", detail: "An unrelated cold caught last week." },
    { id: "ev3", label: "Diet: no fresh produce", detail: "Six months with zero vitamin C intake." },
  ],
  hint: "The fever is unrelated to his diet.",
};

function mockHappyPath() {
  api.get.mockImplementation((url) => {
    if (url === "/games/content") {
      return Promise.resolve({ data: { content: [LEVEL] } });
    }
    if (url === "/home") {
      return Promise.resolve({ data: { streak_count: 4, xp_total: 60 } });
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
          diagnosis: "Scurvy (Vitamin C deficiency)",
          explanation: "Months without vitamin C weakened his connective tissue.",
        },
      });
    }
    if (url === "/games/sess1/complete") {
      return Promise.resolve({
        data: { xpAwarded: 20, newStreak: 5, masteryUpdate: { new_state: "strong" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <Diagnosis />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Diagnosis - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Diagnosis...")).toBeInTheDocument();
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

describe("Diagnosis - level select", () => {
  test("lists the level with its evidence count", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("The Tired Sailor");
    expect(screen.getByText("3 pieces of evidence")).toBeInTheDocument();
  });
});

describe("Diagnosis - inspect then select flow", () => {
  test("first tap only inspects a card (reveals detail, no selection); second tap selects it", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("The Tired Sailor");
    fireEvent.click(screen.getByText("The Tired Sailor"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A sailor reports bleeding gums/);

    // Before inspecting: placeholder text shown, detail hidden.
    expect(screen.getAllByText("Tap to inspect")).toHaveLength(3);
    expect(screen.queryByText("Gums bleed with light brushing.")).not.toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "Submit Diagnosis" });
    expect(submitButton).toBeDisabled(); // nothing selected yet

    // First tap on "Bleeding gums" -> inspects only, doesn't select.
    fireEvent.click(screen.getByText("Bleeding gums"));
    await screen.findByText("Gums bleed with light brushing.");
    expect(submitButton).toBeDisabled();

    // Second tap -> now selects it as supporting evidence.
    fireEvent.click(screen.getByText("Bleeding gums"));
    expect(submitButton).not.toBeDisabled();
  });

  test("submitting a correct diagnosis reveals the diagnosis name and explanation, then completes the session", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("The Tired Sailor");
    fireEvent.click(screen.getByText("The Tired Sailor"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A sailor reports bleeding gums/);

    // Inspect + select "Bleeding gums" and "Diet: no fresh produce".
    fireEvent.click(screen.getByText("Bleeding gums"));
    fireEvent.click(screen.getByText("Bleeding gums"));
    fireEvent.click(screen.getByText("Diet: no fresh produce"));
    fireEvent.click(screen.getByText("Diet: no fresh produce"));

    fireEvent.click(screen.getByRole("button", { name: "Submit Diagnosis" }));

    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedPieceIds: ["ev1", "ev3"],
    });

    await screen.findByText("✓ Diagnosis confirmed!");
    expect(screen.getByText("Diagnosis: Scurvy (Vitamin C deficiency)")).toBeInTheDocument();
    expect(
      screen.getByText("Months without vitamin C weakened his connective tissue."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    await screen.findByText("+20 XP");
    expect(screen.getByText("🔥 Streak 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect diagnosis shows the hint but never leaks the diagnosis or explanation", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "That fever isn't the cause here." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("The Tired Sailor");
    fireEvent.click(screen.getByText("The Tired Sailor"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A sailor reports bleeding gums/);

    // Inspect + select the wrong evidence: "Mild fever".
    fireEvent.click(screen.getByText("Mild fever"));
    fireEvent.click(screen.getByText("Mild fever"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Diagnosis" }));

    await screen.findByText("✕ Not quite right.");
    expect(screen.getByText("That fever isn't the cause here.")).toBeInTheDocument();
    expect(screen.queryByText(/Diagnosis:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("tapping a selected card a third time deselects it", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("The Tired Sailor");
    fireEvent.click(screen.getByText("The Tired Sailor"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A sailor reports bleeding gums/);

    const card = screen.getByText("Bleeding gums");
    fireEvent.click(card); // inspect
    fireEvent.click(card); // select
    expect(screen.getByRole("button", { name: "Submit Diagnosis" })).not.toBeDisabled();

    fireEvent.click(card); // deselect
    expect(screen.getByRole("button", { name: "Submit Diagnosis" })).toBeDisabled();
  });
});

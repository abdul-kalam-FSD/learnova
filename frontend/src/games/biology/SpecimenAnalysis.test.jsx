import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import SpecimenAnalysis from "./SpecimenAnalysis";

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
  title: "Specimen A: The Garden Visitor",
  difficulty: "easy",
  payload: {
    features: [{ id: "f1" }, { id: "f2" }, { id: "f3" }],
  },
};

const FULL_PAYLOAD = {
  specimenName: "Specimen A: The Garden Visitor",
  context: "A small creature is found resting on a rose bush.",
  features: [
    { id: "f1", label: "Six jointed legs", detail: "Legs are arranged in three pairs." },
    { id: "f2", label: "Body divided into three regions", detail: "A head, thorax, and abdomen are visible." },
    { id: "f3", label: "Found at sunrise", detail: "It was resting on a leaf at sunrise." },
  ],
  classificationOptions: [
    { id: "insect", label: "Insect (Class Insecta)" },
    { id: "arachnid", label: "Arachnid (Class Arachnida)" },
  ],
  hint: "Count the legs and body regions — when it was found doesn't matter.",
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
          explanation: "Six legs in three pairs and a three-part body are defining insect traits.",
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
      <SpecimenAnalysis />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SpecimenAnalysis - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Specimen Analysis...")).toBeInTheDocument();
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

describe("SpecimenAnalysis - level select", () => {
  test("lists the level with its feature count", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Specimen A: The Garden Visitor");
    expect(screen.getByText("3 features to inspect")).toBeInTheDocument();
  });
});

describe("SpecimenAnalysis - inspect then classify flow", () => {
  test("classification is locked until every feature has been inspected", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Specimen A: The Garden Visitor");
    fireEvent.click(screen.getByText("Specimen A: The Garden Visitor"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A small creature is found/);

    // Before inspecting anything: placeholders shown, details hidden.
    expect(screen.getAllByText("Tap to observe")).toHaveLength(3);
    expect(screen.queryByText("Legs are arranged in three pairs.")).not.toBeInTheDocument();
    expect(screen.getByText("Inspect every feature above to unlock classification.")).toBeInTheDocument();

    // Classification options are disabled while not all features are inspected.
    const insectOption = screen.getByRole("button", { name: "Insect (Class Insecta)" });
    expect(insectOption).toBeDisabled();

    // Inspect two of three — still locked.
    fireEvent.click(screen.getByText("Six jointed legs"));
    fireEvent.click(screen.getByText("Body divided into three regions"));
    expect(insectOption).toBeDisabled();
    expect(screen.getByText("Inspect every feature above to unlock classification.")).toBeInTheDocument();

    // Inspect the last one — now unlocked.
    fireEvent.click(screen.getByText("Found at sunrise"));
    expect(screen.getByText("Now identify what this specimen is:")).toBeInTheDocument();
    expect(insectOption).not.toBeDisabled();
  });

  test("submitting a correct classification reveals the explanation, then completes the session", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Specimen A: The Garden Visitor");
    fireEvent.click(screen.getByText("Specimen A: The Garden Visitor"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A small creature is found/);

    fireEvent.click(screen.getByText("Six jointed legs"));
    fireEvent.click(screen.getByText("Body divided into three regions"));
    fireEvent.click(screen.getByText("Found at sunrise"));

    fireEvent.click(screen.getByRole("button", { name: "Insect (Class Insecta)" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Classification" }));

    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedHotspotId: "insect",
    });

    await screen.findByText("✓ Classification confirmed!");
    expect(
      screen.getByText("Six legs in three pairs and a three-part body are defining insect traits."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Claim Reward →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    await screen.findByText("+20 XP");
    expect(screen.getByText("🔥 Streak 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect classification shows the hint but never leaks the explanation", async () => {
    mockHappyPath();
    api.post.mockImplementation((url) => {
      if (url === "/games/start") {
        return Promise.resolve({ data: { sessionId: "sess1", content: { payload: FULL_PAYLOAD } } });
      }
      if (url === "/games/sess1/attempt") {
        return Promise.resolve({ data: { isCorrect: false, hint: "Count the legs again." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("Specimen A: The Garden Visitor");
    fireEvent.click(screen.getByText("Specimen A: The Garden Visitor"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A small creature is found/);

    fireEvent.click(screen.getByText("Six jointed legs"));
    fireEvent.click(screen.getByText("Body divided into three regions"));
    fireEvent.click(screen.getByText("Found at sunrise"));

    fireEvent.click(screen.getByRole("button", { name: "Arachnid (Class Arachnida)" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Classification" }));

    await screen.findByText("✕ Not quite right.");
    expect(screen.getByText("Count the legs again.")).toBeInTheDocument();
    expect(screen.queryByText(/defining insect traits/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("the submit button stays disabled until a classification is chosen", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Specimen A: The Garden Visitor");
    fireEvent.click(screen.getByText("Specimen A: The Garden Visitor"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/A small creature is found/);

    const submitButton = screen.getByRole("button", { name: "Submit Classification" });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByText("Six jointed legs"));
    fireEvent.click(screen.getByText("Body divided into three regions"));
    fireEvent.click(screen.getByText("Found at sunrise"));
    expect(submitButton).toBeDisabled(); // inspected, but nothing chosen yet

    fireEvent.click(screen.getByRole("button", { name: "Insect (Class Insecta)" }));
    expect(submitButton).not.toBeDisabled();
  });
});

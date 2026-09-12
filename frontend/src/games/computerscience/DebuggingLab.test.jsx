import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import DebuggingLab from "./DebuggingLab";

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
  title: "Off-by-One Loop",
  difficulty: "medium",
  payload: {
    code_lines: [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
  },
};

const FULL_PAYLOAD = {
  scenario_label: "A loop that sums every element of an array",
  code_lines: [
    { id: "c1", code_text: "sum = 0" },
    { id: "c2", code_text: "for i in range 1 to length of arr" },
    { id: "c3", code_text: "sum = sum + arr[i]" },
  ],
  hint: "Check the starting index of the loop.",
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
      <DebuggingLab />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DebuggingLab - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("Loading Debugging Lab...")).toBeInTheDocument();
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

describe("DebuggingLab - full play flow", () => {
  test("select level -> mission briefing -> tap the buggy line -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("Off-by-One Loop");
    expect(screen.getByText("3-line algorithm")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Off-by-One Loop"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "CS_DEBUGGING_LAB",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("A loop that sums every element of an array");
    const runButton = screen.getByRole("button", { name: "Run Debugger" });
    expect(runButton).toBeDisabled();

    // Tap the buggy line (the loop starts at index 1, skipping arr[0]).
    fireEvent.click(screen.getByText("for i in range 1 to length of arr", { exact: false }));
    expect(runButton).not.toBeDisabled();

    fireEvent.click(runButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedHotspotId: "c2",
    });

    await screen.findByText("✓ Bug found!");

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

  test("picking the wrong line shows failure feedback and does not unlock the reward button", async () => {
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
    await screen.findByText("Off-by-One Loop");
    fireEvent.click(screen.getByText("Off-by-One Loop"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("A loop that sums every element of an array");

    fireEvent.click(screen.getByText("sum = 0", { exact: false }));
    fireEvent.click(screen.getByRole("button", { name: "Run Debugger" }));

    await screen.findByText("✕ That line isn't the bug.");
    expect(screen.getByText("Not quite — try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Debugger" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Reward →" })).not.toBeInTheDocument();
  });

  test("picking a different line before submitting changes which line is checked", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("Off-by-One Loop");
    fireEvent.click(screen.getByText("Off-by-One Loop"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("A loop that sums every element of an array");

    // Pick the wrong line first, then change the pick before submitting.
    fireEvent.click(screen.getByText("sum = sum + arr[i]", { exact: false }));
    fireEvent.click(screen.getByText("for i in range 1 to length of arr", { exact: false }));
    fireEvent.click(screen.getByRole("button", { name: "Run Debugger" }));

    await screen.findByText("✓ Bug found!");
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      selectedHotspotId: "c2",
    });
  });
});

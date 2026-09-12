import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import SentenceBuilder from "./SentenceBuilder";

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
  title: "எளிய வாக்கியம்",
  difficulty: "easy",
  payload: {
    scrambled_words: [
      { id: "w1", label: "நான்" },
      { id: "w2", label: "புத்தகம்" },
      { id: "w3", label: "படிக்கிறேன்" },
    ],
  },
};

const FULL_PAYLOAD = {
  scenario_label: "தினசரி பழக்கம்",
  scrambled_words: [
    { id: "w3", label: "படிக்கிறேன்" },
    { id: "w1", label: "நான்" },
    { id: "w2", label: "புத்தகம்" },
  ],
  hint: "எழுவாயில் தொடங்கவும்.",
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
      <SentenceBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Tamil SentenceBuilder - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("வாக்கிய அமைப்பு ஏற்றப்படுகிறது...")).toBeInTheDocument();
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

describe("Tamil SentenceBuilder - full play flow", () => {
  test("select level -> mission briefing -> arrange words in order -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("எளிய வாக்கியம்");
    expect(screen.getByText("3 சொற்கள் கொண்ட வாக்கியம்")).toBeInTheDocument();
    fireEvent.click(screen.getByText("எளிய வாக்கியம்"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "TAMIL_SENTENCE_BUILDER",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText("தினசரி பழக்கம்");
    const checkButton = screen.getByRole("button", { name: "வாக்கியத்தை சரிபார்" });
    expect(checkButton).toBeDisabled();

    // Tap words in the correct grammatical order.
    fireEvent.click(screen.getByRole("button", { name: "நான்" }));
    fireEvent.click(screen.getByRole("button", { name: "புத்தகம்" }));
    fireEvent.click(screen.getByRole("button", { name: "படிக்கிறேன்" }));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      orderedPieceIds: ["w1", "w2", "w3"],
    });

    await screen.findByText("✓ வாக்கியம் சரியாக அமைந்தது!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "வெகுமதி பெறு →" }));
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
        return Promise.resolve({ data: { isCorrect: false, hint: "மீண்டும் முயற்சி செய்." } });
      }
      return Promise.reject(new Error(`unmocked POST ${url}`));
    });

    renderGame();
    await screen.findByText("எளிய வாக்கியம்");
    fireEvent.click(screen.getByText("எளிய வாக்கியம்"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("தினசரி பழக்கம்");

    fireEvent.click(screen.getByRole("button", { name: "படிக்கிறேன்" }));
    fireEvent.click(screen.getByRole("button", { name: "நான்" }));
    fireEvent.click(screen.getByRole("button", { name: "புத்தகம்" }));
    fireEvent.click(screen.getByRole("button", { name: "வாக்கியத்தை சரிபார்" }));

    await screen.findByText("✕ வரிசை சரியில்லை.");
    expect(screen.getByText("மீண்டும் முயற்சி செய்.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "வாக்கியத்தை சரிபார்" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "வெகுமதி பெறு →" })).not.toBeInTheDocument();
  });

  test("tapping an earlier placed word undoes it and everything after it, back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("எளிய வாக்கியம்");
    fireEvent.click(screen.getByText("எளிய வாக்கியம்"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText("தினசரி பழக்கம்");

    fireEvent.click(screen.getByRole("button", { name: "நான்" }));
    fireEvent.click(screen.getByRole("button", { name: "புத்தகம்" }));
    fireEvent.click(screen.getByRole("button", { name: "படிக்கிறேன்" }));
    const checkButton = screen.getByRole("button", { name: "வாக்கியத்தை சரிபார்" });
    expect(checkButton).not.toBeDisabled();

    // Undo the first placed word — all three words should return to the tray.
    fireEvent.click(screen.getAllByRole("button", { name: "நான்" })[0]);
    expect(checkButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "நான்" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "புத்தகம்" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "படிக்கிறேன்" })).toBeInTheDocument();
  });
});

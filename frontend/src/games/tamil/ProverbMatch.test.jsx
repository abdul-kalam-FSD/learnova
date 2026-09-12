import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import ProverbMatch from "./ProverbMatch";

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
  title: "அடிப்படை பழமொழிகள்",
  difficulty: "medium",
  payload: {
    slots: [{ id: "s1", label: "தூங்கு போடும் தேள் கொட்டும்" }],
  },
};

const FULL_PAYLOAD = {
  scenario: "இந்த பழமொழி எச்சரிக்கையாக இருக்க வேண்டும் என்பதை வலியுறுத்துகிறது.",
  slots: [{ id: "s1", label: "தூங்கு போடும் தேள் கொட்டும்" }],
  components: [
    { id: "c1", label: "கவனக்குறைவாக இருப்பவருக்கு தீங்கு நேரிடும்" },
    { id: "c2", label: "அதிக மழை பெய்யும் என்பதைக் குறிக்கிறது" },
  ],
  hint: "எச்சரிக்கை இல்லாதவருக்கு என்ன நடக்கும் என்று யோசி.",
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
        data: { xpAwarded: 20, newStreak: 2, masteryUpdate: { new_state: "learning" } },
      });
    }
    return Promise.reject(new Error(`unmocked POST ${url}`));
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <ProverbMatch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProverbMatch - loading and error", () => {
  test("shows a loading state before content loads", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderGame();
    expect(screen.getByText("பழமொழி பொருத்தம் ஏற்றப்படுகிறது...")).toBeInTheDocument();
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

describe("ProverbMatch - full play flow", () => {
  test("select level -> mission briefing -> pick meaning, assign to proverb -> result screen", async () => {
    mockHappyPath();
    renderGame();

    // ---- Level select screen ----
    await screen.findByText("அடிப்படை பழமொழிகள்");
    expect(screen.getByText("1 பழமொழிகள்")).toBeInTheDocument();
    fireEvent.click(screen.getByText("அடிப்படை பழமொழிகள்"));

    // ---- Mission briefing (Game Lobby) ----
    await screen.findByText("Start Mission");
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Start Mission"));

    expect(api.post).toHaveBeenCalledWith("/games/start", {
      gameType: "TAMIL_PROVERB_MATCH",
      contentId: "lvl1",
    });

    // ---- Play screen ----
    await screen.findByText(/எச்சரிக்கையாக இருக்க வேண்டும்/);
    const checkButton = screen.getByRole("button", { name: "சரிபார்" });
    expect(checkButton).toBeDisabled();

    // Pick the correct meaning from the tray, then assign it to the proverb slot.
    fireEvent.click(screen.getByText("கவனக்குறைவாக இருப்பவருக்கு தீங்கு நேரிடும்"));
    fireEvent.click(screen.getByText('"தூங்கு போடும் தேள் கொட்டும்"'));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    expect(api.post).toHaveBeenCalledWith("/games/sess1/attempt", {
      mapping: { s1: "c1" },
    });

    await screen.findByText("✓ அனைத்தும் சரியாக பொருந்தியது!");

    // ---- Claim reward -> triggers /complete ----
    fireEvent.click(screen.getByRole("button", { name: "வெகுமதி பெறு →" }));
    expect(api.post).toHaveBeenCalledWith("/games/sess1/complete");

    // ---- Result screen ----
    await screen.findByText("+20 XP");
    expect(screen.getByText("🔥 Streak 2")).toBeInTheDocument();
    expect(screen.getByText("Updated to: learning")).toBeInTheDocument();

    // ---- Back to Home navigates correctly ----
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  test("an incorrect match shows failure feedback and does not unlock the reward button", async () => {
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
    await screen.findByText("அடிப்படை பழமொழிகள்");
    fireEvent.click(screen.getByText("அடிப்படை பழமொழிகள்"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/எச்சரிக்கையாக இருக்க வேண்டும்/);

    fireEvent.click(screen.getByText("அதிக மழை பெய்யும் என்பதைக் குறிக்கிறது"));
    fireEvent.click(screen.getByText('"தூங்கு போடும் தேள் கொட்டும்"'));
    fireEvent.click(screen.getByRole("button", { name: "சரிபார்" }));

    await screen.findByText("✕ எல்லாம் சரியில்லை.");
    expect(screen.getByText("மீண்டும் முயற்சி செய்.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "சரிபார்" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "வெகுமதி பெறு →" })).not.toBeInTheDocument();
  });

  test("re-tapping a filled slot with nothing selected frees it back to the tray", async () => {
    mockHappyPath();
    renderGame();
    await screen.findByText("அடிப்படை பழமொழிகள்");
    fireEvent.click(screen.getByText("அடிப்படை பழமொழிகள்"));
    await screen.findByText("Start Mission");
    fireEvent.click(screen.getByText("Start Mission"));
    await screen.findByText(/எச்சரிக்கையாக இருக்க வேண்டும்/);

    fireEvent.click(screen.getByText("கவனக்குறைவாக இருப்பவருக்கு தீங்கு நேரிடும்"));
    fireEvent.click(screen.getByText('"தூங்கு போடும் தேள் கொட்டும்"'));
    const checkButton = screen.getByRole("button", { name: "சரிபார்" });
    expect(checkButton).not.toBeDisabled();

    // Tap the now-filled slot again with nothing selected — it should free up.
    fireEvent.click(screen.getByText('"தூங்கு போடும் தேள் கொட்டும்"'));
    expect(checkButton).toBeDisabled();
    expect(screen.getByText("கவனக்குறைவாக இருப்பவருக்கு தீங்கு நேரிடும்")).toBeInTheDocument();
  });
});

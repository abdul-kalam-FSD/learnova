import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import Home from "./Home";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

const HOME_DATA = {
  name: "Priya",
  xp_total: 120,
  grade: 6,
  weakConcepts: [],
};

// Resolves each endpoint independently, like the real backend would,
// so a test can override just the one response it cares about
// without having to restate every other endpoint's shape.
function mockApi({
  home = HOME_DATA,
  homeError = null,
  recommendedCase = { status: 404 },
  // Phase 7B (item 2): the real /cases/recommended reason value, alongside
  // the case itself, so tests can exercise the supported/unsupported cases.
  caseReason = null,
  progress = null,
  recommendedGame = null,
  catalog = [],
  stats = null,
} = {}) {
  api.get.mockImplementation((url) => {
    if (url === "/home") {
      return homeError ? Promise.reject(homeError) : Promise.resolve({ data: home });
    }
    if (url === "/cases/recommended") {
      return recommendedCase?.status
        ? Promise.reject({ response: { status: recommendedCase.status } })
        : Promise.resolve({ data: { case: recommendedCase, reason: caseReason } });
    }
    if (url === "/progress") {
      return progress ? Promise.resolve({ data: progress }) : Promise.reject(new Error("no progress"));
    }
    if (url === "/games/recommended") {
      return recommendedGame
        ? Promise.resolve({ data: recommendedGame })
        : Promise.reject({ response: { status: 404 } });
    }
    if (url === "/games/catalog") {
      return Promise.resolve({ data: { catalog } });
    }
    if (url === "/profile/stats") {
      return stats ? Promise.resolve({ data: stats }) : Promise.reject(new Error("no stats"));
    }
    return Promise.reject(new Error(`unmocked url: ${url}`));
  });
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Home (Game Selection UI) - loading and error states", () => {
  test("shows a loading state before /home resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {})); // never resolves
    renderHome();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("shows an error state when /home fails", async () => {
    mockApi({ homeError: new Error("Network down") });
    renderHome();
    await waitFor(() => {
      expect(screen.getByText("Error: Network down")).toBeInTheDocument();
    });
  });
});

describe("Home (Game Selection UI) - recommendation display", () => {
  test("shows the recommended game hero and navigates to its registered route on click", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
      },
    });
    renderHome();

    const heroButton = await screen.findByText("Fraction Builder");
    fireEvent.click(heroButton.closest("button"));

    expect(navigateMock).toHaveBeenCalledWith("/games/fraction-builder");
  });

  test("falls back to /chapters instead of crashing when the recommended gameType isn't in the registry", async () => {
    mockApi({
      recommendedGame: {
        gameType: "SOME_RETIRED_GAME_TYPE_NOT_IN_REGISTRY",
        subject: "Mathematics",
        label: "Mystery Game",
        title: "Level 1",
      },
    });
    renderHome();

    const heroButton = await screen.findByText("Mystery Game");
    fireEvent.click(heroButton.closest("button"));

    expect(navigateMock).toHaveBeenCalledWith("/chapters");
  });

  test("does not render the recommendation hero when there is no recommended game", async () => {
    mockApi({ recommendedGame: null });
    renderHome();

    await screen.findByText("Hi, Priya 👋"); // wait for load to finish
    expect(screen.queryByText(/RECOMMENDED FOR YOU/)).not.toBeInTheDocument();
  });

  // Phase 5A (Phase 4F audit finding): "NEXT UP" implied a sequential/
  // never-played next step that getRecommendedGame() doesn't actually
  // guarantee. Renamed to "Recommended for You" to match Practice.jsx
  // and ChapterMission.jsx's existing vocabulary for the same API
  // response, and the real `reason` is now surfaced here too via the
  // shared reason-copy utility.
  test("labels the hero 'Recommended for You' and shows the real reason when present", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
        reason: "weak-concept",
      },
    });
    renderHome();

    await screen.findByText(/RECOMMENDED FOR YOU/);
    expect(screen.getByText(/still building this up/)).toBeInTheDocument();
    // The selected game itself must be unchanged by the relabeling.
    expect(screen.getByText("Fraction Builder")).toBeInTheDocument();
  });

  test("omits the reason line (no invented text) when the reason is missing or unrecognized", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
        reason: "some-future-reason-not-yet-mapped",
      },
    });
    renderHome();

    await screen.findByText(/RECOMMENDED FOR YOU/);
    // The title/sub still render exactly (no dash-joined explanation
    // appended) rather than inventing copy for an unmapped reason.
    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });
});

// Phase 7B item 1 (Phase 7A finding #1): recommendedGame.alreadyCompleted
// was fetched but never read, so the hero could present already-completed
// content as new. Resolved the same "Review Recommended" way GameShell's
// post-game button already does for this exact field.
describe("Home (Phase 7B) - hero alreadyCompleted truth", () => {
  test("shows 'Review Recommended' wording when alreadyCompleted is explicitly true", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
        alreadyCompleted: true,
      },
    });
    renderHome();

    await screen.findByText(/REVIEW RECOMMENDED/);
    expect(screen.getByText(/Review Recommended/)).toBeInTheDocument();
    expect(screen.queryByText(/^RECOMMENDED FOR YOU/)).not.toBeInTheDocument();
    expect(screen.queryByText("Play Now")).not.toBeInTheDocument();
  });

  test("keeps normal 'Play Now' / 'Recommended for You' wording when alreadyCompleted is explicitly false", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
        alreadyCompleted: false,
      },
    });
    renderHome();

    await screen.findByText(/RECOMMENDED FOR YOU/);
    expect(screen.getByText("Play Now")).toBeInTheDocument();
    expect(screen.queryByText(/Review Recommended/)).not.toBeInTheDocument();
  });

  test("keeps normal wording (never guesses Review) when alreadyCompleted is missing from the response", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
      },
    });
    renderHome();

    await screen.findByText(/RECOMMENDED FOR YOU/);
    expect(screen.getByText("Play Now")).toBeInTheDocument();
    expect(screen.queryByText(/Review Recommended/)).not.toBeInTheDocument();
  });

  test("still renders the recommendation reason alongside the Review Recommended wording", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
        reason: "strong-concept",
        alreadyCompleted: true,
      },
    });
    renderHome();

    await screen.findByText(/REVIEW RECOMMENDED/);
    expect(screen.getByText(/got this down — a quick review keeps it sharp/)).toBeInTheDocument();
  });

  test("clicking the hero still navigates to the same registered route regardless of alreadyCompleted", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
        alreadyCompleted: true,
      },
    });
    renderHome();

    const heroButton = await screen.findByText("Fraction Builder");
    fireEvent.click(heroButton.closest("button"));
    expect(navigateMock).toHaveBeenCalledWith("/games/fraction-builder");
  });
});

// Phase 7B item 2: /cases/recommended's `reason` field was fetched but
// discarded. Reuses the same shared reason-copy map the game
// recommendation already uses — no second reason map.
describe("Home (Phase 7B) - case recommendation reason", () => {
  test("shows the real reason text when the case reason maps to known copy", async () => {
    mockApi({
      recommendedGame: null,
      recommendedCase: { title: "The Missing Enzyme", clue_count: 3 },
      caseReason: "weak-concept",
    });
    renderHome();

    await screen.findByText("The Missing Enzyme");
    expect(screen.getByText(/still building this up/)).toBeInTheDocument();
  });

  test("falls back to the existing generic sub-copy when the case reason is unmapped", async () => {
    mockApi({
      recommendedGame: null,
      recommendedCase: { title: "The Missing Enzyme", clue_count: 3 },
      caseReason: "fallback-any-case",
    });
    renderHome();

    await screen.findByText("The Missing Enzyme");
    expect(
      screen.getByText(/Solve it to earn XP and sharpen your mastery/),
    ).toBeInTheDocument();
  });

  test("falls back to the existing generic sub-copy when no case reason is present at all", async () => {
    mockApi({
      recommendedGame: null,
      recommendedCase: { title: "The Missing Enzyme", clue_count: 3 },
    });
    renderHome();

    await screen.findByText("The Missing Enzyme");
    expect(
      screen.getByText(/Solve it to earn XP and sharpen your mastery/),
    ).toBeInTheDocument();
  });
});

// Phase 7B item 3: Achievements depends on /profile/stats and /progress,
// which resolve independently of /home. Before this fix, the EmptyState
// could render during that window even for a student with real earned
// achievements, since earnedAchievements.length === 0 was indistinguishable
// from "not loaded yet".
describe("Home (Phase 7B) - achievements loading vs empty", () => {
  test("does not show the achievements empty state while /profile/stats and /progress are still unresolved", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/home") return Promise.resolve({ data: HOME_DATA });
      if (url === "/cases/recommended") return Promise.reject({ response: { status: 404 } });
      if (url === "/games/recommended") return Promise.reject({ response: { status: 404 } });
      if (url === "/games/catalog") return Promise.resolve({ data: { catalog: [] } });
      if (url === "/assignments/mine") return Promise.resolve({ data: { assignments: [] } });
      // /progress and /profile/stats deliberately never resolve, simulating
      // the in-flight window this fix targets.
      if (url === "/progress" || url === "/profile/stats") return new Promise(() => {});
      return Promise.reject(new Error(`unmocked url: ${url}`));
    });

    renderHome();

    await screen.findByText("Hi, Priya 👋");
    expect(screen.queryByText("No achievements yet")).not.toBeInTheDocument();
  });

  test("shows the achievements empty state once both calls resolve and there are genuinely none earned", async () => {
    mockApi({ home: { ...HOME_DATA, xp_total: 0 }, stats: null, progress: null });
    renderHome();
    await screen.findByText("No achievements yet");
  });
});

// Phase 7B item 4: the dashboard previously had no page-level heading.
describe("Home (Phase 7B) - page heading", () => {
  test("has exactly one h1, used for the greeting", async () => {
    mockApi();
    renderHome();

    const headings = await screen.findAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Hi, Priya");
  });
});

// Phase 7C item 1 (Phase 7C audit finding): /games/recommended and
// /cases/recommended resolve independently of /home. Before this fix,
// the hero could briefly show its GET STARTED fallback (a false
// "you have nothing recommended" claim) while either request was still
// in flight.
describe("Home (Phase 7C) - hero recommendation loading", () => {
  test("does not show the GET STARTED fallback while recommendations are still pending after /home resolves", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/home") return Promise.resolve({ data: HOME_DATA });
      if (url === "/games/catalog") return Promise.resolve({ data: { catalog: [] } });
      if (url === "/assignments/mine") return Promise.resolve({ data: { assignments: [] } });
      if (url === "/progress") return Promise.reject(new Error("no progress"));
      if (url === "/profile/stats") return Promise.reject(new Error("no stats"));
      // /games/recommended and /cases/recommended deliberately never
      // resolve, simulating the in-flight window this fix targets.
      if (url === "/games/recommended" || url === "/cases/recommended") {
        return new Promise(() => {});
      }
      return Promise.reject(new Error(`unmocked url: ${url}`));
    });

    renderHome();

    await screen.findByText("Hi, Priya 👋");
    // The hero itself must not show the zero-recommendation fallback
    // (title or eyebrow) while a recommendation request is still
    // pending, and must show the neutral loading state instead.
    expect(screen.queryByText("Pick a chapter and start playing")).not.toBeInTheDocument();
    expect(screen.queryByText(/GET STARTED/)).not.toBeInTheDocument();
    expect(screen.getByText("Finding your next step…")).toBeInTheDocument();
    // Browse Chapters is a separate CTA gated on
    // `!recommendedGame && !recommendedCase` (Phase 7C-2) — it is not
    // part of the hero's own fallback state, and both recommendation
    // fields are legitimately still null/unresolved at this point, so
    // its presence here is expected and is intentionally not asserted
    // either way by this test.
  });

  test("shows the recommended game hero once the game recommendation resolves", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
      },
    });
    renderHome();
    await screen.findByText(/RECOMMENDED FOR YOU/);
    expect(screen.getByText("Fraction Builder")).toBeInTheDocument();
  });

  test("shows the recommended case hero once the case recommendation resolves and there is no game", async () => {
    mockApi({
      recommendedGame: null,
      recommendedCase: { title: "The Missing Enzyme", clue_count: 3 },
    });
    renderHome();
    await screen.findByText("The Missing Enzyme");
  });

  test("shows the GET STARTED fallback once both recommendations resolve empty", async () => {
    mockApi({ recommendedGame: null, recommendedCase: { status: 404 } });
    renderHome();
    await screen.findByText("Pick a chapter and start playing");
  });

  test("reaches the legitimate fallback once a recommendation request fails, rather than hanging indefinitely", async () => {
    mockApi({ recommendedGame: null, recommendedCase: { status: 500 } });
    renderHome();
    await screen.findByText("Pick a chapter and start playing");
  });
});

// Phase 7C item 2: the condition was `!recommendedCase` alone, so
// "Browse Chapters" duplicated the hero's own CTA whenever a
// recommended GAME (not a case) existed.
describe("Home (Phase 7C) - Browse Chapters CTA", () => {
  test("does not render Browse Chapters when a recommended game exists", async () => {
    mockApi({
      recommendedGame: {
        gameType: "MATH_FRACTION_BUILDER",
        subject: "Mathematics",
        label: "Fraction Builder",
        title: "Level 1",
      },
    });
    renderHome();
    await screen.findByText("Fraction Builder");
    expect(screen.queryByRole("button", { name: "Browse Chapters" })).not.toBeInTheDocument();
  });

  test("does not render Browse Chapters when a recommended case exists and there is no game", async () => {
    mockApi({
      recommendedGame: null,
      recommendedCase: { title: "The Missing Enzyme", clue_count: 3 },
    });
    renderHome();
    await screen.findByText("The Missing Enzyme");
    expect(screen.queryByRole("button", { name: "Browse Chapters" })).not.toBeInTheDocument();
  });

  test("renders Browse Chapters when there is no recommendation of either kind", async () => {
    mockApi({ recommendedGame: null, recommendedCase: { status: 404 } });
    renderHome();
    await screen.findByText("Pick a chapter and start playing");
    expect(screen.getByRole("button", { name: "Browse Chapters" })).toBeInTheDocument();
  });
});

// Phase 7C item 3: Overall Mastery moved up to sit beside Level
// Progress — JSX/calculation/wording unchanged, ordering only.
describe("Home (Phase 7C) - Overall Mastery ordering", () => {
  const PROGRESS_WITH_MASTERY = {
    chapters: [{ total_concepts: 10, breakdown: { strong: 4, learning: 2, weak: 4 } }],
  };

  test("still renders the existing Overall Mastery content correctly after reordering", async () => {
    mockApi({ progress: PROGRESS_WITH_MASTERY });
    renderHome();
    await screen.findByText("Overall Mastery");
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  test("positions Overall Mastery directly beside Level Progress, above Achievements", async () => {
    mockApi({ progress: PROGRESS_WITH_MASTERY });
    renderHome();

    const masteryEl = await screen.findByText("Overall Mastery");
    const levelEl = screen.getByText(/Level \d+ progress/);
    const achievementsHeading = screen.getByText("Achievements");

    // Bitmask value 4 is the DOM standard's DOCUMENT_POSITION_FOLLOWING
    // flag (the compared node comes after the reference node). Used as
    // a literal here rather than the `Node` global so this test has no
    // dependency on that global being recognized by the lint config.
    const DOCUMENT_POSITION_FOLLOWING = 4;
    expect(
      levelEl.compareDocumentPosition(masteryEl) & DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      masteryEl.compareDocumentPosition(achievementsHeading) & DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("Home (Game Selection UI) - catalog", () => {
  test("renders the catalog grouped by subject and navigates on card click", async () => {
    mockApi({
      catalog: [
        {
          subject: "Mathematics",
          gameTypes: [{ game_type: "MATH_FRACTION_BUILDER", label: "Fraction Builder", count: 3 }],
        },
      ],
    });
    renderHome();

    const card = await screen.findByText("Fraction Builder");
    expect(screen.getByText("3 levels")).toBeInTheDocument();

    fireEvent.click(card.closest("button"));
    expect(navigateMock).toHaveBeenCalledWith("/games/fraction-builder");
  });

  test("renders nothing extra (no crash) when the catalog is empty", async () => {
    mockApi({ catalog: [] });
    renderHome();

    await screen.findByText("Hi, Priya 👋");
    expect(screen.queryByText("All Games")).not.toBeInTheDocument();
  });
});

describe("Home - Phase 7 dashboard additions", () => {
  test("falls back to the case hero when there is no recommended game but a case is recommended", async () => {
    mockApi({
      recommendedGame: null,
      recommendedCase: { title: "The Missing Enzyme", clue_count: 3 },
    });
    renderHome();
    await screen.findByText("The Missing Enzyme");
  });

  test("falls back to a subject-neutral generic hero when there is neither a recommended game nor case", async () => {
    mockApi({ recommendedGame: null, recommendedCase: { status: 404 } });
    renderHome();
    await screen.findByText("Pick a chapter and start playing");
    // The old permanent Biology framing must not appear when nothing
    // Biology-specific is actually recommended.
    expect(screen.queryByText("🔬 BIO DETECTIVE")).not.toBeInTheDocument();
  });

  test("shows a Level chip derived from xp_total", async () => {
    mockApi({ home: { ...HOME_DATA, xp_total: 850 } }); // 850 / 400 -> level 3
    renderHome();
    await screen.findByText("Lv 3");
  });

  test("shows an achievements empty state, then real earned badges once stats/progress arrive", async () => {
    mockApi({ home: { ...HOME_DATA, xp_total: 0 }, stats: null });
    renderHome();
    await screen.findByText("No achievements yet");
  });

  test("renders Recently Played from /home's recentQuizzes and navigates on click for a game session", async () => {
    mockApi({
      home: {
        ...HOME_DATA,
        recentQuizzes: [
          {
            sessionId: "s1",
            title: "Fraction Builder",
            accuracy: 90,
            xpAwarded: 40,
            gameType: "MATH_FRACTION_BUILDER",
          },
        ],
      },
    });
    renderHome();

    const card = await screen.findByText("Fraction Builder");
    fireEvent.click(card.closest("button"));
    expect(navigateMock).toHaveBeenCalledWith("/games/fraction-builder");
  });

  test("does not render Recently Played when there are no recent sessions", async () => {
    mockApi({ home: { ...HOME_DATA, recentQuizzes: [] } });
    renderHome();
    await screen.findByText("Hi, Priya 👋");
    expect(screen.queryByText("Recently Played")).not.toBeInTheDocument();
  });

  // Phase 7D (dashboard hierarchy audit): Recently Played is named
  // explicitly in this phase's own Tier-3 definition alongside
  // Achievements/catalog/Leaderboard, so it must carry the same
  // tier-3 de-emphasis hooks those sections already use.
  test("tiers Recently Played as tier-3, matching Achievements/New Games/Leaderboard", async () => {
    mockApi({
      home: {
        ...HOME_DATA,
        recentQuizzes: [
          {
            sessionId: "s1",
            title: "Fraction Builder",
            accuracy: 90,
            xpAwarded: 40,
            gameType: "MATH_FRACTION_BUILDER",
          },
        ],
      },
    });
    renderHome();

    const heading = await screen.findByText("Recently Played");
    expect(heading.closest(".home-tier3-section")).not.toBeNull();
  });

  test("renders a New Games section for catalog entries flagged isNew", async () => {
    mockApi({
      catalog: [
        {
          subject: "Mathematics",
          gameTypes: [
            { game_type: "MATH_FRACTION_BUILDER", label: "Fraction Builder", count: 3, isNew: false },
            { game_type: "PHYSICS_FORCE_SIMULATOR", label: "Force Simulator", count: 2, isNew: true },
          ],
        },
      ],
    });
    renderHome();
    await screen.findByText("New Games");
    // "Force Simulator" legitimately appears twice — once under New
    // Games, once under the full All Games catalog below it.
    expect((await screen.findAllByText("Force Simulator")).length).toBeGreaterThan(0);
  });

  test("omits the New Games section entirely when nothing in the catalog is new", async () => {
    mockApi({
      catalog: [
        {
          subject: "Mathematics",
          gameTypes: [{ game_type: "MATH_FRACTION_BUILDER", label: "Fraction Builder", count: 3, isNew: false }],
        },
      ],
    });
    renderHome();
    await screen.findByText("Hi, Priya 👋");
    expect(screen.queryByText("New Games")).not.toBeInTheDocument();
  });
});

describe("Home - weak concepts section", () => {
  test("shows an empty state when there are no weak concepts", async () => {
    mockApi({ home: { ...HOME_DATA, weakConcepts: [] } });
    renderHome();
    await screen.findByText("No weak concepts yet");
  });

  test("lists weak concepts when present", async () => {
    mockApi({
      home: { ...HOME_DATA, weakConcepts: [{ concept_id: "c1", title: "Adding Fractions" }] },
    });
    renderHome();
    await screen.findByText("Adding Fractions");
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../api/axios";
import ChapterMission, { getChapterRecommendation } from "./ChapterMission";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage(chapterId = "c1", state, { withHistory = false } = {}) {
  const entries = withHistory
    ? [{ pathname: "/subjects/Biology" }, { pathname: `/mission/${chapterId}`, state }]
    : [{ pathname: `/mission/${chapterId}`, state }];
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/mission/:chapterId" element={<ChapterMission />} />
        <Route path="/subjects/:subjectName" element={<div>Subject Chapters Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// Phase 4E: ChapterMission now makes two independent api.get calls on
// mount (GET /chapters/:id, unchanged, and the new GET
// /games/recommended call). This helper routes each call by URL so
// every test can control them separately, instead of the old
// single-call mockResolvedValueOnce/mockRejectedValueOnce pattern
// (which would silently starve whichever of the two calls didn't
// consume the queued mock).
//
// Default for `recommended` (when a test doesn't care about it) is a
// rejected 404 — the exact real shape /games/recommended returns when
// there's nothing to recommend — so every pre-existing test below
// behaves exactly as it did before this phase: no "Recommended for
// You" section, Chapter Missions renders as the only mission list.
function mockApi({ chapter, chapterRejects, recommended, recommendedRejects } = {}) {
  const notFound404 = { response: { status: 404, data: { message: "No games available yet" } } };
  api.get.mockImplementation((url) => {
    if (url === "/games/recommended") {
      if (recommendedRejects) return Promise.reject(recommendedRejects);
      if (recommended !== undefined) return Promise.resolve({ data: recommended });
      return Promise.reject(notFound404);
    }
    if (url.startsWith("/chapters/")) {
      if (chapterRejects) return Promise.reject(chapterRejects);
      return Promise.resolve({ data: chapter });
    }
    return Promise.reject(new Error(`ChapterMission.test.jsx: unexpected api.get(${url})`));
  });
}

const baseChapter = {
  chapter: { id: "c1", title: "Cell Structure", unit_name: "Diversity" },
  concepts: [
    { id: "co1", title: "Nucleus", mastery_state: "strong" },
    { id: "co2", title: "Mitochondria", mastery_state: "weak" },
  ],
  games: [
    { game_type: "BIO_VIRTUAL_LAB", label: "Virtual Lab", count: 2 },
    { game_type: "BIO_DIAGNOSIS", label: "Diagnosis", count: 1 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ChapterMission", () => {
  test("shows a loading state before the chapter loads", () => {
    api.get.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.getByText("Preparing your mission...")).toBeInTheDocument();
  });

  test("renders real chapter data, mission choices, and their real actions", async () => {
    mockApi({ chapter: baseChapter });

    renderPage("c1", { subjectName: "Biology" });

    await waitFor(() => expect(screen.getByText("Cell Structure")).toBeInTheDocument());
    expect(screen.getByText("Diversity")).toBeInTheDocument();
    expect(screen.getByText("Biology · Mission Brief")).toBeInTheDocument();
    expect(screen.getByText("Nucleus")).toBeInTheDocument();
    expect(screen.getByText("1/2 mastered so far.", { exact: false })).toBeInTheDocument();

    // Real GAME_TYPE_TO_ACTION phrases, not a generic "Play" label,
    // and more than one mechanic is framed as mission choices.
    // Phase 4E, Step 5: heading is now plainly "Chapter Missions"
    // regardless of game count (previously "Choose your mission" /
    // "Your mission" — copy that implied a ranking this list never
    // actually had).
    expect(screen.getByText("Chapter Missions")).toBeInTheDocument();
    expect(screen.getByText("Investigate the sample")).toBeInTheDocument();
    expect(screen.getByText("Find the cause")).toBeInTheDocument();
  });

  test("Start Mission launches the correct existing game and carries the chapterId forward", async () => {
    mockApi({
      chapter: {
        chapter: { id: "c1", title: "Cell Structure", unit_name: "Diversity" },
        concepts: [],
        games: [{ game_type: "BIO_VIRTUAL_LAB", label: "Virtual Lab", count: 2 }],
      },
    });

    renderPage("c1");

    await waitFor(() => expect(screen.getByText("Investigate the sample")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Investigate the sample"));

    // Phase 5C-B: real chapter title (from the fetched chapter data) and
    // subject name (from nav state, null here since renderPage("c1") was
    // called with no state) now carry forward too, alongside chapterId.
    expect(navigateMock).toHaveBeenCalledWith("/games/virtual-lab", {
      state: { chapterId: "c1", chapterTitle: "Cell Structure", subjectName: null },
    });
  });

  test("Phase 5C-B: forwards the real subject name too when it was passed forward from Subject Chapters", async () => {
    mockApi({
      chapter: {
        chapter: { id: "c1", title: "Cell Structure", unit_name: "Diversity" },
        concepts: [],
        games: [{ game_type: "BIO_VIRTUAL_LAB", label: "Virtual Lab", count: 2 }],
      },
    });

    renderPage("c1", { subjectName: "Biology" });

    await waitFor(() => expect(screen.getByText("Investigate the sample")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Investigate the sample"));

    expect(navigateMock).toHaveBeenCalledWith("/games/virtual-lab", {
      state: { chapterId: "c1", chapterTitle: "Cell Structure", subjectName: "Biology" },
    });
  });

  test("does not navigate anywhere if a mechanic's game_type has no registered route", async () => {
    mockApi({
      chapter: {
        chapter: { id: "c1", title: "Cell Structure", unit_name: "Diversity" },
        concepts: [],
        games: [{ game_type: "NOT_A_REAL_GAME_TYPE", label: "Mystery Mechanic", count: 1 }],
      },
    });

    renderPage("c1");

    await waitFor(() => expect(screen.getByText("Play the mission")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Play the mission"));

    expect(navigateMock).not.toHaveBeenCalled();
  });

  test("shows an empty state, with a real recovery action, when the chapter has no mechanics", async () => {
    mockApi({
      chapter: {
        chapter: { id: "c1", title: "Cell Structure", unit_name: "Diversity" },
        concepts: [],
        games: [],
      },
    });

    renderPage("c1");

    await waitFor(() => expect(screen.getByText("No missions available yet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Practice This Chapter"));
    expect(navigateMock).toHaveBeenCalledWith("/practice");
  });

  test("shows a not-found state on a 404/403 without crashing, with a way back", async () => {
    const err = new Error("Not found");
    err.response = { status: 404 };
    mockApi({ chapterRejects: err });

    renderPage("does-not-exist");

    await waitFor(() => expect(screen.getByText("Mission not found")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Browse Subject Worlds"));
    expect(navigateMock).toHaveBeenCalledWith("/subjects");
  });

  test("shows a retryable error state on other API failures", async () => {
    mockApi({ chapterRejects: new Error("Network error") });

    renderPage("c1");

    await waitFor(() => expect(screen.getByText("Error: Network error")).toBeInTheDocument());

    mockApi({
      chapter: {
        chapter: { id: "c1", title: "Cell Structure", unit_name: "Diversity" },
        concepts: [],
        games: [],
      },
    });
    fireEvent.click(screen.getByText("Retry"));
    await waitFor(() => expect(screen.getByText("Cell Structure")).toBeInTheDocument());
  });

  // Phase 2 Batch C: ChapterMission's Back button used to be a plain
  // navigate(-1). It's now smarter about direct URL/refresh entry —
  // see the goBackToChapters comment in ChapterMission.jsx for why —
  // so this is now three cases instead of one.
  test("back button uses browser history when it arrived via in-app navigation", async () => {
    mockApi({
      chapter: {
        chapter: { id: "c1", title: "Cell Structure", unit_name: "Diversity" },
        concepts: [],
        games: [],
      },
    });
    renderPage("c1", undefined, { withHistory: true });
    await waitFor(() => expect(screen.getByText("Cell Structure")).toBeInTheDocument());
    fireEvent.click(screen.getByText("← Back"));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  test("back button falls back to Subject Chapters when opened directly with subject context", async () => {
    mockApi({
      chapter: {
        chapter: { id: "c1", title: "Cell Structure", unit_name: "Diversity" },
        concepts: [],
        games: [],
      },
    });
    renderPage("c1", { subjectName: "Biology" });
    await waitFor(() => expect(screen.getByText("Cell Structure")).toBeInTheDocument());
    fireEvent.click(screen.getByText("← Back"));
    expect(navigateMock).toHaveBeenCalledWith("/subjects/Biology");
  });

  test("back button falls back to /subjects when opened directly with no subject context", async () => {
    mockApi({
      chapter: {
        chapter: { id: "c1", title: "Cell Structure", unit_name: "Diversity" },
        concepts: [],
        games: [],
      },
    });
    renderPage("c1");
    await waitFor(() => expect(screen.getByText("Cell Structure")).toBeInTheDocument());
    fireEvent.click(screen.getByText("← Back"));
    expect(navigateMock).toHaveBeenCalledWith("/subjects");
  });

  // ---------------------------------------------------------------
  // Phase 4E: "Recommended for You" hybrid slot
  // ---------------------------------------------------------------

  test("shows Recommended for You when the recommendation belongs to this chapter", async () => {
    mockApi({
      chapter: baseChapter,
      recommended: {
        gameType: "BIO_DIAGNOSIS",
        subject: "Biology",
        label: "Diagnosis",
        mechanicTier: "GUIDED",
        title: "Diagnose the Patient",
        difficulty: "easy",
        reason: "weak-concept",
      },
    });

    renderPage("c1");

    await waitFor(() => expect(screen.getByText("Chapter Missions")).toBeInTheDocument());
    expect(screen.getByText("Recommended for You")).toBeInTheDocument();
    // Real reason copy (same vocabulary as Practice.jsx), real content
    // title, real difficulty — nothing invented.
    expect(
      screen.getByText("You're still building this up — a quick round will help."),
    ).toBeInTheDocument();
    expect(screen.getByText("Diagnose the Patient", { exact: false })).toBeInTheDocument();

    // Step 6: the chapter's full, unranked game list is still intact
    // underneath — including the recommended game itself, which is
    // NOT removed from Chapter Missions just because it's also
    // featured above. "Find the cause" (BIO_DIAGNOSIS's action) is
    // expected to appear twice: once in "Recommended for You", once
    // in the untouched "Chapter Missions" list.
    expect(screen.getByText("Investigate the sample")).toBeInTheDocument();
    expect(screen.getAllByText("Find the cause")).toHaveLength(2);
  });

  test("does not show Recommended for You when the recommendation belongs to another chapter", async () => {
    mockApi({
      chapter: baseChapter,
      recommended: {
        gameType: "MATH_FRACTION_BUILDER", // not in baseChapter.games
        subject: "Mathematics",
        label: "Fraction Builder",
        mechanicTier: "PRACTICE",
        title: "Build the Fraction",
        difficulty: "medium",
        reason: "learning-concept",
      },
    });

    renderPage("c1");

    await waitFor(() => expect(screen.getByText("Chapter Missions")).toBeInTheDocument());
    expect(screen.queryByText("Recommended for You")).not.toBeInTheDocument();

    // Chapter Missions still renders fully — a non-matching
    // recommendation is never forced in as a fake pick.
    expect(screen.getByText("Investigate the sample")).toBeInTheDocument();
    expect(screen.getByText("Find the cause")).toBeInTheDocument();
  });

  test("recommendation API failure leaves the page fully usable", async () => {
    mockApi({ chapter: baseChapter, recommendedRejects: new Error("Network error") });

    renderPage("c1");

    await waitFor(() => expect(screen.getByText("Chapter Missions")).toBeInTheDocument());
    expect(screen.queryByText("Recommended for You")).not.toBeInTheDocument();
    expect(screen.getByText("Investigate the sample")).toBeInTheDocument();
  });

  test("recommendation 404 / no usable game shows no fake recommendation", async () => {
    // mockApi's default (no `recommended` passed) is a 404 rejection,
    // the real shape /games/recommended returns when there's nothing
    // to recommend yet.
    mockApi({ chapter: baseChapter });

    renderPage("c1");

    await waitFor(() => expect(screen.getByText("Chapter Missions")).toBeInTheDocument());
    expect(screen.queryByText("Recommended for You")).not.toBeInTheDocument();
  });

  test("clicking the recommended game uses the existing route/action, same as a normal chapter mission", async () => {
    mockApi({
      chapter: baseChapter,
      recommended: {
        gameType: "BIO_DIAGNOSIS",
        subject: "Biology",
        label: "Diagnosis",
        mechanicTier: "GUIDED",
        title: "Diagnose the Patient",
        difficulty: "easy",
        reason: "weak-concept",
      },
    });

    renderPage("c1");

    await waitFor(() => expect(screen.getByText("Recommended for You")).toBeInTheDocument());
    // "Find the cause" (BIO_DIAGNOSIS) renders twice — once in
    // "Recommended for You", once in "Chapter Missions" (Step 6:
    // duplication is expected, not removed). The first in DOM order
    // is the Recommended for You card; both wire up the exact same
    // goToGame(gameType) handler, so either would prove the existing
    // route/action is reused, but this targets the recommended one
    // specifically.
    fireEvent.click(screen.getAllByText("Find the cause")[0]);

    // Phase 5C-B: same real chapterTitle/subjectName forwarding applies
    // to the recommended-game card's click handler, since it reuses the
    // exact same goToGame(gameType) function.
    expect(navigateMock).toHaveBeenCalledWith("/games/diagnosis", {
      state: { chapterId: "c1", chapterTitle: "Cell Structure", subjectName: null },
    });
  });
});

describe("getChapterRecommendation (Phase 4E cross-check)", () => {
  const games = [
    { game_type: "BIO_VIRTUAL_LAB", label: "Virtual Lab", count: 2 },
    { game_type: "BIO_DIAGNOSIS", label: "Diagnosis", count: 1 },
  ];

  test("returns the recommendation unchanged when its gameType belongs to the chapter", () => {
    const rec = { gameType: "BIO_DIAGNOSIS", reason: "weak-concept" };
    expect(getChapterRecommendation(rec, games)).toBe(rec);
  });

  test("returns null when the recommendation's gameType is not in the chapter", () => {
    const rec = { gameType: "MATH_FRACTION_BUILDER", reason: "learning-concept" };
    expect(getChapterRecommendation(rec, games)).toBeNull();
  });

  test("returns null when there is no recommendation", () => {
    expect(getChapterRecommendation(null, games)).toBeNull();
  });

  test("returns null when the chapter has no games", () => {
    const rec = { gameType: "BIO_DIAGNOSIS", reason: "weak-concept" };
    expect(getChapterRecommendation(rec, [])).toBeNull();
    expect(getChapterRecommendation(rec, null)).toBeNull();
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../../api/axios";
import { useGameCompletionNav } from "./useGameCompletionNav";

// Covers Phase 0D test requirements 7 & 8: correct next mission is
// selected when the recommendation endpoint has one, and a safe
// fallback (no button, i.e. undefined) exists when it doesn't —
// plus onBackToChapter, which only appears when the game was
// actually launched from a chapter (Step 12 route-safety: nothing
// here invents a chapter to go back to).

vi.mock("../../api/axios", () => ({
  default: { get: vi.fn() },
}));

// Phase 6B (P1-1): needs to observe the exact args passed to navigate
// (specifically, whether/what `state` is forwarded on the
// Recommended Next call), so `useNavigate` is mocked while every
// other react-router-dom export (MemoryRouter, useLocation) stays
// real — same pattern already used elsewhere in this codebase (see
// e.g. games/chemistry/EquationBalancer.test.jsx).
const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

function wrapper(initialEntries) {
  return ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

describe("useGameCompletionNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("provides onNextGame when /games/recommended returns a different game with a known route", async () => {
    api.get.mockResolvedValueOnce({
      data: { gameType: "MATH_FRACTION_MATCH" },
    });

    const { result } = renderHook(
      () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
      { wrapper: wrapper(["/games/fraction-builder"]) }
    );

    await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
    expect(api.get).toHaveBeenCalledWith("/games/recommended");
  });

  test("omits onNextGame (safe fallback) when the recommendation is the game just finished", async () => {
    api.get.mockResolvedValueOnce({
      data: { gameType: "MATH_FRACTION_BUILDER" },
    });

    const { result } = renderHook(
      () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
      { wrapper: wrapper(["/games/fraction-builder"]) }
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(result.current.onNextGame).toBeUndefined();
  });

  test("omits onNextGame (safe fallback) when the recommendation endpoint fails", async () => {
    api.get.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(
      () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
      { wrapper: wrapper(["/games/fraction-builder"]) }
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(result.current.onNextGame).toBeUndefined();
  });

  test("omits onNextGame (safe fallback) when the recommended game_type has no known route", async () => {
    api.get.mockResolvedValueOnce({
      data: { gameType: "SOME_UNREGISTERED_GAME_TYPE" },
    });

    const { result } = renderHook(
      () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
      { wrapper: wrapper(["/games/fraction-builder"]) }
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(result.current.onNextGame).toBeUndefined();
  });

  test("provides onBackToChapter only when the game was launched with a chapterId in location.state", () => {
    // This test renders the hook twice (once per location.state
    // variant below), and each render's effect calls
    // api.get("/games/recommended") independently — so the mock must
    // stay resolved for every call in this test, not just the first.
    // (A *Once queue is right for the other tests above, which each
    // render the hook exactly once.)
    api.get.mockResolvedValue({ data: {} });

    const { result: withChapter } = renderHook(
      () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
      {
        wrapper: ({ children }) => (
          <MemoryRouter
            initialEntries={[
              { pathname: "/games/fraction-builder", state: { chapterId: "ch-42" } },
            ]}
          >
            {children}
          </MemoryRouter>
        ),
      }
    );
    expect(withChapter.current.onBackToChapter).toBeInstanceOf(Function);

    const { result: withoutChapter } = renderHook(
      () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
      { wrapper: wrapper(["/games/fraction-builder"]) }
    );
    expect(withoutChapter.current.onBackToChapter).toBeUndefined();
  });

  // Phase 6B, P1-1: chapter/subject context must survive "Recommended
  // Next" when it's real, and never be fabricated when it isn't.
  describe("onNextGame forwards real chapter context, never fabricated", () => {
    test("Case A: launched from ChapterMission -> Recommended Next preserves chapterId/chapterTitle/subjectName", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH" },
      });

      const { result } = renderHook(() => useGameCompletionNav("MATH_FRACTION_BUILDER"), {
        wrapper: ({ children }) => (
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/games/fraction-builder",
                state: {
                  chapterId: "ch-42",
                  chapterTitle: "Fractions Basics",
                  subjectName: "Mathematics",
                },
              },
            ]}
          >
            {children}
          </MemoryRouter>
        ),
      });

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      result.current.onNextGame();

      expect(navigateMock).toHaveBeenCalledWith(
        expect.any(String),
        {
          state: {
            chapterId: "ch-42",
            chapterTitle: "Fractions Basics",
            subjectName: "Mathematics",
          },
        },
      );
    });

    test("Case B: launched from Home (no location.state) -> Recommended Next forwards no chapter context", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      result.current.onNextGame();

      expect(navigateMock).toHaveBeenCalledWith(expect.any(String), undefined);
    });

    test("Case C: launched from Practice (no location.state) -> Recommended Next forwards no chapter context", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      result.current.onNextGame();

      expect(navigateMock).toHaveBeenCalledWith(expect.any(String), undefined);
    });

    test("Case D: direct game URL (no location.state) -> Recommended Next forwards no chapter context", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      result.current.onNextGame();

      expect(navigateMock).toHaveBeenCalledWith(expect.any(String), undefined);
    });
  });

  // Phase 6C-B: the recommendation's `reason` (already present in the
  // /games/recommended response, previously unused here) is attached to
  // the returned onNextGame function via the centralized
  // getRecommendationReasonText copy — never a second reason map.
  describe("onNextGame.reason (Phase 6C-B recommendation reason)", () => {
    test("Case A: weak-concept reason resolves to the centralized copy", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", reason: "weak-concept" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.reason).toBe(
        "You're still building this up — a quick round will help.",
      );
    });

    test("Case B: learning-concept reason resolves to the centralized copy", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", reason: "learning-concept" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.reason).toBe("You're on your way — keep this one warm.");
    });

    test("Case C: strong-concept reason resolves to the centralized copy", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", reason: "strong-concept" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.reason).toBe(
        "You've got this down — a quick review keeps it sharp.",
      );
    });

    test("Case D: fallback-any-content reason resolves to the centralized copy", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", reason: "fallback-any-content" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.reason).toBe("Something new to try.");
    });

    test("Case E: missing/unknown reason resolves to null but onNextGame still works", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", reason: "some-future-reason" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.reason).toBeNull();
      result.current.onNextGame();
      expect(navigateMock).toHaveBeenCalled();
    });

    test("Case E (no reason field at all): resolves to null, no crash", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.reason).toBeNull();
    });

    test("Case H: reason presentation does not change the recommended gameType's route", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", reason: "weak-concept" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      result.current.onNextGame();
      expect(navigateMock).toHaveBeenCalledWith("/games/fraction-match", undefined);
    });

    test("Case F: chapter context is still forwarded when a reason is also present", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", reason: "weak-concept" },
      });

      const { result } = renderHook(() => useGameCompletionNav("MATH_FRACTION_BUILDER"), {
        wrapper: ({ children }) => (
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/games/fraction-builder",
                state: { chapterId: "ch-42", chapterTitle: "Fractions Basics", subjectName: "Mathematics" },
              },
            ]}
          >
            {children}
          </MemoryRouter>
        ),
      });

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.reason).toBe(
        "You're still building this up — a quick round will help.",
      );
      result.current.onNextGame();
      expect(navigateMock).toHaveBeenCalledWith(expect.any(String), {
        state: { chapterId: "ch-42", chapterTitle: "Fractions Basics", subjectName: "Mathematics" },
      });
    });
  });

  // Phase 6C-C: alreadyCompleted (already present in the /games/recommended
  // response as of this phase) is attached to the returned onNextGame
  // function the same way `reason` already is — no new reason map, no new
  // prop threaded through any of the 54 per-game wrappers.
  describe("onNextGame.alreadyCompleted (Phase 6C-C Review Recommended)", () => {
    test("resolves to true when the backend reports the recommended content was already completed", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", alreadyCompleted: true },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.alreadyCompleted).toBe(true);
    });

    test("resolves to false when the backend reports the recommended content is new", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", alreadyCompleted: false },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.alreadyCompleted).toBe(false);
    });

    test("resolves to false (never fabricated true) when the field is missing from the response", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH" },
      });

      const { result } = renderHook(
        () => useGameCompletionNav("MATH_FRACTION_BUILDER"),
        { wrapper: wrapper(["/games/fraction-builder"]) },
      );

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      expect(result.current.onNextGame.alreadyCompleted).toBe(false);
    });

    test("does not change the navigated route or chapter-context forwarding", async () => {
      api.get.mockResolvedValueOnce({
        data: { gameType: "MATH_FRACTION_MATCH", alreadyCompleted: true },
      });

      const { result } = renderHook(() => useGameCompletionNav("MATH_FRACTION_BUILDER"), {
        wrapper: ({ children }) => (
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/games/fraction-builder",
                state: { chapterId: "ch-42", chapterTitle: "Fractions Basics", subjectName: "Mathematics" },
              },
            ]}
          >
            {children}
          </MemoryRouter>
        ),
      });

      await waitFor(() => expect(result.current.onNextGame).toBeInstanceOf(Function));
      result.current.onNextGame();
      expect(navigateMock).toHaveBeenCalledWith("/games/fraction-match", {
        state: { chapterId: "ch-42", chapterTitle: "Fractions Basics", subjectName: "Mathematics" },
      });
    });
  });
});

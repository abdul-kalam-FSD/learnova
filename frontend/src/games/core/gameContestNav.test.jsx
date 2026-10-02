import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useGameBackTarget } from "./useGameBackTarget";
import { useGameCompletionNav } from "./useGameCompletionNav";
import { GameResults } from "./GameShell";

vi.mock("../../api/axios", () => ({
  default: { get: vi.fn() },
}));

// Uses a REAL router (no mocked useNavigate) and reads where navigation
// actually lands, so this checks real behaviour, not just a call.
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

const CONTEST = { contest: { id: "c1", gameType: "MATH_FRACTION_BUILDER", title: "Blitz" } };

function Back() {
  const goBack = useGameBackTarget();
  return <button onClick={goBack}>back</button>;
}

function Results({ gameType = "MATH_FRACTION_BUILDER" }) {
  const { onBackToChapter, onNextGame } = useGameCompletionNav(gameType);
  return <GameResults completeLabel="Level Complete" onPlayAgain={() => {}} onDashboard={() => {}} onBackToChapter={onBackToChapter} onNextGame={onNextGame} />;
}

const at = (element, entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/games/*" element={element} />
        <Route path="*" element={null} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { gameType: "MATH_FRACTION_MATCH" } });
});

describe("useGameBackTarget with a contest", () => {
  test("Back returns to the contest page", () => {
    at(<Back />, { pathname: "/games/fraction-builder", state: CONTEST });
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where")).toHaveTextContent("/contests/c1");
  });

  test("a contest launch wins over a chapter id; chapter launches and direct entry are unchanged", () => {
    const { unmount } = at(<Back />, { pathname: "/games/fraction-builder", state: { ...CONTEST, chapterId: "ch9" } });
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where")).toHaveTextContent("/contests/c1");
    unmount();

    const chapter = at(<Back />, { pathname: "/games/fraction-builder", state: { chapterId: "ch9" } });
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where")).toHaveTextContent("/mission/ch9");
    chapter.unmount();

    at(<Back />, { pathname: "/games/fraction-builder" });
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where")).toHaveTextContent("/home");
  });
});

describe("useGameCompletionNav with a contest", () => {
  test("offers 'Back to Contest' (not Back to Chapter) and no recommended-next game; does not fetch a recommendation", async () => {
    at(<Results />, { pathname: "/games/fraction-builder", state: CONTEST });
    expect(screen.getByRole("button", { name: "Back to Contest" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to Chapter" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Recommended|Review Recommended|Next/i)).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(api.get).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Back to Contest" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/contests/c1");
  });

  test("outside a contest nothing changes: 'Back to Chapter' for chapter launches, recommendation still fetched", async () => {
    at(<Results />, { pathname: "/games/fraction-builder", state: { chapterId: "ch9" } });
    expect(screen.getByRole("button", { name: "Back to Chapter" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to Contest" })).not.toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/games/recommended"));
    fireEvent.click(screen.getByRole("button", { name: "Back to Chapter" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/mission/ch9");
  });

  test("if a recommendation was already fetched, moving into a contest launch hides it", async () => {
    function Harness() {
      const navigate = useNavigate();
      return (
        <>
          <Results />
          <button onClick={() => navigate("/games/fraction-builder", { state: CONTEST })}>enter contest</button>
        </>
      );
    }
    at(<Harness />, { pathname: "/games/fraction-builder" });
    // before: a normal launch shows the recommended-next game
    expect(await screen.findByText(/Next|Recommended/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("enter contest"));
    expect(await screen.findByRole("button", { name: "Back to Contest" })).toBeInTheDocument();
    expect(screen.queryByText(/Next|Recommended/i)).not.toBeInTheDocument();
  });

  test("the hook returns the labelled callback only for contests", () => {
    const wrapper = (entry) => ({ children }) => <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
    const contest = renderHook(() => useGameCompletionNav("MATH_FRACTION_BUILDER"), { wrapper: wrapper({ pathname: "/games/x", state: CONTEST }) });
    expect(contest.result.current.onBackToChapter.label).toBe("Back to Contest");
    expect(contest.result.current.onNextGame).toBeUndefined();
    const plain = renderHook(() => useGameCompletionNav("MATH_FRACTION_BUILDER"), { wrapper: wrapper("/games/x") });
    expect(plain.result.current.onBackToChapter).toBeUndefined();
  });
});

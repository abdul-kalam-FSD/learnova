import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GameFrame } from "./GameFrame";
import { FocusedModeProvider } from "../../context/focusedModeContext";
import { useMissionContext } from "../../context/missionContext";

// Reads whatever mission context GameFrame provided, so tests can assert
// on it without depending on GameTopBar's own rendering.
function MissionProbe() {
  const mission = useMissionContext();
  return <span data-testid="mission-probe">{mission ? JSON.stringify(mission) : "null"}</span>;
}

function renderFrame(state, setFocused = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/games/diagnosis", state }]}>
      <FocusedModeProvider setFocused={setFocused}>
        <GameFrame>
          <MissionProbe />
        </GameFrame>
      </FocusedModeProvider>
    </MemoryRouter>,
  );
}

describe("GameFrame", () => {
  test("still enables focused mode on mount (Phase 1B behavior unchanged)", () => {
    const setFocused = vi.fn();
    renderFrame(undefined, setFocused);
    expect(setFocused).toHaveBeenCalledWith(true);
  });

  test("still disables focused mode on unmount (Phase 1B behavior unchanged)", () => {
    const setFocused = vi.fn();
    const { unmount } = renderFrame(undefined, setFocused);
    unmount();
    expect(setFocused).toHaveBeenCalledWith(false);
  });

  test("provides no mission context when launched with no chapter state (Home/Practice/direct URL)", () => {
    renderFrame(undefined);
    expect(screen.getByTestId("mission-probe")).toHaveTextContent("null");
  });

  test("provides real mission context when launched from ChapterMission with chapterTitle + subjectName", () => {
    renderFrame({ chapterId: "c1", chapterTitle: "Cell Structure", subjectName: "Biology" });
    expect(screen.getByTestId("mission-probe")).toHaveTextContent(
      JSON.stringify({ chapterTitle: "Cell Structure", subjectName: "Biology" }),
    );
  });

  test("falls back to no mission context when chapterTitle itself is missing, even if chapterId is present", () => {
    // Guards against ever inventing a mission label from an id alone.
    renderFrame({ chapterId: "c1" });
    expect(screen.getByTestId("mission-probe")).toHaveTextContent("null");
  });
});

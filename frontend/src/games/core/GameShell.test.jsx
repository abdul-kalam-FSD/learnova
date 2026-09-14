import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameTopBar, GamePanel, GamePrimaryButton, GamePage, ShapeIcon, GameResults, LeaveMissionDialog } from "./GameShell";
import { MissionProvider } from "../../context/missionContext";

describe("GameTopBar", () => {
  test("renders the label, streak, and XP", () => {
    render(<GameTopBar label="Fraction Builder" xp={40} streak={3} onBack={() => {}} />);
    expect(screen.getByText("Fraction Builder")).toBeInTheDocument();
    expect(screen.getByText("STREAK 3")).toBeInTheDocument();
    expect(screen.getByText("40 XP")).toBeInTheDocument();
  });

  test("back button has an accessible label and calls onBack when clicked", () => {
    const onBack = vi.fn();
    render(<GameTopBar label="Fraction Builder" xp={0} streak={0} onBack={onBack} />);
    const backButton = screen.getByRole("button", { name: "Go back" });
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("does not render a back button when onBack is not provided", () => {
    render(<GameTopBar label="Fraction Builder" xp={0} streak={0} />);
    expect(screen.queryByRole("button", { name: "Go back" })).not.toBeInTheDocument();
  });

  test("announces an XP increase via the live region", () => {
    const { rerender } = render(<GameTopBar label="Game" xp={10} streak={1} onBack={() => {}} />);
    // No announcement yet on first render (nothing changed FROM anything).
    expect(screen.getByRole("status")).toHaveTextContent("");

    rerender(<GameTopBar label="Game" xp={30} streak={1} onBack={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("+20 XP earned");
  });

  test("announces a streak increase, separately from XP, when both change", () => {
    const { rerender } = render(<GameTopBar label="Game" xp={10} streak={2} onBack={() => {}} />);
    rerender(<GameTopBar label="Game" xp={15} streak={3} onBack={() => {}} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("+5 XP earned");
    expect(status).toHaveTextContent("Streak increased to 3");
  });

  test("does not announce anything when values are unchanged (no spam)", () => {
    const { rerender } = render(<GameTopBar label="Game" xp={10} streak={2} onBack={() => {}} />);
    rerender(<GameTopBar label="Game" xp={10} streak={2} onBack={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  // Phase 5C-B
  test("renders no mission line when there is no mission context (Home/Practice/direct URL launch)", () => {
    render(<GameTopBar label="Fraction Builder" xp={0} streak={0} />);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  test("renders 'Subject · Chapter' when real mission context is provided", () => {
    render(
      <MissionProvider value={{ chapterTitle: "Cell Structure", subjectName: "Biology" }}>
        <GameTopBar label="Diagnosis" xp={0} streak={0} />
      </MissionProvider>,
    );
    expect(screen.getByText("Biology · Cell Structure")).toBeInTheDocument();
    expect(screen.getByText("Diagnosis")).toBeInTheDocument();
  });

  test("falls back to the chapter title alone when there is no real subject name", () => {
    render(
      <MissionProvider value={{ chapterTitle: "Cell Structure", subjectName: null }}>
        <GameTopBar label="Diagnosis" xp={0} streak={0} />
      </MissionProvider>,
    );
    expect(screen.getByText("Cell Structure")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});

describe("GamePanel", () => {
  test("renders its children", () => {
    render(
      <GamePanel>
        <p>Panel content</p>
      </GamePanel>,
    );
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });
});

describe("GamePage", () => {
  test("renders its children", () => {
    render(
      <GamePage>
        <p>Page content</p>
      </GamePage>,
    );
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});

describe("GamePrimaryButton", () => {
  test("calls onClick when enabled and clicked", () => {
    const onClick = vi.fn();
    render(<GamePrimaryButton onClick={onClick}>Submit</GamePrimaryButton>);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("is disabled and does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <GamePrimaryButton onClick={onClick} disabled>
        Submit
      </GamePrimaryButton>,
    );
    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

// Phase 5A (Phase 4F audit finding): the onNextGame button used to read
// "Next Game →", which implied a guaranteed curriculum-next game the
// underlying recommendation engine doesn't provide.
describe("GameResults", () => {
  test("labels the onNextGame action 'Recommended Next' rather than 'Next Game'", () => {
    render(<GameResults completeLabel="Level Complete" onNextGame={() => {}} />);
    expect(screen.getByText(/Recommended Next/)).toBeInTheDocument();
    expect(screen.queryByText(/^Next Game/)).not.toBeInTheDocument();
  });

  test("clicking the Recommended Next button calls the existing onNextGame handler unchanged", () => {
    const onNextGame = vi.fn();
    render(<GameResults completeLabel="Level Complete" onNextGame={onNextGame} />);
    fireEvent.click(screen.getByText(/Recommended Next/));
    expect(onNextGame).toHaveBeenCalledTimes(1);
  });

  test("omits the Recommended Next button when onNextGame is not provided (unchanged fallback behavior)", () => {
    render(<GameResults completeLabel="Level Complete" />);
    expect(screen.queryByText(/Recommended Next/)).not.toBeInTheDocument();
  });

  // Phase 6C-B: the reason line for "Recommended Next" — resolved either
  // from an explicit nextGameReason prop, or (the real-world path, since
  // no per-game wrapper passes nextGameReason today) from a `.reason`
  // property useGameCompletionNav attaches to the same onNextGame
  // function every game already forwards unmodified.
  describe("nextGameReason (Recommended Next explanation)", () => {
    test("shows the reason attached to onNextGame.reason (the real useGameCompletionNav path)", () => {
      const onNextGame = () => {};
      onNextGame.reason = "You're still building this up — a quick round will help.";
      render(<GameResults completeLabel="Level Complete" onNextGame={onNextGame} />);
      expect(
        screen.getByText("You're still building this up — a quick round will help."),
      ).toBeInTheDocument();
    });

    test("an explicit nextGameReason prop takes priority over onNextGame.reason", () => {
      const onNextGame = () => {};
      onNextGame.reason = "attached reason";
      render(
        <GameResults
          completeLabel="Level Complete"
          onNextGame={onNextGame}
          nextGameReason="explicit reason"
        />,
      );
      expect(screen.getByText("explicit reason")).toBeInTheDocument();
      expect(screen.queryByText("attached reason")).not.toBeInTheDocument();
    });

    test("shows no reason line when onNextGame has no .reason and no explicit prop is given", () => {
      render(<GameResults completeLabel="Level Complete" onNextGame={() => {}} />);
      expect(screen.getByText(/Recommended Next/)).toBeInTheDocument();
      expect(
        screen.queryByText(/quick round will help|keep this one warm|review keeps it sharp|Something new to try/),
      ).not.toBeInTheDocument();
    });

    test("shows no reason line when onNextGame.reason is null (unrecognized/missing backend reason)", () => {
      const onNextGame = () => {};
      onNextGame.reason = null;
      render(<GameResults completeLabel="Level Complete" onNextGame={onNextGame} />);
      expect(screen.getByText(/Recommended Next/)).toBeInTheDocument();
      expect(screen.queryByText(/^You/)).not.toBeInTheDocument();
    });

    test("renders nothing reason-related when onNextGame itself is absent (existing callers unaffected)", () => {
      render(<GameResults completeLabel="Level Complete" nextGameReason="should never show" />);
      expect(screen.queryByText(/Recommended Next/)).not.toBeInTheDocument();
      expect(screen.queryByText("should never show")).not.toBeInTheDocument();
    });
  });

  // Phase 6C-C: "Recommended Next" implies something new. When the backend's
  // QuizSession-based completion check (see getRecommendedGame) confirms the
  // student already completed this exact recommended content, the button
  // must say "Review Recommended" instead — resolved the same way
  // nextGameReason is, via an explicit prop or the `.alreadyCompleted`
  // useGameCompletionNav attaches to the same onNextGame reference.
  describe("nextGameAlreadyCompleted (Review Recommended wording)", () => {
    test("shows 'Review Recommended' when onNextGame.alreadyCompleted is true (the real useGameCompletionNav path)", () => {
      const onNextGame = () => {};
      onNextGame.alreadyCompleted = true;
      render(<GameResults completeLabel="Level Complete" onNextGame={onNextGame} />);
      expect(screen.getByText(/Review Recommended/)).toBeInTheDocument();
      expect(screen.queryByText(/^Recommended Next/)).not.toBeInTheDocument();
    });

    test("keeps 'Recommended Next' when onNextGame.alreadyCompleted is false", () => {
      const onNextGame = () => {};
      onNextGame.alreadyCompleted = false;
      render(<GameResults completeLabel="Level Complete" onNextGame={onNextGame} />);
      expect(screen.getByText(/Recommended Next/)).toBeInTheDocument();
      expect(screen.queryByText(/Review Recommended/)).not.toBeInTheDocument();
    });

    test("keeps 'Recommended Next' when onNextGame has no .alreadyCompleted at all (never fabricates Review)", () => {
      render(<GameResults completeLabel="Level Complete" onNextGame={() => {}} />);
      expect(screen.getByText(/Recommended Next/)).toBeInTheDocument();
      expect(screen.queryByText(/Review Recommended/)).not.toBeInTheDocument();
    });

    test("an explicit nextGameAlreadyCompleted prop takes priority over onNextGame.alreadyCompleted", () => {
      const onNextGame = () => {};
      onNextGame.alreadyCompleted = false;
      render(
        <GameResults
          completeLabel="Level Complete"
          onNextGame={onNextGame}
          nextGameAlreadyCompleted={true}
        />,
      );
      expect(screen.getByText(/Review Recommended/)).toBeInTheDocument();
    });

    test("clicking the button still calls the unchanged onNextGame handler regardless of the label", () => {
      const onNextGame = vi.fn();
      onNextGame.alreadyCompleted = true;
      render(<GameResults completeLabel="Level Complete" onNextGame={onNextGame} />);
      fireEvent.click(screen.getByText(/Review Recommended/));
      expect(onNextGame).toHaveBeenCalledTimes(1);
    });

    test("the reason line still renders alongside the Review Recommended label", () => {
      const onNextGame = () => {};
      onNextGame.alreadyCompleted = true;
      onNextGame.reason = "You've got this down — a quick review keeps it sharp.";
      render(<GameResults completeLabel="Level Complete" onNextGame={onNextGame} />);
      expect(screen.getByText(/Review Recommended/)).toBeInTheDocument();
      expect(
        screen.getByText("You've got this down — a quick review keeps it sharp."),
      ).toBeInTheDocument();
    });
  });

  // Phase 6B, P1-2: explain the XP cap instead of a silent "+0 XP".
  describe("xpCapped", () => {
    test("shows the cap explanation when xpCapped is true", () => {
      render(<GameResults completeLabel="Level Complete" xpAwarded={0} xpCapped={true} />);
      expect(screen.getByText(/Daily bonus limit reached/)).toBeInTheDocument();
    });

    test("shows no cap explanation when xpCapped is false", () => {
      render(<GameResults completeLabel="Level Complete" xpAwarded={30} xpCapped={false} />);
      expect(screen.queryByText(/Daily bonus limit reached/)).not.toBeInTheDocument();
    });

    test("shows no cap explanation and does not crash when xpCapped is missing/undefined", () => {
      render(<GameResults completeLabel="Level Complete" xpAwarded={30} />);
      expect(screen.queryByText(/Daily bonus limit reached/)).not.toBeInTheDocument();
    });
  });

  // Phase 6C-A: surface existing multi-round accuracy data on the shared
  // results screen. GameResults already declared/rendered accuracyPct;
  // this batch only verifies that render path and the per-game plumbing
  // that now feeds it.
  describe("accuracyPct", () => {
    test("renders the supplied accuracy percentage", () => {
      render(<GameResults completeLabel="Level Complete" accuracyPct={67} />);
      expect(screen.getByText("🎯 67% accuracy")).toBeInTheDocument();
    });

    test("renders 100% accuracy", () => {
      render(<GameResults completeLabel="Level Complete" accuracyPct={100} />);
      expect(screen.getByText("🎯 100% accuracy")).toBeInTheDocument();
    });

    test("renders 0% accuracy", () => {
      render(<GameResults completeLabel="Level Complete" accuracyPct={0} />);
      expect(screen.getByText("🎯 0% accuracy")).toBeInTheDocument();
    });

    test("omits the accuracy stat when accuracyPct is undefined (single-round games unaffected)", () => {
      render(<GameResults completeLabel="Level Complete" />);
      expect(screen.queryByText(/accuracy/)).not.toBeInTheDocument();
    });
  });

  // Phase 6B, P1-3: never claim mastery "updated" when it didn't change.
  describe("masteryUpdate truthfulness", () => {
    test("does not say 'updated' when previous and new mastery state are the same", () => {
      render(
        <GameResults
          completeLabel="Level Complete"
          masteryUpdate={{ concept_id: "c1", new_state: "weak", previous_state: "weak", changed: false }}
        />,
      );
      expect(screen.getByText("Mastery: weak")).toBeInTheDocument();
      expect(screen.queryByText(/updated/i)).not.toBeInTheDocument();
    });

    test("says mastery updated when the state genuinely changed (weak -> learning)", () => {
      render(
        <GameResults
          completeLabel="Level Complete"
          masteryUpdate={{ concept_id: "c1", new_state: "learning", previous_state: "weak", changed: true }}
        />,
      );
      expect(screen.getByText("Mastery updated to: learning")).toBeInTheDocument();
    });

    test("says mastery updated when the state genuinely changed (learning -> strong)", () => {
      render(
        <GameResults
          completeLabel="Level Complete"
          masteryUpdate={{ concept_id: "c1", new_state: "strong", previous_state: "learning", changed: true }}
        />,
      );
      expect(screen.getByText("Mastery updated to: strong")).toBeInTheDocument();
    });

    test("falls back to the original wording when `changed` is absent (older/unknown response shape)", () => {
      render(
        <GameResults
          completeLabel="Level Complete"
          masteryUpdate={{ concept_id: "c1", new_state: "weak" }}
        />,
      );
      expect(screen.getByText("Updated to: weak")).toBeInTheDocument();
    });
  });
});

describe("ShapeIcon", () => {
  test("renders a known shape with a matching aria-label", () => {
    render(<ShapeIcon shape="triangle" />);
    expect(screen.getByLabelText("triangle")).toBeInTheDocument();
  });

  test("falls back to a circle for an unknown shape rather than rendering nothing", () => {
    const { container } = render(<ShapeIcon shape="not-a-real-shape" />);
    expect(container.querySelector("circle")).toBeInTheDocument();
    expect(container.querySelector("polygon")).not.toBeInTheDocument();
  });
});

describe("LeaveMissionDialog", () => {
  test("renders nothing when closed", () => {
    render(<LeaveMissionDialog open={false} onStay={() => {}} onLeave={() => {}} />);
    expect(screen.queryByText("Leave this mission?")).not.toBeInTheDocument();
  });

  test("shows the mission-leave copy and both actions when open", () => {
    render(<LeaveMissionDialog open onStay={() => {}} onLeave={() => {}} />);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Leave this mission?")).toBeInTheDocument();
    expect(screen.getByText("You may lose your current progress.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave" })).toBeInTheDocument();
  });

  test("Stay calls onStay, Leave calls onLeave", () => {
    const onStay = vi.fn();
    const onLeave = vi.fn();
    render(<LeaveMissionDialog open onStay={onStay} onLeave={onLeave} />);

    fireEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  test("clicking the backdrop calls onStay (dismiss without leaving)", () => {
    const onStay = vi.fn();
    render(<LeaveMissionDialog open onStay={onStay} onLeave={() => {}} />);
    fireEvent.click(screen.getByRole("alertdialog").parentElement);
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  test("Escape calls onStay", () => {
    const onStay = vi.fn();
    render(<LeaveMissionDialog open onStay={onStay} onLeave={() => {}} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  test("moves focus into the dialog when opened", () => {
    render(<LeaveMissionDialog open onStay={() => {}} onLeave={() => {}} />);
    expect(document.activeElement).toHaveTextContent("Stay");
  });
});
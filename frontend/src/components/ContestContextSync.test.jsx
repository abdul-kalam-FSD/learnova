import { describe, test, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import ContestContextSync from "./ContestContextSync";
import { getContestContext, setContestContext } from "../api/contestContext";

const CONTEST_STATE = { contest: { id: "c1", gameType: "MATH_FRACTION_BUILDER", title: "Blitz" } };

function Harness() {
  const navigate = useNavigate();
  return (
    <>
      <ContestContextSync />
      <button onClick={() => navigate("/home")}>go home</button>
      <button onClick={() => navigate("/games/fraction-match", { state: { contest: { id: "c2", gameType: "MATH_FRACTION_MATCH", title: "Two" } } })}>launch other</button>
      <button onClick={() => navigate("/games/fraction-builder", { state: { chapterId: "ch1" } })}>chapter launch</button>
    </>
  );
}

beforeEach(() => setContestContext(null));

describe("ContestContextSync", () => {
  test("publishes the contest the current entry was launched from", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/games/fraction-builder", state: CONTEST_STATE }]}>
        <Harness />
      </MemoryRouter>,
    );
    expect(getContestContext()).toEqual({ id: "c1", gameType: "MATH_FRACTION_BUILDER", title: "Blitz" });
  });

  test("is empty for ordinary navigation (no contest in location state)", () => {
    render(
      <MemoryRouter initialEntries={["/games/fraction-builder"]}>
        <Harness />
      </MemoryRouter>,
    );
    expect(getContestContext()).toBeNull();
  });

  test("navigating away clears it, so practice never inherits a contest", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/games/fraction-builder", state: CONTEST_STATE }]}>
        <Harness />
      </MemoryRouter>,
    );
    expect(getContestContext()).not.toBeNull();
    fireEvent.click(screen.getByText("go home"));
    expect(getContestContext()).toBeNull();
  });

  test("a chapter launch (no contest) also clears a previous contest", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/games/fraction-builder", state: CONTEST_STATE }]}>
        <Harness />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("chapter launch"));
    expect(getContestContext()).toBeNull();
  });

  test("launching a different contest replaces the previous one", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/games/fraction-builder", state: CONTEST_STATE }]}>
        <Harness />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("launch other"));
    expect(getContestContext()).toEqual({ id: "c2", gameType: "MATH_FRACTION_MATCH", title: "Two" });
  });

  test("unmounting clears it", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={[{ pathname: "/games/fraction-builder", state: CONTEST_STATE }]}>
        <Harness />
      </MemoryRouter>,
    );
    expect(getContestContext()).not.toBeNull();
    unmount();
    expect(getContestContext()).toBeNull();
  });
});

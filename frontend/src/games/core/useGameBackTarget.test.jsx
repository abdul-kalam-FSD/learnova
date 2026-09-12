import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useGameBackTarget } from "./useGameBackTarget";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

describe("useGameBackTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("navigates to the chapter mission when location.state.chapterId is present", () => {
    const { result } = renderHook(() => useGameBackTarget(), {
      wrapper: ({ children }) => (
        <MemoryRouter
          initialEntries={[
            { pathname: "/games/fraction-match", state: { chapterId: "ch-42" } },
          ]}
        >
          {children}
        </MemoryRouter>
      ),
    });

    result.current();
    expect(navigateMock).toHaveBeenCalledWith("/mission/ch-42");
  });

  test("falls back to /home when there is no chapterId in location.state (direct entry)", () => {
    const { result } = renderHook(() => useGameBackTarget(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/games/fraction-match"]}>{children}</MemoryRouter>
      ),
    });

    result.current();
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });
});

import { describe, test, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLeaveConfirmation } from "./useLeaveConfirmation";

describe("useLeaveConfirmation", () => {
  test("starts closed and does not call the leave handler yet", () => {
    const onConfirmedLeave = vi.fn();
    const { result } = renderHook(() => useLeaveConfirmation(onConfirmedLeave));

    expect(result.current.confirmOpen).toBe(false);
    expect(onConfirmedLeave).not.toHaveBeenCalled();
  });

  test("requestLeave opens the dialog without calling the leave handler", () => {
    const onConfirmedLeave = vi.fn();
    const { result } = renderHook(() => useLeaveConfirmation(onConfirmedLeave));

    act(() => result.current.requestLeave());

    expect(result.current.confirmOpen).toBe(true);
    expect(onConfirmedLeave).not.toHaveBeenCalled();
  });

  test("cancelLeave closes the dialog without calling the leave handler", () => {
    const onConfirmedLeave = vi.fn();
    const { result } = renderHook(() => useLeaveConfirmation(onConfirmedLeave));

    act(() => result.current.requestLeave());
    act(() => result.current.cancelLeave());

    expect(result.current.confirmOpen).toBe(false);
    expect(onConfirmedLeave).not.toHaveBeenCalled();
  });

  test("confirmLeave closes the dialog and calls the leave handler exactly once", () => {
    const onConfirmedLeave = vi.fn();
    const { result } = renderHook(() => useLeaveConfirmation(onConfirmedLeave));

    act(() => result.current.requestLeave());
    act(() => result.current.confirmLeave());

    expect(result.current.confirmOpen).toBe(false);
    expect(onConfirmedLeave).toHaveBeenCalledTimes(1);
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock at the component boundary: the singleton/hook has its own tests
// (src/utils/pwaInstall.test.jsx).
const hookState = { canInstall: true, isInstalled: false, promptInstall: vi.fn() };
vi.mock("../utils/usePwaInstall", () => ({ usePwaInstall: () => hookState }));

import InstallAppButton from "./InstallAppButton";

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  hookState.canInstall = true;
  hookState.isInstalled = false;
  hookState.promptInstall = vi.fn().mockResolvedValue("dismissed");
  window.Notification = { requestPermission: vi.fn() };
});
afterEach(() => {
  delete window.Notification;
  vi.restoreAllMocks();
});

describe("rendering", () => {
  it("renders nothing when install is unavailable (unsupported / no event / dismissed)", () => {
    hookState.canInstall = false;
    const { container } = render(<InstallAppButton />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing when already installed / standalone", () => {
    hookState.canInstall = false;
    hookState.isInstalled = true;
    const { container } = render(<InstallAppButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders 'Install Learnova' when available", () => {
    render(<InstallAppButton />);
    expect(screen.getByRole("button", { name: "Install Learnova" })).toBeInTheDocument();
  });

  it("is removed when installation becomes unavailable (e.g. appinstalled)", () => {
    const { container, rerender } = render(<InstallAppButton />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    hookState.canInstall = false;
    hookState.isInstalled = true;
    rerender(<InstallAppButton />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("accessibility & structure", () => {
  it("is a real type=button whose accessible name is its visible text (no aria-label)", () => {
    render(<InstallAppButton />);
    const btn = screen.getByRole("button", { name: "Install Learnova" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).not.toHaveAttribute("aria-label");
    expect(btn).toHaveTextContent("Install Learnova");
  });

  it("has a decorative icon hidden from assistive tech (not icon-only)", () => {
    render(<InstallAppButton />);
    const svg = screen.getByRole("button").querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("is keyboard operable (Tab to focus, Enter and Space activate)", async () => {
    const user = userEvent.setup();
    render(<InstallAppButton />);
    await user.tab();
    const btn = screen.getByRole("button");
    expect(btn).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(hookState.promptInstall).toHaveBeenCalledTimes(1);
    await user.keyboard(" ");
    expect(hookState.promptInstall).toHaveBeenCalledTimes(2); // pending cleared after the first settled
  });

  it("carries no positioning/layout of its own (no inline style, no fixed/absolute classes)", () => {
    render(<InstallAppButton />);
    const btn = screen.getByRole("button");
    expect(btn).not.toHaveAttribute("style");
    expect(btn.className).not.toMatch(/\b(fixed|absolute|sticky|float)\b/);
  });
});

describe("presentation props", () => {
  it("default 'pill' variant reuses Learnova's shared pill button classes", () => {
    render(<InstallAppButton />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("btn-primary", "btn-pill", "install-app-btn");
  });

  it("'plain' variant adds no visual styling classes; className is applied", () => {
    render(<InstallAppButton variant="plain" className="drawer__link" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("install-app-btn", "drawer__link");
    expect(btn).not.toHaveClass("btn-primary");
    expect(btn).not.toHaveClass("btn-pill");
  });

  it("custom className is appended on the pill variant too", () => {
    render(<InstallAppButton className="ph-header__install" />);
    expect(screen.getByRole("button")).toHaveClass("btn-primary", "ph-header__install");
  });
});

describe("click behaviour", () => {
  it("calls promptInstall() exactly once per click", async () => {
    const user = userEvent.setup();
    render(<InstallAppButton />);
    await user.click(screen.getByRole("button"));
    expect(hookState.promptInstall).toHaveBeenCalledTimes(1);
  });

  it("repeated/double click while the prompt is pending does not call twice", async () => {
    const d = deferred();
    hookState.promptInstall = vi.fn(() => d.promise);
    const user = userEvent.setup();
    render(<InstallAppButton />);
    const btn = screen.getByRole("button");
    await user.dblClick(btn);
    await user.click(btn);
    expect(hookState.promptInstall).toHaveBeenCalledTimes(1);
    expect(btn).toBeDisabled(); // pending state visible to users and AT

    await act(async () => d.resolve("dismissed"));
    expect(btn).toBeEnabled();
  });

  it("two clicks in the same tick (before React re-renders) still call only once", async () => {
    const d = deferred();
    hookState.promptInstall = vi.fn(() => d.promise);
    render(<InstallAppButton />);
    const btn = screen.getByRole("button");
    act(() => {
      btn.click(); // both land before `pending` can disable the button
      btn.click();
    });
    expect(hookState.promptInstall).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve("dismissed"));
  });

  it("dismissed: no crash, no warning, no redirect, onResult reports it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onResult = vi.fn();
    const before = window.location.href;
    hookState.promptInstall = vi.fn().mockResolvedValue("dismissed");
    const user = userEvent.setup();
    render(<InstallAppButton onResult={onResult} />);
    await user.click(screen.getByRole("button"));
    expect(onResult).toHaveBeenCalledWith("dismissed");
    expect(warn).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
  });

  it("accepted: shows no extra success message (appinstalled is the real signal)", async () => {
    hookState.promptInstall = vi.fn().mockResolvedValue("accepted");
    const user = userEvent.setup();
    const { container } = render(<InstallAppButton />);
    await user.click(screen.getByRole("button"));
    expect(container).not.toHaveTextContent(/installed|success|thank/i);
  });

  it("'error' result: warns, does not throw, button recovers", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    hookState.promptInstall = vi.fn().mockResolvedValue("error");
    const user = userEvent.setup();
    render(<InstallAppButton />);
    await user.click(screen.getByRole("button"));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("a rejecting promptInstall() is contained like an error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onResult = vi.fn();
    hookState.promptInstall = vi.fn().mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<InstallAppButton onResult={onResult} />);
    await user.click(screen.getByRole("button"));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith("error");
  });

  it("never requests notification permission", async () => {
    const user = userEvent.setup();
    render(<InstallAppButton />);
    await user.click(screen.getByRole("button"));
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });
});

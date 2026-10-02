import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as pwa from "./pwaInstall";
import { usePwaInstall } from "./usePwaInstall";

// --- helpers ---------------------------------------------------------------
function makeInstallEvent(outcome = "accepted") {
  const evt = new Event("beforeinstallprompt", { cancelable: true });
  evt.prompt = vi.fn().mockResolvedValue(undefined);
  evt.userChoice = Promise.resolve({ outcome, platform: "web" });
  return evt;
}
function fire(evt) {
  act(() => {
    window.dispatchEvent(evt);
  });
  return evt;
}
// Controllable (display-mode: standalone) media query.
function mockDisplayMode(matches) {
  const handlers = new Set();
  const mql = {
    matches,
    media: "(display-mode: standalone)",
    addEventListener: vi.fn((_, h) => handlers.add(h)),
    removeEventListener: vi.fn((_, h) => handlers.delete(h)),
  };
  window.matchMedia = vi.fn(() => mql);
  return {
    set(next) {
      mql.matches = next;
      act(() => handlers.forEach((h) => h()));
    },
    mql,
  };
}

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  pwa.__resetPwaInstallForTests();
  window.sessionStorage.clear();
  delete navigator.standalone;
  window.matchMedia = realMatchMedia; // setup.js polyfill (matches: false)
  window.Notification = { requestPermission: vi.fn() };
});
afterEach(() => {
  pwa.__resetPwaInstallForTests();
  delete window.Notification;
  window.matchMedia = realMatchMedia;
  vi.restoreAllMocks();
});

// --- tests -----------------------------------------------------------------
describe("capture timing", () => {
  it("captures an event fired BEFORE any component mounts (early init)", () => {
    pwa.initPwaInstall(); // what main.jsx does before render
    const evt = makeInstallEvent();
    window.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true); // Learnova, not the browser, controls the prompt
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(true);
  });

  it("captures an event fired AFTER a component mounted and re-renders it", () => {
    pwa.initPwaInstall();
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(false);
    fire(makeInstallEvent());
    expect(result.current.canInstall).toBe(true);
  });

  it("never shows the prompt or asks notification permission on its own", () => {
    pwa.initPwaInstall();
    const evt = fire(makeInstallEvent());
    renderHook(() => usePwaInstall());
    expect(evt.prompt).not.toHaveBeenCalled();
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });
});

describe("multiple consumers", () => {
  it("stay synchronised and share ONE set of global listeners", () => {
    const add = vi.spyOn(window, "addEventListener");
    pwa.initPwaInstall();
    const a = renderHook(() => usePwaInstall());
    const b = renderHook(() => usePwaInstall());
    pwa.initPwaInstall(); // extra calls are harmless
    const count = (name) => add.mock.calls.filter(([n]) => n === name).length;
    expect(count("beforeinstallprompt")).toBe(1);
    expect(count("appinstalled")).toBe(1);

    fire(makeInstallEvent());
    expect(a.result.current.canInstall).toBe(true);
    expect(b.result.current.canInstall).toBe(true);

    // Consuming from one consumer updates the other.
    return act(async () => {
      await a.result.current.promptInstall();
    }).then(() => {
      expect(a.result.current.canInstall).toBe(false);
      expect(b.result.current.canInstall).toBe(false);
      expect(b.result.current.isInstalled).toBe(true);
    });
  });
});

describe("install outcomes", () => {
  it("accepted: prompts once, marks installed, event is never reused", async () => {
    pwa.initPwaInstall();
    const evt = fire(makeInstallEvent("accepted"));
    const { result } = renderHook(() => usePwaInstall());

    let outcome;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });
    expect(outcome).toBe("accepted");
    expect(evt.prompt).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ canInstall: false, isInstalled: true });

    await act(async () => {
      outcome = await result.current.promptInstall(); // second click / consumer
    });
    expect(outcome).toBe("unavailable");
    expect(evt.prompt).toHaveBeenCalledTimes(1);
  });

  it("double-click while the dialog is open only prompts once", async () => {
    pwa.initPwaInstall();
    const evt = fire(makeInstallEvent("accepted"));
    const { result } = renderHook(() => usePwaInstall());
    let outcomes;
    await act(async () => {
      outcomes = await Promise.all([result.current.promptInstall(), result.current.promptInstall()]);
    });
    expect(outcomes.sort()).toEqual(["accepted", "unavailable"]);
    expect(evt.prompt).toHaveBeenCalledTimes(1);
  });

  it("dismissed: hides the action, does not mark installed, and does not re-show if the browser re-fires immediately", async () => {
    pwa.initPwaInstall();
    fire(makeInstallEvent("dismissed"));
    const { result } = renderHook(() => usePwaInstall());

    let outcome;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });
    expect(outcome).toBe("dismissed");
    expect(result.current).toMatchObject({ canInstall: false, isInstalled: false });

    const again = fire(makeInstallEvent()); // browser fires a fresh event
    expect(again.defaultPrevented).toBe(true);
    expect(result.current.canInstall).toBe(false); // no spam
    expect(again.prompt).not.toHaveBeenCalled();
  });

  it("dismissal lasts for the session only: a new session offers install again", async () => {
    pwa.initPwaInstall();
    fire(makeInstallEvent("dismissed"));
    await act(async () => {
      await pwa.promptInstall();
    });
    expect(window.sessionStorage.getItem("learnova.pwa.installDismissed")).toBe("1");

    // Same session, page reloaded: still suppressed.
    pwa.__resetPwaInstallForTests();
    pwa.initPwaInstall();
    fire(makeInstallEvent());
    expect(pwa.getSnapshot().canInstall).toBe(false);

    // New session (sessionStorage gone): offered again.
    pwa.__resetPwaInstallForTests();
    window.sessionStorage.clear();
    pwa.initPwaInstall();
    fire(makeInstallEvent());
    expect(pwa.getSnapshot().canInstall).toBe(true);
  });

  it("prompt() throwing is contained: resolves 'error', event is consumed", async () => {
    pwa.initPwaInstall();
    const evt = makeInstallEvent();
    evt.prompt = vi.fn(() => {
      throw new Error("InvalidStateError");
    });
    fire(evt);
    let outcome;
    await act(async () => {
      outcome = await pwa.promptInstall();
    });
    expect(outcome).toBe("error");
    expect(pwa.getSnapshot().canInstall).toBe(false);
  });
});

describe("appinstalled", () => {
  it("clears the deferred prompt and marks installation unavailable", () => {
    pwa.initPwaInstall();
    const { result } = renderHook(() => usePwaInstall());
    fire(makeInstallEvent());
    expect(result.current.canInstall).toBe(true);
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(result.current).toMatchObject({ canInstall: false, isInstalled: true });
  });

  it("works when installed via the browser menu instead of our button", async () => {
    pwa.initPwaInstall();
    fire(makeInstallEvent());
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    let outcome;
    await act(async () => {
      outcome = await pwa.promptInstall();
    });
    expect(outcome).toBe("unavailable");
  });
});

describe("already installed (standalone)", () => {
  it("(display-mode: standalone) => installed, never offered, even if the event fires", () => {
    mockDisplayMode(true);
    pwa.initPwaInstall();
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current).toMatchObject({ canInstall: false, isInstalled: true });
    const evt = fire(makeInstallEvent());
    expect(evt.defaultPrevented).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it("iOS navigator.standalone === true counts as installed", () => {
    navigator.standalone = true;
    pwa.initPwaInstall();
    expect(pwa.getSnapshot().isInstalled).toBe(true);
  });

  it("reacts live when the display mode changes", () => {
    const dm = mockDisplayMode(false);
    pwa.initPwaInstall();
    const { result } = renderHook(() => usePwaInstall());
    fire(makeInstallEvent());
    expect(result.current.canInstall).toBe(true);
    dm.set(true);
    expect(result.current).toMatchObject({ canInstall: false, isInstalled: true });
  });

  it("a normal browser tab (matches: false) is not treated as installed", () => {
    mockDisplayMode(false);
    pwa.initPwaInstall();
    expect(pwa.getSnapshot().isInstalled).toBe(false);
  });
});

describe("unsupported environments stay unaffected", () => {
  it("no beforeinstallprompt ever fires (e.g. iOS Safari, Firefox): nothing shown, no errors", async () => {
    pwa.initPwaInstall();
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current).toMatchObject({ canInstall: false, isInstalled: false });
    await expect(result.current.promptInstall()).resolves.toBe("unavailable");
  });

  it("no matchMedia and blocked sessionStorage do not throw", () => {
    delete window.matchMedia;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => pwa.initPwaInstall()).not.toThrow();
    expect(pwa.getSnapshot()).toMatchObject({ canInstall: false, isInstalled: false });
  });
});

describe("listener cleanup / HMR", () => {
  it("teardown removes every global listener and init can re-attach exactly once", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const dm = mockDisplayMode(false);
    pwa.initPwaInstall();
    pwa.teardownPwaInstall();
    const removed = remove.mock.calls.map(([n]) => n);
    expect(removed).toEqual(expect.arrayContaining(["beforeinstallprompt", "appinstalled"]));
    expect(dm.mql.removeEventListener).toHaveBeenCalledTimes(1);

    // After teardown an event is ignored...
    window.dispatchEvent(makeInstallEvent());
    expect(pwa.getSnapshot().canInstall).toBe(false);

    // ...and re-init attaches a single fresh set.
    const add = vi.spyOn(window, "addEventListener");
    pwa.initPwaInstall();
    pwa.initPwaInstall();
    expect(add.mock.calls.filter(([n]) => n === "beforeinstallprompt")).toHaveLength(1);
  });

  it("unsubscribing a consumer stops notifications to it", () => {
    pwa.initPwaInstall();
    const listener = vi.fn();
    const unsubscribe = pwa.subscribe(listener);
    fire(makeInstallEvent());
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// Service-worker registration architecture: ONE /sw.js at scope "/", shared
// by the early startup call and by push.js, with push permission/subscription
// staying strictly user-initiated.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../api/axios", () => ({ default: { post: vi.fn().mockResolvedValue({}) } }));

function installSW({ registerImpl } = {}) {
  const sub = {
    endpoint: "https://push.example/1",
    toJSON: () => ({ endpoint: "https://push.example/1" }),
    unsubscribe: vi.fn(),
  };
  const reg = {
    scope: "http://localhost/",
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue(sub),
    },
  };
  const register = vi.fn(registerImpl || (() => Promise.resolve(reg)));
  Object.defineProperty(navigator, "serviceWorker", {
    value: { register, ready: Promise.resolve(reg) },
    configurable: true,
  });
  window.PushManager = function PushManager() {};
  window.Notification = { requestPermission: vi.fn().mockResolvedValue("granted") };
  return { reg, register, sub };
}

const setReadyState = (value) =>
  Object.defineProperty(document, "readyState", { value, configurable: true });

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  delete navigator.serviceWorker;
  delete window.PushManager;
  delete window.Notification;
  delete document.readyState; // restore the prototype getter
  vi.restoreAllMocks();
});

describe("shared registration helper", () => {
  it("registers /sw.js at scope / exactly once for concurrent and repeated callers", async () => {
    const { register, reg } = installSW();
    const m = await import("./serviceWorker.js");
    const results = await Promise.all([
      m.registerServiceWorker(),
      m.registerServiceWorker(),
      m.registerServiceWorker(),
    ]);
    await m.registerServiceWorker();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    results.forEach((r) => expect(r).toBe(reg));
  });

  it("unsupported browser: resolves null, never throws, startup helper is a no-op", async () => {
    const m = await import("./serviceWorker.js");
    expect("serviceWorker" in navigator).toBe(false);
    await expect(m.registerServiceWorker()).resolves.toBeNull();
    expect(() => m.registerServiceWorkerOnLoad()).not.toThrow();
  });

  it("registration failure resolves null (no unhandled rejection) and a later caller can retry", async () => {
    let calls = 0;
    const { register, reg } = installSW({
      registerImpl: () => (++calls === 1 ? Promise.reject(new Error("boom")) : Promise.resolve(reg)),
    });
    const m = await import("./serviceWorker.js");
    await expect(m.registerServiceWorker()).resolves.toBeNull();
    await expect(m.registerServiceWorker()).resolves.toBe(reg);
    expect(register).toHaveBeenCalledTimes(2);
  });
});

describe("public startup registration (any route, no HamburgerDrawer needed)", () => {
  it("registers immediately when the page has already loaded", async () => {
    const { register } = installSW();
    setReadyState("complete");
    const m = await import("./serviceWorker.js");
    m.registerServiceWorkerOnLoad();
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("otherwise waits for the window load event, then registers once", async () => {
    const { register } = installSW();
    setReadyState("loading");
    const m = await import("./serviceWorker.js");
    m.registerServiceWorkerOnLoad();
    expect(register).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    window.dispatchEvent(new Event("load")); // { once: true }
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("never asks for notification permission or touches push at startup", async () => {
    const { reg } = installSW();
    setReadyState("complete");
    const m = await import("./serviceWorker.js");
    m.registerServiceWorkerOnLoad();
    await m.registerServiceWorker();
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    expect(reg.pushManager.subscribe).not.toHaveBeenCalled();
    expect(reg.pushManager.getSubscription).not.toHaveBeenCalled();
  });
});

describe("push.js keeps using the same shared registration", () => {
  it("startup + drawer mount + user-initiated subscribe => ONE register() call, same registration", async () => {
    const { register, reg, sub } = installSW();
    const sw = await import("./serviceWorker.js");
    const push = await import("./push.js");
    sw.registerServiceWorkerOnLoad();
    const early = await sw.registerServiceWorker();

    await push.getExistingSubscription(); // what HamburgerDrawer does on mount
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    expect(reg.pushManager.subscribe).not.toHaveBeenCalled();

    expect(await push.subscribeToPush()).toBe(sub); // the user's click
    expect(register).toHaveBeenCalledTimes(1);
    expect(early).toBe(reg);
    expect(reg.pushManager.getSubscription).toHaveBeenCalled();
    expect(reg.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(window.Notification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("denied permission still throws the same message and does not subscribe", async () => {
    const { reg } = installSW();
    window.Notification.requestPermission.mockResolvedValue("denied");
    const push = await import("./push.js");
    await expect(push.subscribeToPush()).rejects.toThrow("Notification permission denied");
    expect(reg.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("service worker unavailable: getExistingSubscription -> null, subscribeToPush -> clear error, no permission prompt", async () => {
    installSW({ registerImpl: () => Promise.reject(new Error("nope")) });
    const push = await import("./push.js");
    await expect(push.getExistingSubscription()).resolves.toBeNull();
    await expect(push.subscribeToPush()).rejects.toThrow(/aren't available/);
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });

  it("unsupported browsers: push helpers are safe no-ops", async () => {
    const push = await import("./push.js");
    expect(push.isPushSupported()).toBe(false);
    await expect(push.getExistingSubscription()).resolves.toBeNull();
    await expect(push.unsubscribeFromPush()).resolves.toBeUndefined();
  });
});

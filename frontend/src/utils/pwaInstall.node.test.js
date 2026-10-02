// @vitest-environment node
import { describe, it, expect } from "vitest";
import * as pwa from "./pwaInstall";

// No window/document at all (SSR-like / non-browser): the module must import
// and behave as "install unavailable" without throwing.
describe("pwaInstall without a browser (no window)", () => {
  it("is inert and safe", async () => {
    expect(typeof window).toBe("undefined");
    expect(() => pwa.initPwaInstall()).not.toThrow();
    expect(pwa.getSnapshot()).toEqual({ canInstall: false, isInstalled: false, dismissed: false });
    await expect(pwa.promptInstall()).resolves.toBe("unavailable");
    expect(() => pwa.teardownPwaInstall()).not.toThrow();
  });
});

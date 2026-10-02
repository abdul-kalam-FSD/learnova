import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as pwa from "../utils/pwaInstall";
import InstallAppButton from "./InstallAppButton";

// One end-to-end sanity check against the REAL singleton + hook (no mocks).
function makeInstallEvent(outcome) {
  const evt = new Event("beforeinstallprompt", { cancelable: true });
  evt.prompt = vi.fn().mockResolvedValue(undefined);
  evt.userChoice = Promise.resolve({ outcome, platform: "web" });
  return evt;
}

beforeEach(() => {
  pwa.__resetPwaInstallForTests();
  window.sessionStorage.clear();
  pwa.initPwaInstall();
});
afterEach(() => pwa.__resetPwaInstallForTests());

describe("InstallAppButton + real install singleton", () => {
  it("hidden -> appears on beforeinstallprompt -> click prompts once -> disappears", async () => {
    const user = userEvent.setup();
    const { container } = render(<InstallAppButton />);
    expect(container).toBeEmptyDOMElement();

    const evt = makeInstallEvent("accepted");
    act(() => {
      window.dispatchEvent(evt);
    });
    const btn = await screen.findByRole("button", { name: "Install Learnova" });
    expect(evt.prompt).not.toHaveBeenCalled(); // never automatic

    await user.click(btn);
    expect(evt.prompt).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays hidden for the session after the user dismisses the native dialog", async () => {
    const user = userEvent.setup();
    const { container } = render(<InstallAppButton />);
    act(() => {
      window.dispatchEvent(makeInstallEvent("dismissed"));
    });
    await user.click(await screen.findByRole("button"));
    expect(container).toBeEmptyDOMElement();

    act(() => {
      window.dispatchEvent(makeInstallEvent("dismissed")); // browser re-fires
    });
    expect(container).toBeEmptyDOMElement();
  });
});

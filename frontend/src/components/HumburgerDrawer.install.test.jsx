// Task 5: placement of <InstallAppButton /> in the authenticated drawer, and
// proof that the existing Notifications / Logout / link behaviour is unchanged.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("../utils/push", () => ({
  isPushSupported: vi.fn(() => true),
  getExistingSubscription: vi.fn(() => Promise.resolve(null)),
  subscribeToPush: vi.fn(() => Promise.resolve({})),
  unsubscribeFromPush: vi.fn(() => Promise.resolve()),
}));
vi.mock("../utils/guestSession", () => ({ clearGuestSession: vi.fn() }));
const hookState = { canInstall: false, isInstalled: false, promptInstall: vi.fn() };
vi.mock("../utils/usePwaInstall", () => ({ usePwaInstall: () => hookState }));

import * as push from "../utils/push";
import { clearGuestSession } from "../utils/guestSession";
import HamburgerDrawer from "./HamburgerDrawer";

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

async function renderDrawer(props = {}) {
  const onClose = vi.fn();
  const result = render(
    <MemoryRouter initialEntries={["/chapters"]}>
      <HamburgerDrawer open onClose={onClose} grade="5" role="student" {...props} />
      <Where />
    </MemoryRouter>,
  );
  await act(async () => {}); // let the mount-time getExistingSubscription() settle
  const nav = result.container.querySelector("nav.drawer");
  return { ...result, nav, onClose };
}
const installIn = (root) => within(root).queryAllByRole("button", { name: "Install Learnova" });

beforeEach(() => {
  hookState.canInstall = false;
  hookState.isInstalled = false;
  hookState.promptInstall = vi.fn().mockResolvedValue("dismissed");
  push.isPushSupported.mockReturnValue(true);
  push.getExistingSubscription.mockResolvedValue(null);
  window.Notification = { requestPermission: vi.fn() };
});
afterEach(() => {
  delete window.Notification;
  vi.clearAllMocks();
});

describe("HamburgerDrawer: Install Learnova unavailable", () => {
  it("renders no install action and leaves the drawer exactly as before", async () => {
    const { nav } = await renderDrawer();
    expect(installIn(nav)).toHaveLength(0);
    expect(nav.querySelector(".install-app-btn")).toBeNull();
    const rows = [...nav.children].map((c) => c.textContent.trim());
    expect(rows).toEqual(["Menu✕", "Grade5", "👤 Profile", "🔔 Notifications: Off", "⎋ Logout"]);
  });
});

describe("HamburgerDrawer: Install Learnova available", () => {
  beforeEach(() => {
    hookState.canInstall = true;
  });

  it("shows exactly one install action, between Notifications and Logout", async () => {
    const { nav, container } = await renderDrawer();
    expect(installIn(container)).toHaveLength(1); // one per surface, no duplicate anywhere
    const rows = [...nav.children].map((c) => c.textContent.trim());
    expect(rows).toEqual([
      "Menu✕",
      "Grade5",
      "👤 Profile",
      "🔔 Notifications: Off",
      "Install Learnova",
      "⎋ Logout",
    ]);
  });

  it("uses the plain variant with the drawer's own row class (no pill chrome, no positioning)", async () => {
    const { nav } = await renderDrawer();
    const btn = installIn(nav)[0];
    expect(btn).toHaveClass("drawer__link", "drawer__link--install", "install-app-btn");
    expect(btn).not.toHaveClass("btn-primary");
    expect(btn).not.toHaveClass("btn-pill");
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).not.toHaveAttribute("style");
    expect(btn.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    // The parent adds no icon of its own: exactly one svg inside.
    expect(btn.querySelectorAll("svg")).toHaveLength(1);
  });

  it("keeps every existing link, including role-specific ones", async () => {
    const student = await renderDrawer({ role: "student" });
    expect(within(student.nav).getByRole("link", { name: /Profile/ })).toBeInTheDocument();
    expect(within(student.nav).queryByRole("link", { name: /Admin Panel/ })).toBeNull();
    student.unmount();

    const admin = await renderDrawer({ role: "admin" });
    expect(within(admin.nav).getByRole("link", { name: /Admin Panel/ })).toBeInTheDocument();
    expect(within(admin.nav).getByRole("link", { name: /Teacher Dashboard/ })).toBeInTheDocument();
    expect(installIn(admin.nav)).toHaveLength(1); // no role-specific install logic
  });

  it("clicking prompts exactly once, closes the drawer, and leaves notifications untouched", async () => {
    const user = userEvent.setup();
    const { nav, onClose } = await renderDrawer();
    await user.click(installIn(nav)[0]);
    expect(hookState.promptInstall).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push.subscribeToPush).not.toHaveBeenCalled();
    expect(push.unsubscribeFromPush).not.toHaveBeenCalled();
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    expect(screen.getByTestId("where")).toHaveTextContent("/chapters"); // no redirect
  });

  it("still appears when the browser has no push support (Notifications row absent)", async () => {
    push.isPushSupported.mockReturnValue(false);
    const { nav } = await renderDrawer();
    expect(within(nav).queryByRole("button", { name: /Notifications/ })).toBeNull();
    expect(installIn(nav)).toHaveLength(1);
  });
});

describe("HamburgerDrawer: existing behaviour unchanged", () => {
  it.each([false, true])("Notifications toggles on/off as before (install available: %s)", async (available) => {
    hookState.canInstall = available;
    const user = userEvent.setup();
    const { nav } = await renderDrawer();
    const notif = within(nav).getByRole("button", { name: /Notifications: Off/ });
    await user.click(notif);
    expect(push.subscribeToPush).toHaveBeenCalledTimes(1);
    expect(within(nav).getByRole("button", { name: /Notifications: On/ })).toBeInTheDocument();
    await user.click(within(nav).getByRole("button", { name: /Notifications: On/ }));
    expect(push.unsubscribeFromPush).toHaveBeenCalledTimes(1);
    expect(within(nav).getByRole("button", { name: /Notifications: Off/ })).toBeInTheDocument();
  });

  it("Notifications still surfaces permission errors in place", async () => {
    hookState.canInstall = true;
    push.subscribeToPush.mockRejectedValueOnce(new Error("Notification permission denied"));
    const user = userEvent.setup();
    const { nav } = await renderDrawer();
    await user.click(within(nav).getByRole("button", { name: /Notifications/ }));
    expect(within(nav).getByText("Notification permission denied")).toBeInTheDocument();
    expect(installIn(nav)).toHaveLength(1);
  });

  it.each([false, true])("Logout clears the session, closes the drawer and goes home (install available: %s)", async (available) => {
    hookState.canInstall = available;
    const user = userEvent.setup();
    const { nav, onClose } = await renderDrawer();
    await user.click(within(nav).getByRole("button", { name: /Logout/ }));
    expect(clearGuestSession).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("where")).toHaveTextContent("/");
    expect(screen.getByTestId("where").textContent).toBe("/");
  });
});

// Task 5: placement of <InstallAppButton /> in PublicHome. The install state
// itself is mocked at the hook boundary (see pwaInstall.test.jsx /
// InstallAppButton*.test.jsx for the singleton + component behaviour).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
const hookState = { canInstall: false, isInstalled: false, promptInstall: vi.fn() };
vi.mock("../utils/usePwaInstall", () => ({ usePwaInstall: () => hookState }));

import api from "../api/axios";
import PublicHome from "./PublicHome";
import { ThemeProvider } from "../context/themeContext";

// Async so PublicHome's mount-time /public/standards fetch settles inside act().
async function renderHome() {
  // PublicHome's header reads the global theme (Global Theme feature), so
  // it must be rendered inside ThemeProvider, as main.jsx does in the app.
  const result = render(
    <ThemeProvider>
      <MemoryRouter>
        <PublicHome />
      </MemoryRouter>
    </ThemeProvider>,
  );
  await act(async () => {});
  return result;
}
const installButtons = (root) =>
  within(root).queryAllByRole("button", { name: "Install Learnova", hidden: true });

beforeEach(() => {
  localStorage.clear();
  hookState.canInstall = false;
  hookState.isInstalled = false;
  hookState.promptInstall = vi.fn().mockResolvedValue("dismissed");
  api.get.mockImplementation((url) =>
    Promise.resolve({ data: url === "/public/standards" ? { standards: [] } : {} }),
  );
  window.Notification = { requestPermission: vi.fn() };
});
afterEach(() => {
  delete window.Notification;
  vi.clearAllMocks();
});

describe("PublicHome: Install Learnova unavailable", () => {
  it("renders no install action anywhere", async () => {
    const { container } = await renderHome();
    expect(installButtons(container)).toHaveLength(0);
    expect(container.querySelector(".install-app-btn")).toBeNull();
  });

  it("leaves the header actions exactly as before: no wrapper, no spacer", async () => {
    const { container } = await renderHome();
    const actions = container.querySelector(".ph-header__actions");
    expect([...actions.children].map((c) => c.tagName)).toEqual(["A", "A", "A"]);
    expect(within(actions).getByRole("link", { name: "Teacher Portal" })).toBeInTheDocument();
    expect(within(actions).getByRole("link", { name: "Admin Portal" })).toBeInTheDocument();
    expect(within(actions).getByRole("link", { name: "Sign In" })).toBeInTheDocument();
  });

  it("leaves the mobile menu exactly as before (Sign In stays the last row)", async () => {
    const { container } = await renderHome();
    const menu = container.querySelector(".ph-drawer");
    expect(menu.lastElementChild.tagName).toBe("A");
    expect(menu.lastElementChild).toHaveTextContent("Sign In");
  });
});

describe("PublicHome: Install Learnova available", () => {
  beforeEach(() => {
    hookState.canInstall = true;
  });

  it("shows exactly one install action in the desktop header actions, before the primary Sign In", async () => {
    const { container } = await renderHome();
    const actions = container.querySelector(".ph-header__actions");
    const buttons = installButtons(actions);
    expect(buttons).toHaveLength(1);
    expect([...actions.children].map((c) => c.tagName)).toEqual(["A", "A", "BUTTON", "A"]);
    expect(actions.lastElementChild).toHaveTextContent("Sign In"); // primary action stays last
    expect(buttons[0]).toHaveClass("btn-primary", "btn-pill", "ph-header__install");
    expect(buttons[0]).toHaveAttribute("type", "button");
    expect(buttons[0]).not.toHaveAttribute("style"); // no fixed/floating positioning
  });

  it("shows exactly one install action in the mobile menu, at the end of the Account group", async () => {
    const { container } = await renderHome();
    const menu = container.querySelector(".ph-drawer");
    const buttons = installButtons(menu);
    expect(buttons).toHaveLength(1);
    expect(menu.lastElementChild).toBe(buttons[0]);
    expect(buttons[0]).toHaveClass("ph-drawer__link", "ph-drawer__link--install");
    expect(buttons[0]).not.toHaveClass("btn-primary");
    expect(within(menu).getByRole("link", { name: "Sign In", hidden: true })).toBeInTheDocument();
  });

  it("has one action per surface (header + mobile menu) and never a third copy", async () => {
    const { container } = await renderHome();
    expect(installButtons(container)).toHaveLength(2);
    // Not in the hero/sections/footer.
    const main = container.querySelector(".ph-header, .public-home");
    expect(main).not.toBeNull();
    for (const el of installButtons(container)) {
      expect(el.closest(".ph-header__actions, .ph-drawer")).not.toBeNull();
    }
  });

  it("keeps all existing header navigation and actions", async () => {
    const { container } = await renderHome();
    const header = container.querySelector(".ph-header");
    const nav = header.querySelector(".ph-header__nav");
    expect(nav).toHaveTextContent("Play");
    expect(nav).toHaveTextContent("How It Works");
    expect(nav).toHaveTextContent("About");
    const actions = header.querySelector(".ph-header__actions");
    for (const name of ["Teacher Portal", "Admin Portal", "Sign In"]) {
      expect(within(actions).getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("logged-in visitors: install sits next to My Dashboard, which stays last", async () => {
    localStorage.setItem("token", "real-user-token");
    const { container } = await renderHome();
    const actions = container.querySelector(".ph-header__actions");
    expect(installButtons(actions)).toHaveLength(1);
    expect(actions.lastElementChild).toHaveTextContent("My Dashboard");
  });

  it("desktop click prompts once and requests no notification permission", async () => {
    const user = userEvent.setup();
    const { container } = await renderHome();
    await user.click(installButtons(container.querySelector(".ph-header__actions"))[0]);
    expect(hookState.promptInstall).toHaveBeenCalledTimes(1);
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });

  it("mobile-menu click prompts once and then closes the menu", async () => {
    const user = userEvent.setup();
    const { container } = await renderHome();
    await user.click(container.querySelector(".ph-header__hamburger"));
    const menu = container.querySelector(".ph-drawer");
    expect(menu).toHaveClass("ph-drawer--open");
    await user.click(installButtons(menu)[0]);
    expect(hookState.promptInstall).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(menu).not.toHaveClass("ph-drawer--open"));
  });
});

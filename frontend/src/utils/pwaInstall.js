// Learnova install-prompt singleton (framework-free, no React).
//
// Why a module singleton instead of a component effect: Chromium fires
// `beforeinstallprompt` once, whenever it decides the app is installable,
// which can be BEFORE any React component mounts. main.jsx therefore calls
// initPwaInstall() before rendering, and React only *reads* the state via
// usePwaInstall(). Any number of components can consume it; there is exactly
// one set of global listeners.
//
// This module never shows a prompt by itself, never requests notification
// permission, and never touches the service worker. The prompt is only shown
// when promptInstall() is called from a user gesture (the Task 4 button).

const DISMISSED_KEY = "learnova.pwa.installDismissed";
const STANDALONE_QUERY = "(display-mode: standalone)";

// The one and only deferred `beforeinstallprompt` event. It is single-use:
// prompt() can be called once, so it is cleared the moment it is consumed.
let deferredEvent = null;
let installed = false; // set by `appinstalled` or an accepted prompt
let standalone = false; // currently running as an installed app
let dismissed = false; // user dismissed the native dialog this session

let state = { canInstall: false, isInstalled: false, dismissed: false };
const listeners = new Set();

let teardown = null; // non-null once initPwaInstall() has attached listeners

function readStandalone() {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia && window.matchMedia(STANDALONE_QUERY).matches) return true;
  } catch {
    // matchMedia can throw in unusual embedded webviews; treat as "not standalone".
  }
  // iOS Safari home-screen apps expose navigator.standalone instead of the media query.
  return typeof navigator !== "undefined" && navigator.standalone === true;
}

// Recompute the public snapshot and notify subscribers ONLY if something
// actually changed, keeping the snapshot object referentially stable
// (required by useSyncExternalStore).
function recompute() {
  const isInstalled = installed || standalone;
  const next = {
    canInstall: deferredEvent !== null && !isInstalled && !dismissed,
    isInstalled,
    dismissed,
  };
  if (
    next.canInstall === state.canInstall &&
    next.isInstalled === state.isInstalled &&
    next.dismissed === state.dismissed
  ) {
    return;
  }
  state = next;
  listeners.forEach((listener) => listener());
}

function readDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false; // storage blocked: fall back to in-memory only
  }
}

function writeDismissed() {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // ignore: the in-memory `dismissed` flag still applies for this page load
  }
}

/**
 * Attaches the global listeners exactly once (idempotent). Safe to call from
 * anywhere, any number of times, and a no-op outside a browser.
 */
export function initPwaInstall() {
  if (typeof window === "undefined" || teardown) return;

  standalone = readStandalone();
  dismissed = readDismissed();

  const onBeforeInstallPrompt = (event) => {
    // Stop the browser's own mini-infobar/dialog: Learnova decides when to ask.
    event.preventDefault();
    deferredEvent = event; // a newer event replaces any older one
    recompute();
  };

  const onAppInstalled = () => {
    deferredEvent = null;
    installed = true;
    recompute();
  };

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);

  // Keep `standalone` live (e.g. the app is installed and opened in another
  // window, or the display mode changes).
  let mql = null;
  const onDisplayModeChange = () => {
    standalone = readStandalone();
    recompute();
  };
  try {
    mql = window.matchMedia ? window.matchMedia(STANDALONE_QUERY) : null;
    if (mql?.addEventListener) mql.addEventListener("change", onDisplayModeChange);
    else if (mql?.addListener) mql.addListener(onDisplayModeChange); // older Safari
  } catch {
    mql = null;
  }

  teardown = () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onAppInstalled);
    if (mql?.removeEventListener) mql.removeEventListener("change", onDisplayModeChange);
    else if (mql?.removeListener) mql.removeListener(onDisplayModeChange);
    teardown = null;
  };

  recompute(); // reflect standalone/dismissed state immediately
}

/** useSyncExternalStore contract. */
export function subscribe(listener) {
  initPwaInstall(); // safety net; normally already initialised by main.jsx
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return state;
}

/**
 * Shows the native install dialog. MUST be called from a user gesture.
 *
 * Resolves (never rejects) with one of:
 *   "accepted"    user installed the app
 *   "dismissed"   user closed the dialog (button hides for this session)
 *   "unavailable" no usable deferred event (unsupported, installed, dismissed, or already consumed)
 *   "error"       the browser refused prompt(); the event is treated as consumed
 */
export async function promptInstall() {
  const event = deferredEvent;
  if (!event || !state.canInstall) return "unavailable";

  // prompt() is single-use: consume the event up front so a double-click or
  // a second consumer can never reuse it.
  deferredEvent = null;
  recompute();

  try {
    Promise.resolve(event.prompt()).catch(() => {}); // outcome comes from userChoice
    const choice = await event.userChoice;
    if (choice?.outcome === "accepted") {
      installed = true;
      recompute();
      return "accepted";
    }
    // Dismissed: hide the action for this session so we neither nag nor
    // re-show it instantly if the browser fires a fresh event afterwards.
    dismissed = true;
    writeDismissed();
    recompute();
    return "dismissed";
  } catch {
    return "error";
  }
}

/** Detaches every global listener. Used by HMR and tests. */
export function teardownPwaInstall() {
  if (teardown) teardown();
}

/** Test helper: clears all module state and listeners. */
export function __resetPwaInstallForTests() {
  teardownPwaInstall();
  deferredEvent = null;
  installed = false;
  standalone = false;
  dismissed = false;
  state = { canInstall: false, isInstalled: false, dismissed: false };
  listeners.clear();
}

// Vite HMR: drop this module instance's window listeners before the module is
// re-evaluated, so a hot update can't leave duplicate global listeners behind.
if (import.meta.hot) {
  import.meta.hot.dispose(() => teardownPwaInstall());
}

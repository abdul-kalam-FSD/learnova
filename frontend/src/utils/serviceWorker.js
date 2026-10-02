// Single place that registers Learnova's one and only service worker.
//
// /sw.js (public/sw.js) currently only handles Web Push (`push` and
// `notificationclick`). It does no caching and intercepts no requests.
// Registration used to happen lazily inside push.js, which only ran once
// the authenticated HamburgerDrawer mounted, so public routes ("/",
// "/login") never had a service worker. It is now registered from one
// shared helper, early, on every route.
//
// Registering a service worker is NOT the same as subscribing to push:
// nothing here asks for notification permission or creates a push
// subscription. That stays user-initiated in push.js (subscribeToPush).

export const SW_URL = "/sw.js";
export const SW_SCOPE = "/";

let registrationPromise = null;

export function isServiceWorkerSupported() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Registers /sw.js (scope "/") once per page load and returns the same
 * promise to every caller, so push.js and the early startup call can never
 * race into two registrations.
 *
 * Never rejects: resolves with the ServiceWorkerRegistration, or with null
 * if service workers are unsupported or registration failed (e.g. private
 * browsing modes, insecure context). Callers decide how to treat null.
 */
export function registerServiceWorker() {
  if (!isServiceWorkerSupported()) return Promise.resolve(null);

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register(SW_URL, { scope: SW_SCOPE })
      .catch((err) => {
        // Allow a later caller to retry, and never let this surface as an
        // unhandled rejection that could break app startup.
        registrationPromise = null;
        console.warn("Learnova: service worker registration failed", err);
        return null;
      });
  }
  return registrationPromise;
}

/**
 * Startup helper: registers after the page has finished loading so the
 * (tiny) registration never competes with first paint / initial bundle.
 */
export function registerServiceWorkerOnLoad() {
  if (!isServiceWorkerSupported()) return;
  if (document.readyState === "complete") {
    registerServiceWorker();
  } else {
    window.addEventListener("load", () => registerServiceWorker(), { once: true });
  }
}

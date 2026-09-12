import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia — polyfill it so components that
// check prefers-reduced-motion (e.g. useScrollReveal) don't throw when
// mounted under test. This mirrors what a real browser provides; it's
// a test-environment gap, not app behavior being changed.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Same reasoning as matchMedia above — jsdom has no real layout, so it
// doesn't implement IntersectionObserver either. useScrollReveal (the
// "fade in on scroll" hook used across the public landing page) uses
// it directly; without a stub, mounting PublicHome under test throws.
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

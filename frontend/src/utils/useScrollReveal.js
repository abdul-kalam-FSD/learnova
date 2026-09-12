// Lightweight scroll-reveal: fades/slides sections in as they enter the
// viewport. Deliberately dependency-free (no framer-motion etc.) to match
// the rest of the app's pure-CSS animation approach (see PublicHome.css's
// ph-float keyframes). Applies to any element with the `ph-reveal` class;
// each element gets `is-visible` added once and is then left alone, so
// scrolling back up never re-hides content.
//
// Respects prefers-reduced-motion by doing nothing — the CSS rule for
// that media query already renders `.ph-reveal` fully visible with no
// transition, so an observer isn't even needed in that case.
import { useEffect } from "react";

export function useScrollReveal(containerRef, deps = []) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = containerRef?.current || document;
    const targets = root.querySelectorAll(".ph-reveal:not(.is-visible)");
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

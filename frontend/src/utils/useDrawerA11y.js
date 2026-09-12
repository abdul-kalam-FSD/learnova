import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibility behavior for off-canvas drawers/nav panels (hamburger menus,
 * mobile nav, etc.). Handles what CSS-only slide transforms miss:
 *
 *  - Removes the closed panel from the tab order and the a11y tree via
 *    `inert` (falls back to `aria-hidden` for older browsers/AT).
 *  - Moves focus into the panel when it opens, and back to whatever
 *    triggered it (e.g. the hamburger button) when it closes.
 *  - Escape closes the panel.
 *  - Tab / Shift+Tab wrap within the panel while it's open, so focus can't
 *    leak to the page behind it.
 *
 * @param {React.RefObject<HTMLElement>} panelRef - ref on the drawer/nav element
 * @param {boolean} open
 * @param {() => void} onClose
 */
export function useDrawerA11y(panelRef, open, onClose) {
  const previouslyFocusedRef = useRef(null);

  // Move focus in on open; restore it on close.
  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    const node = panelRef.current;
    if (node) {
      const firstFocusable = node.querySelector(FOCUSABLE_SELECTOR);
      (firstFocusable || node).focus();
    }

    return () => {
      if (previouslyFocusedRef.current && previouslyFocusedRef.current.focus) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [open, panelRef]);

  // Escape-to-close and focus trapping while open.
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const node = panelRef.current;
      if (!node) return;

      const focusable = Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose, panelRef]);
}

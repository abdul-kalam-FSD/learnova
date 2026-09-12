import { useEffect, useId, useRef } from "react";
import "../Admin.css";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useId();

  // Move focus into the dialog on open, restore it to the trigger on close.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;

    const node = dialogRef.current;
    if (node) {
      const firstFocusable = node.querySelector(FOCUSABLE_SELECTOR);
      (firstFocusable || node).focus();
    }

    return () => {
      if (previouslyFocusedRef.current && previouslyFocusedRef.current.focus) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, []);

  // Escape-to-close and focus trapping (Tab / Shift+Tab wrap within the dialog).
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const node = dialogRef.current;
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
  }, [onClose]);

  return (
    <div className="admin-modal__backdrop" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal__header">
          <p className="admin-modal__title" id={titleId}>
            {title}
          </p>
          <button className="admin-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="admin-modal__body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;

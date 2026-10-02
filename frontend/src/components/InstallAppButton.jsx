import { useRef, useState } from "react";
import { usePwaInstall } from "../utils/usePwaInstall";
import "../InstallAppButton.css";

const LABEL = "Install Learnova";

// Inline SVG (the project has no icon library). Decorative only: the visible
// text is the button's accessible name, so the icon is hidden from AT.
function InstallIcon() {
  return (
    <svg
      className="install-app-btn__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

/**
 * "Install Learnova" action. Renders NOTHING unless the browser is currently
 * holding a usable install prompt (usePwaInstall().canInstall), so it never
 * shows in unsupported browsers, inside the installed app, after install, or
 * after the user dismissed the dialog this session.
 *
 * It has no positioning of its own; the parent decides placement.
 *
 * Props
 *   variant    "pill" (default): Learnova's primary pill button, for headers
 *              "plain": no visual styling of its own; style it entirely via
 *              `className` (e.g. reuse a drawer link class)
 *   className  extra classes, appended after the component's own
 *   onResult   optional (outcome) => void, called after the prompt settles with
 *              "accepted" | "dismissed" | "unavailable" | "error"
 *              (e.g. so a drawer can close itself)
 */
function InstallAppButton({ variant = "pill", className = "", onResult }) {
  const { canInstall, promptInstall } = usePwaInstall();
  // The ref blocks a second click in the same tick, before React re-renders
  // with `pending`; the state drives the disabled attribute.
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);

  if (!canInstall) return null;

  const handleClick = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);

    let outcome;
    try {
      outcome = await promptInstall();
    } catch {
      outcome = "error"; // promptInstall() shouldn't reject; never crash if it does
    } finally {
      inFlight.current = false;
      setPending(false);
    }

    if (outcome === "error") {
      console.warn("Learnova: the install prompt could not be shown.");
    }
    // "accepted" deliberately shows nothing extra: the `appinstalled` event
    // (handled by the singleton, which hides this button) is the real signal.
    onResult?.(outcome);
  };

  const classes = [
    "install-app-btn",
    variant === "plain" ? "" : "btn-primary btn-pill install-app-btn--pill",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classes} onClick={handleClick} disabled={pending}>
      <InstallIcon />
      <span>{LABEL}</span>
    </button>
  );
}

export default InstallAppButton;

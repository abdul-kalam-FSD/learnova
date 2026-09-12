import "../GameUI.css";

/**
 * Horizontal progress bar. `value`/`max` define the fill percentage.
 * variant: "primary" | "xp" | "accent" controls the fill color.
 */
function ProgressBar({ value = 0, max = 100, variant = "primary", height = 8 }) {
  const safeMax = max > 0 ? max : 100;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div
      className="progress-bar"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`progress-bar__fill progress-bar__fill--${variant}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default ProgressBar;
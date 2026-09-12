import "../GameUI.css";

/**
 * Small pill chip for a single stat (streak, XP, coins, etc).
 * variant controls the accent color used for the value text.
 */
function StatChip({ icon, value, variant = "default", label }) {
  return (
    <span className={`stat-chip stat-chip--${variant}`} aria-label={label}>
      <span className="stat-chip__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="stat-chip__value">{value}</span>
    </span>
  );
}

export default StatChip;
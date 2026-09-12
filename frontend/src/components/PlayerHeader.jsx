import StatChip from "./StatChip";
import "../GameUI.css";

/**
 * Compact player-stat strip (Level, XP-to-next-level, Streak) used at
 * the top of game-world pages (Subject World, Subject Chapters).
 * Deliberately reuses StatChip and getLevelProgress's own output —
 * same numbers Home.jsx's header already shows, computed the same
 * way, so a student never sees two different "Level" values for the
 * same XP total depending on which page they're on. Global branding
 * and the streak flame already live in the app's top header
 * (MobileHeader) — this adds the level/XP context that header omits.
 */
function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function PlayerHeader({ name, level, xpIntoLevel, xpPerLevel, levelPct, streak }) {
  return (
    <div className="world-player-header mb-4">
      {name && (
        <div className="world-player-header__identity">
          <span className="world-player-header__avatar" aria-hidden="true">
            {initials(name)}
          </span>
          <span className="world-player-header__name">{name}</span>
        </div>
      )}
      <div className="world-player-header__chips">
        <StatChip icon="🎖️" value={`Lv ${level}`} variant="default" label="Level" />
        <StatChip icon="⚡" value={`${xpIntoLevel}/${xpPerLevel} XP`} variant="xp" label="XP to next level" />
        {typeof streak === "number" && streak > 0 && (
          <StatChip icon="🔥" value={streak} variant="default" label="Day streak" />
        )}
      </div>
      <div
        className="world-player-header__track"
        role="progressbar"
        aria-valuenow={levelPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Level progress"
      >
        <div className="world-player-header__fill" style={{ width: `${levelPct}%` }} />
      </div>
    </div>
  );
}

export default PlayerHeader;

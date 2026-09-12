import "../GameUI.css";

/**
 * Generic tappable row card: icon + eyebrow/title/subtitle + arrow.
 * Renders as a <button> when onClick is given, otherwise a <div>.
 */
function GameCard({
  icon,
  eyebrow,
  title,
  subtitle,
  onClick,
  arrow = true,
  className = "",
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`game-card ${onClick ? "game-card--clickable" : ""} ${className}`}
    >
      {icon && (
        <div className="game-card__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="game-card__body">
        {eyebrow && <span className="game-card__eyebrow">{eyebrow}</span>}
        {title && <p className="game-card__title">{title}</p>}
        {subtitle && <p className="game-card__subtitle">{subtitle}</p>}
      </div>
      {arrow && onClick && (
        <span className="game-card__arrow" aria-hidden="true">
          →
        </span>
      )}
    </Tag>
  );
}

export default GameCard;
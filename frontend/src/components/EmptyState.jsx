import "../GameUI.css";

function EmptyState({ icon = "✨", title, subtitle, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      {title && <p className="empty-state__title">{title}</p>}
      {subtitle && <p className="empty-state__subtitle">{subtitle}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export default EmptyState;
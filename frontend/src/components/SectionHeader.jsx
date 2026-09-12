import "../GameUI.css";

function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <h3 className="section-header__title">{title}</h3>
      {action}
    </div>
  );
}

export default SectionHeader;
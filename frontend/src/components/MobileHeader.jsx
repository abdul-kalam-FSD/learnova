import { Link } from "react-router-dom";
import { useTheme } from "../context/themeContext";
import "../Shell.css";
function MobileHeader({ onMenuClick, streak = 0 }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="app-header">
      <button
        className="icon-btn"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <span aria-hidden="true">☰</span>
      </button>

      <Link to="/" className="app-header__brand" aria-label="Learnova home">
        <span className="app-header__brand-icon" aria-hidden="true">
          🎓
        </span>
        <span className="app-header__brand-text">Learnova</span>
      </Link>

      <div className="app-header__right">
        <button
          className="icon-btn"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span aria-hidden="true">{isDark ? "🌙" : "☀️"}</span>
        </button>
        <span className="app-header__streak" aria-label={`${streak} day streak`}>
          <span aria-hidden="true">🔥</span> {streak}
        </span>
      </div>
    </header>
  );
}

export default MobileHeader;
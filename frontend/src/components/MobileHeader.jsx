import { Link } from "react-router-dom";
import { useTheme } from "../context/themeContext";
import { THEME_META } from "./ThemeSwitcher";
import "../Shell.css";
function MobileHeader({ onMenuClick, streak = 0 }) {
  const { theme, cycleTheme, themes } = useTheme();
  const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];

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
          onClick={cycleTheme}
          aria-label={`Switch to ${THEME_META[nextTheme].label} theme`}
        >
          <span aria-hidden="true">{THEME_META[theme].icon}</span>
        </button>
        <span className="app-header__streak" aria-label={`${streak} day streak`}>
          <span aria-hidden="true">🔥</span> {streak}
        </span>
      </div>
    </header>
  );
}

export default MobileHeader;
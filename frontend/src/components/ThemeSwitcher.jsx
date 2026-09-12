import { useTheme } from "../context/themeContext";

const THEME_META = {
  light: { label: "Light", icon: "☀️" },
  dark: { label: "Dark", icon: "🌙" },
  forest: { label: "Forest", icon: "🌲" },
  galaxy: { label: "Galaxy", icon: "🌌" },
};

function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="theme-switcher">
      <h3 className="theme-switcher__title">App Theme</h3>
      <p className="theme-switcher__subtitle">Customize your experience</p>
      <div className="theme-switcher__grid">
        {themes.map((t) => {
          const meta = THEME_META[t];
          const isActive = theme === t;
          return (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`theme-option${isActive ? " theme-option--active" : ""}`}
            >
              <span className="theme-option__icon">{meta.icon}</span>
              <span className="theme-option__label">{meta.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ThemeSwitcher;
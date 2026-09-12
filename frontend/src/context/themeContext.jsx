import { createContext, useContext, useEffect, useState } from "react";

const THEMES = ["light", "dark", "forest", "galaxy"];
const STORAGE_KEY = "leveled_theme";

const ThemeContext = createContext(null);

function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && THEMES.includes(saved)) return saved;
  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (next) => {
    if (!THEMES.includes(next)) return;
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Small hook colocated with its provider; splitting into another file
// isn't worth the indirection for a project this size.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ThemeProvider } from "./context/themeContext.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import "./index.css";
import { registerServiceWorkerOnLoad } from "./utils/serviceWorker";
import { initPwaInstall } from "./utils/pwaInstall";

// Attach the `beforeinstallprompt` / `appinstalled` listeners BEFORE React
// renders: the browser can fire the event before any component mounts.
// This only captures the event; it never shows a prompt.
initPwaInstall();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
);

// Register the single /sw.js early on every route (public, login, app).
// This does NOT request notification permission or subscribe to push.
registerServiceWorkerOnLoad();

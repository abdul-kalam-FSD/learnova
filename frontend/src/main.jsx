import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ThemeProvider } from "./context/themeContext.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import "./index.css";

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
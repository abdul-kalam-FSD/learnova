import { Component, Suspense } from "react";
import { GamePage, GamePanel } from "./GameShell";

// Shown while a game's JS chunk is still downloading (Section 4/9 of
// the completion spec: code-split the 27 games so login/home don't
// ship the whole catalog, but never leave the student staring at a
// blank screen while the chunk for the game they tapped loads in).
// Reuses GamePage/GamePanel so it matches the same chrome the game
// itself will render into a moment later, instead of a jarring
// full-page spinner.
function GameLoadingFallback() {
  return (
    <GamePage>
      <GamePanel>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div
            className="h-10 w-10 rounded-full border-4 border-current border-t-transparent animate-spin"
            style={{ color: "var(--primary-color)" }}
            role="status"
            aria-label="Loading"
          />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary, inherit)" }}>
            Preparing your challenge...
          </p>
        </div>
      </GamePanel>
    </GamePage>
  );
}

// Catches a failed dynamic import (e.g. the student's connection
// drops mid-download, or a stale deployed index.html references a
// chunk hash that no longer exists on the server) so it degrades to
// a retry screen instead of an uncaught error taking down the whole
// app. React error boundaries must be class components — there is
// no hook equivalent for componentDidCatch.
class LazyLoadErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Game module failed to load:", error);
  }

  handleRetry = () => {
    // A fresh reload re-requests index.html + current chunk hashes,
    // which resolves the stale-deployment case; a plain state reset
    // would keep retrying the same broken import reference.
    window.location.reload();
  };

  render() {
    if (this.state.failed) {
      return (
        <GamePage>
          <GamePanel>
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-sm font-medium">
                This game couldn't load. Check your connection and try again.
              </p>
              <button
                onClick={this.handleRetry}
                className="btn-primary px-4 py-2 rounded-lg font-semibold text-sm"
              >
                Retry
              </button>
            </div>
          </GamePanel>
        </GamePage>
      );
    }
    return this.props.children;
  }
}

// Single wrap point used around every lazy-loaded game route, so
// App.jsx's route list doesn't repeat the same Suspense+ErrorBoundary
// pair 27 times.
export function LazyGameBoundary({ children }) {
  return (
    <LazyLoadErrorBoundary>
      <Suspense fallback={<GameLoadingFallback />}>{children}</Suspense>
    </LazyLoadErrorBoundary>
  );
}

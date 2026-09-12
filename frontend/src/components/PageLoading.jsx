// Shared loading state for top-level pages (Home, Chapters, Progress,
// Profile, the Practice hub, etc). Mirrors GameLoadingState's spinner
// in games/core/GameShell.jsx, which already solved this for the
// in-game loading screens — this is the same pattern for everything
// *outside* the Game Shell, since those pages previously each had
// their own unstyled `<p>Loading...</p>` with no spinner and a
// different one-off class name per page.
function PageLoading({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center min-h-[40vh]">
      <div
        className="h-10 w-10 rounded-full border-4 border-current border-t-transparent animate-spin"
        style={{ color: "var(--primary-color)" }}
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
    </div>
  );
}

export default PageLoading;

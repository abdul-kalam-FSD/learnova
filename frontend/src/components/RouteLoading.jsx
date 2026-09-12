// Shown while AdminRoute/TeacherRoute is verifying the user's role
// against /auth/me. Previously these routes returned `null` here,
// which meant a blank white screen for a moment on every admin/
// teacher page load (Part 14 of the redesign spec: no blank screens).
function RouteLoading({ label = "Checking access..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
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

export default RouteLoading;

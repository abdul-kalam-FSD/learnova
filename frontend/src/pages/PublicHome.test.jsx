import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import PublicHome from "./PublicHome";
import { ThemeProvider } from "../context/themeContext";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

// PublicHome's header now reads the global theme (Global Theme feature:
// the cycle-theme toggle button), exactly like MobileHeader does on the
// authenticated pages — so it must be rendered inside ThemeProvider, as
// main.jsx does in the real app and as Profile.test.jsx /
// App.routing.test.jsx already do.
function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <PublicHome />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// PublicHome.jsx had no test file before the Task 2 defensive-guards
// work. Deliberately scoped narrow here — only the /progress
// mastery-overlay regression this task is about — not a full test
// suite for this ~850-line page, which is a separate, much larger
// effort outside this task's approved scope.
describe("PublicHome progress overlay (Task 2 defensive guards)", () => {
  test("a returning (logged-in) visitor does not crash when /progress returns a malformed chapters field", async () => {
    localStorage.setItem("token", "fake.token");
    api.get.mockImplementation((url) => {
      if (url === "/public/standards") return Promise.resolve({ data: { standards: [] } });
      if (url === "/progress") return Promise.resolve({ data: { chapters: "not-an-array" } });
      return Promise.reject({ response: { status: 404 } });
    });

    renderPage();

    // The page renders past the point where the old bare
    // `for (const ch of res.data.chapters || [])` would have thrown
    // on a non-array, non-nullish value — proven by a heading further
    // down the page still appearing, not by an error boundary fallback.
    await waitFor(() => {
      expect(screen.getByText("SUBJECTS YOU CAN PLAY")).toBeInTheDocument();
    });
  });

  test("a returning (logged-in) visitor does not crash when a chapter entry is missing its breakdown", async () => {
    localStorage.setItem("token", "fake.token");
    api.get.mockImplementation((url) => {
      if (url === "/public/standards") return Promise.resolve({ data: { standards: [] } });
      if (url === "/progress") {
        return Promise.resolve({
          data: {
            chapters: [
              { chapter_id: "c1", total_concepts: 4 }, // malformed: no breakdown
            ],
          },
        });
      }
      return Promise.reject({ response: { status: 404 } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("SUBJECTS YOU CAN PLAY")).toBeInTheDocument();
    });
  });

  test("a brand-new visitor (no token) never calls /progress at all", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/public/standards") return Promise.resolve({ data: { standards: [] } });
      return Promise.reject({ response: { status: 404 } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("SUBJECTS YOU CAN PLAY")).toBeInTheDocument();
    });
    expect(api.get).not.toHaveBeenCalledWith("/progress");
  });
});

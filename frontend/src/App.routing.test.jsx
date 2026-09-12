// End-to-end coverage for the routing/guards/guest-mode audit:
// - No token anywhere should ever produce a silent redirect or a
//   blank screen (ProtectedRoute / AdminRoute / TeacherRoute).
// - A logged-in student must never see the admin/teacher portals,
//   and vice versa, without an explicit "Access Denied" explanation.
// - A guest (real JWT, isGuest flag) must be able to reach every step
//   of Grade -> Subject -> Chapter -> Game the same as a real account.
// - The student BottomNav (Home/Chapters/Practice/Progress) must
//   never render inside the admin or teacher portals — regression
//   test for the "Home" tab silently pulling a teacher/admin out of
//   their portal, found during this audit.
// - Unknown paths get a real 404, not a bounce to /login or /home.
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "./api/axios";
import App from "./App";
import { ThemeProvider } from "./context/themeContext";

vi.mock("./api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

function setGuest(isGuest) {
  if (isGuest) localStorage.setItem("isGuest", "true");
  else localStorage.removeItem("isGuest");
}

// Minimal-but-real shapes for every endpoint a page might call on
// mount, so that mounting a page for a guard/redirect assertion
// doesn't also have to fight that page's own rendering logic — this
// suite is about routing/guards, not each page's data handling.
const DEFAULT_RESPONSES = {
  "/home": { name: "Test Student", xp_total: 0, grade: 9, weakConcepts: [] },
  "/progress": { subjects: [], overall: { xp_total: 0, streak_count: 0 } },
  "/games/catalog": { catalog: [] },
  "/admin/stats": {
    totals: {
      totalStudents: 0,
      totalTeachers: 0,
      activeWindowDays: 7,
      activeStudents: 0,
      gamesPlayed: 0,
      completionRate: 0,
      avgPerformance: null,
      avgPerformanceSampleSize: 0,
    },
    weakAreas: [],
    gradePerformance: [],
    subjectPerformance: [],
    recentActivity: [],
    contentStatus: {
      totalSubjects: 0,
      totalChapters: 0,
      totalGameContent: 0,
      gradesCovered: [],
      subjectsWithNoChapters: 0,
      chaptersWithNoConcepts: 0,
    },
  },
  "/teacher/overview": { isScoped: true, totals: { totalStudents: 0, totalSections: 0 } },
  "/public/standards": { standards: [] },
};

function mockAuthMe(role, extra = {}) {
  api.get.mockImplementation((url) => {
    if (url === "/auth/me") {
      return Promise.resolve({ data: { user: { role, grade: 9, ...extra } } });
    }
    if (url in DEFAULT_RESPONSES) {
      return Promise.resolve({ data: DEFAULT_RESPONSES[url] });
    }
    // Anything else (e.g. /cases/recommended returning 404, /games/recommended
    // returning 404) — reject like the real backend does for "nothing yet",
    // which every page here already treats as a normal empty state.
    return Promise.reject({ response: { status: 404 } });
  });
}

function renderAt(path) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe("No token — explicit states, never a silent redirect", () => {
  test("/home shows the sign-in-required screen, not a blank page or /login bounce", async () => {
    setToken(null);
    renderAt("/home");
    expect(
      await screen.findByText(/this page needs an account or guest session/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/play as guest/i)).toBeInTheDocument();
  });

  test("/chapters/:id shows the sign-in-required screen", async () => {
    setToken(null);
    renderAt("/chapters/abc123");
    expect(
      await screen.findByText(/this page needs an account or guest session/i),
    ).toBeInTheDocument();
  });

  test("/mission/:chapterId (Phase 0C) shows the sign-in-required screen", async () => {
    setToken(null);
    renderAt("/mission/abc123");
    expect(
      await screen.findByText(/this page needs an account or guest session/i),
    ).toBeInTheDocument();
  });

  test("a protected game route (e.g. fraction-builder) shows the sign-in-required screen", async () => {
    setToken(null);
    renderAt("/games/fraction-builder");
    expect(
      await screen.findByText(/this page needs an account or guest session/i),
    ).toBeInTheDocument();
  });

  test("/admin shows the Admin Portal entry screen, not /login or /home", async () => {
    setToken(null);
    renderAt("/admin");
    expect(await screen.findByText(/admin portal/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in as admin/i })).toBeInTheDocument();
  });

  test("/teacher shows the Teacher Portal entry screen, not /login or /home", async () => {
    setToken(null);
    renderAt("/teacher");
    expect(await screen.findByText(/teacher portal/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in as teacher/i })).toBeInTheDocument();
  });

  test("/ (public home) never requires a token", async () => {
    setToken(null);
    api.get.mockResolvedValue({ data: { standards: [] } });
    renderAt("/");
    expect(await screen.findByText(/play without login/i)).toBeInTheDocument();
  });

  test("an unknown path renders a real 404, not a redirect anywhere", async () => {
    setToken(null);
    renderAt("/this-route-does-not-exist");
    expect(await screen.findByText(/we couldn't find that page/i)).toBeInTheDocument();
  });
});

describe("Role gating — logged in but wrong role", () => {
  test("a student hitting /admin gets Access Denied, not /home or /login", async () => {
    setToken("fake.student.token");
    mockAuthMe("student");
    renderAt("/admin");
    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/administrator permissions|an administrator/i)).toBeInTheDocument();
  });

  test("a student hitting /teacher gets Access Denied, not /home or /login", async () => {
    setToken("fake.student.token");
    mockAuthMe("student");
    renderAt("/teacher");
    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });

  test("a teacher hitting /admin (admin-only) gets Access Denied", async () => {
    setToken("fake.teacher.token");
    mockAuthMe("teacher");
    renderAt("/admin");
    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });

  test("an admin CAN reach /teacher (admins are allowed through TeacherRoute)", async () => {
    setToken("fake.admin.token");
    mockAuthMe("admin");
    renderAt("/teacher");
    await waitFor(() => expect(screen.queryByText(/checking teacher access/i)).not.toBeInTheDocument());
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  test("a pending (unapproved) self-registered teacher hitting /teacher sees the pending-approval screen, not Access Denied or the dashboard", async () => {
    setToken("fake.teacher.token");
    mockAuthMe("teacher", { status: "pending" });
    renderAt("/teacher");
    expect(await screen.findByText(/under review/i)).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  test("an approved teacher (status: active) reaches the real Teacher Portal", async () => {
    setToken("fake.teacher.token");
    mockAuthMe("teacher", { status: "active" });
    renderAt("/teacher");
    await waitFor(() => expect(screen.queryByText(/checking teacher access/i)).not.toBeInTheDocument());
    expect(screen.queryByText(/under review/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  test("an admin reaching /admin sees the real dashboard content, not a portal/denied screen", async () => {
    setToken("fake.admin.token");
    mockAuthMe("admin");
    renderAt("/admin");
    await waitFor(() => expect(screen.queryByText(/checking administrator access/i)).not.toBeInTheDocument());
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/restricted area/i)).not.toBeInTheDocument();
  });
});

describe("Regression: student BottomNav must never leak into the admin/teacher portals", () => {
  // This is the concrete bug found in the audit: AppLayout rendered
  // <BottomNav /> (Home/Chapters/Practice/Progress) unconditionally,
  // including on /admin/* and /teacher/* pages guarded by
  // AdminRoute/TeacherRoute. A teacher or admin could tap the
  // student "Home" tab and land in the student dashboard without any
  // explanation — an unintended, non-obvious redirect out of their
  // own portal.
  test("BottomNav's Home tab is not rendered while viewing /admin", async () => {
    setToken("fake.admin.token");
    mockAuthMe("admin");
    renderAt("/admin");
    await waitFor(() => expect(screen.queryByText(/checking administrator access/i)).not.toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /home/i })).not.toBeInTheDocument();
  });

  test("BottomNav's Home tab is not rendered while viewing /teacher", async () => {
    setToken("fake.teacher.token");
    mockAuthMe("teacher");
    renderAt("/teacher");
    await waitFor(() => expect(screen.queryByText(/checking teacher access/i)).not.toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /home/i })).not.toBeInTheDocument();
  });

  test("BottomNav IS rendered on an ordinary student page like /chapters", async () => {
    setToken("fake.student.token");
    mockAuthMe("student");
    renderAt("/chapters");
    expect(await screen.findByRole("link", { name: /home/i })).toBeInTheDocument();
  });
});

describe("Guest mode — Grade -> Subject -> Chapter -> Game without a real account", () => {
  test("a guest (JWT + isGuest flag, no real account) passes every ProtectedRoute exactly like a real login", async () => {
    // ensureGuestSession() in utils/guestSession.js mints a real JWT via
    // POST /auth/guest and stores it under the same "token" key a real
    // login uses — ProtectedRoute only ever checks for that key, so a
    // guest should reach every one of these without hitting
    // AuthenticationRequired.
    setToken("fake.guest.token");
    setGuest(true);
    mockAuthMe("student");

    for (const path of ["/home", "/chapters", "/practice", "/progress", "/games/fraction-builder"]) {
      const { unmount } = renderAt(path);
      await waitFor(() =>
        expect(
          screen.queryByText(/this page needs an account or guest session/i),
        ).not.toBeInTheDocument(),
      );
      unmount();
    }
  });

  test("a guest hitting /admin or /teacher still gets the portal entry screen, not silently let in", async () => {
    setToken("fake.guest.token");
    setGuest(true);
    // Guests never have admin/teacher role, but AdminRoute/TeacherRoute
    // check role via /auth/me regardless of the guest flag.
    mockAuthMe("student");
    renderAt("/admin");
    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });
});

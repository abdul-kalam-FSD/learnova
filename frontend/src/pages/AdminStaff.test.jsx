import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "../api/axios";
import AdminStaff from "./AdminStaff";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

// In-memory "backend": GET /admin/users honours ?role= like the real
// listUsers, so each section only ever receives its own role's rows.
let store;
function serve({ patchOk = true } = {}) {
  api.get.mockImplementation((_url, { params }) => {
    const q = (params.search || "").toLowerCase();
    const matched = store.filter(
      (u) =>
        (!params.role || u.role === params.role) &&
        (!params.status || u.status === params.status) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
    return Promise.resolve({
      data: {
        users: matched.slice(0, params.limit),
        total: matched.length,
        page: params.page,
        limit: params.limit,
        totalPages: 1,
      },
    });
  });
  api.patch.mockImplementation((url, body) => {
    if (!patchOk) return Promise.reject({ response: { data: { message: "Cannot demote the last admin" } } });
    const id = url.split("/")[3];
    store = store.map((u) => (u.id === id ? { ...u, role: body.role, status: "active" } : u));
    return Promise.resolve({ data: { ok: true } });
  });
}

const baseUsers = () => [
  { id: "t1", name: "Adhil", email: "adhil@example.com", grade: null, role: "teacher", status: "active", studentCount: 30 },
  { id: "t2", name: "Priya", email: "priya.t@example.com", grade: null, role: "teacher", status: "active", studentCount: 1 },
  { id: "t3", name: "Kumar", email: "kumar@example.com", grade: null, role: "teacher", status: "active", studentCount: 0 },
  { id: "t4", name: "Newbie", email: "newbie@example.com", grade: null, role: "teacher", status: "pending", studentCount: 0 },
  { id: "s1", name: "Rahul", email: "rahul@example.com", grade: 6, role: "student", status: "active" },
  { id: "s2", name: "Meena", email: "meena@example.com", grade: 5, role: "student", status: "active" },
  { id: "a1", name: "Boss Admin", email: "boss@example.com", grade: null, role: "admin", status: "active" },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<AdminStaff />} />
        <Route path="/admin/teachers/:id/students" element={<p>roster for route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const section = (role) => within(screen.getByTestId(`staff-section-${role}`));
const rowIn = (role, name) => section(role).getByText(name).closest("tr");

beforeEach(() => {
  vi.clearAllMocks();
  store = baseUsers();
});

describe("AdminStaff — loading and errors", () => {
  test("each section shows its own loading state", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading teachers...")).toBeInTheDocument();
    expect(screen.getByText("Loading students...")).toBeInTheDocument();
  });

  test("shows the API's error message when a request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load users" } } });
    renderPage();
    await waitFor(() => expect(screen.getAllByText("Failed to load users").length).toBeGreaterThan(0));
  });

  test("shows an empty state per section when nothing matches", async () => {
    store = [];
    serve();
    renderPage();
    expect(await screen.findByText("No teachers found.")).toBeInTheDocument();
    expect(screen.getByText("No students found.")).toBeInTheDocument();
    // Admins section is hidden entirely when there are none.
    expect(screen.queryByTestId("staff-section-admin")).toBeNull();
  });
});

describe("AdminStaff — Teachers / Students separation", () => {
  test("requests exactly one role per section from the existing endpoint", async () => {
    serve();
    renderPage();
    await screen.findByText("Adhil");
    const roles = api.get.mock.calls
      .filter(([, cfg]) => cfg.params.limit === 20)
      .map(([url, cfg]) => [url, cfg.params.role])
      .sort();
    expect(roles).toEqual([
      ["/admin/users", "admin"],
      ["/admin/users", "student"],
      ["/admin/users", "teacher"],
    ]);
  });

  test("Teacher section contains only TEACHER users", async () => {
    serve();
    renderPage();
    await screen.findByText("Adhil");
    const teachers = section("teacher");
    for (const n of ["Adhil", "Priya", "Kumar", "Newbie"]) expect(teachers.getByText(n)).toBeInTheDocument();
    for (const n of ["Rahul", "Meena", "Boss Admin"]) expect(teachers.queryByText(n)).toBeNull();
    expect(teachers.getAllByText("teacher").length).toBe(4); // role badges only
  });

  test("Student section contains only STUDENT users, with grade and no teacher-only fields", async () => {
    serve();
    renderPage();
    await screen.findByText("Rahul");
    const students = section("student");
    expect(students.getByText("Rahul")).toBeInTheDocument();
    expect(students.getByText("Meena")).toBeInTheDocument();
    for (const n of ["Adhil", "Priya", "Newbie", "Boss Admin"]) expect(students.queryByText(n)).toBeNull();
    expect(within(rowIn("student", "Rahul")).getByText("6")).toBeInTheDocument();
    expect(within(rowIn("student", "Meena")).getByText("5")).toBeInTheDocument();
    expect(students.queryByText("Students", { selector: "th" })).toBeNull();
    expect(students.queryByRole("button", { name: "View Students" })).toBeNull();
    expect(students.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(students.queryByText(/^\d+ Students?$/)).toBeNull();
  });

  test("Admin users are in neither the Teacher nor the Student section", async () => {
    serve();
    renderPage();
    await screen.findByText("Boss Admin");
    expect(section("admin").getByText("Boss Admin")).toBeInTheDocument();
    expect(section("teacher").queryByText("Boss Admin")).toBeNull();
    expect(section("student").queryByText("Boss Admin")).toBeNull();
  });

  test("the Teacher table has Status/Students columns; the Student table has a Grade column", async () => {
    serve();
    renderPage();
    await screen.findByText("Adhil");
    const heads = (role) => section(role).getAllByRole("columnheader").map((h) => h.textContent);
    expect(heads("teacher")).toEqual(["Name", "Email", "Role", "Status", "Students", "Change Role"]);
    expect(heads("student")).toEqual(["Name", "Email", "Role", "Grade", "Status", "Change Role"]);
  });
});

describe("AdminStaff — per-section search", () => {
  const typeIn = (label, value) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

  test("teacher search filters only the Teachers table (name or email) and leaves Students alone", async () => {
    serve();
    renderPage();
    await screen.findByText("Adhil");

    typeIn("Search teachers", "adhil");
    await waitFor(() => expect(section("teacher").queryByText("Priya")).toBeNull());
    expect(section("teacher").getByText("Adhil")).toBeInTheDocument();
    // Students untouched
    expect(section("student").getByText("Rahul")).toBeInTheDocument();
    expect(section("student").getByText("Meena")).toBeInTheDocument();

    // email search works too
    typeIn("Search teachers", "kumar@example");
    await waitFor(() => expect(section("teacher").getByText("Kumar")).toBeInTheDocument());
    expect(section("teacher").queryByText("Adhil")).toBeNull();
  });

  test("student search filters only the Students table and leaves Teachers alone", async () => {
    serve();
    renderPage();
    await screen.findByText("Rahul");

    typeIn("Search students", "meena");
    await waitFor(() => expect(section("student").queryByText("Rahul")).toBeNull());
    expect(section("student").getByText("Meena")).toBeInTheDocument();
    for (const n of ["Adhil", "Priya", "Kumar", "Newbie"]) expect(section("teacher").getByText(n)).toBeInTheDocument();
  });

  test("the search is sent to the existing endpoint for that role only", async () => {
    serve();
    renderPage();
    await screen.findByText("Adhil");
    api.get.mockClear();
    typeIn("Search teachers", "ad");
    await waitFor(() => {
      const searched = api.get.mock.calls.filter(([, c]) => c.params.search === "ad");
      expect(searched.map(([, c]) => c.params.role)).toEqual(["teacher"]);
      expect(searched[0][1].params.page).toBe(1);
    });
  });

  test("no matches shows the 'matching' empty state, keeps the search box, and clearing restores the rows", async () => {
    serve();
    renderPage();
    await screen.findByText("Adhil");

    typeIn("Search teachers", "zzz-nobody");
    expect(await screen.findByText("No matching teachers found.")).toBeInTheDocument();
    expect(screen.getByLabelText("Search teachers")).toBeInTheDocument();
    expect(section("student").getByText("Rahul")).toBeInTheDocument();

    typeIn("Search students", "zzz-nobody");
    expect(await screen.findByText("No matching students found.")).toBeInTheDocument();

    typeIn("Search teachers", "");
    await waitFor(() => expect(section("teacher").getByText("Adhil")).toBeInTheDocument());
    expect(section("teacher").getByText("Priya")).toBeInTheDocument();
    // underlying data was never changed by searching
    expect(store).toHaveLength(7);
  });

  test("the Admins table has no search box", async () => {
    serve();
    renderPage();
    await screen.findByText("Boss Admin");
    expect(section("admin").queryByRole("textbox")).toBeNull();
  });
});

describe("AdminStaff — summary counts", () => {
  const card = (label) => within(screen.getByTestId("staff-summary")).getByText(label).closest(".dash-card");

  test("shows Teachers / Students / Pending Teachers totals from the API (not hardcoded)", async () => {
    serve();
    renderPage();
    await waitFor(() => expect(within(card("Teachers")).getByText("4")).toBeInTheDocument());
    expect(within(card("Students")).getByText("2")).toBeInTheDocument();
    expect(within(card("Pending Teachers")).getByText("1")).toBeInTheDocument();
  });

  test("uses cheap count-only requests, including the status filter for pending teachers", async () => {
    serve();
    renderPage();
    await screen.findByText("Adhil");
    const counts = api.get.mock.calls.filter(([, c]) => c.params.limit === 1).map(([, c]) => c.params);
    expect(counts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "teacher" }),
        expect.objectContaining({ role: "student" }),
        expect.objectContaining({ role: "teacher", status: "pending" }),
      ]),
    );
    expect(counts).toHaveLength(3);
  });

  test("totals are not changed by searching a section", async () => {
    serve();
    renderPage();
    await waitFor(() => expect(within(card("Teachers")).getByText("4")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Search teachers"), { target: { value: "adhil" } });
    await waitFor(() => expect(section("teacher").queryByText("Priya")).toBeNull());
    expect(within(card("Teachers")).getByText("4")).toBeInTheDocument();
    expect(within(card("Pending Teachers")).getByText("1")).toBeInTheDocument();
  });

  test("approving a pending teacher drops Pending Teachers to 0", async () => {
    serve();
    renderPage();
    await waitFor(() => expect(within(card("Pending Teachers")).getByText("1")).toBeInTheDocument());
    fireEvent.click(within(rowIn("teacher", "Newbie")).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(within(card("Pending Teachers")).getByText("0")).toBeInTheDocument());
    expect(within(card("Teachers")).getByText("4")).toBeInTheDocument();
  });

  test("promoting a student to teacher moves the Teachers/Students totals", async () => {
    serve();
    renderPage();
    await waitFor(() => expect(within(card("Students")).getByText("2")).toBeInTheDocument());
    fireEvent.change(within(rowIn("student", "Rahul")).getByLabelText("Change role for Rahul"), {
      target: { value: "teacher" },
    });
    await waitFor(() => expect(within(card("Teachers")).getByText("5")).toBeInTheDocument());
    expect(within(card("Students")).getByText("1")).toBeInTheDocument();
  });

  test("shows a dash placeholder until the totals load", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(within(card("Teachers")).getByText("—")).toBeInTheDocument();
  });
});

describe("AdminStaff — teacher counts, approval and roster (unchanged behaviour)", () => {
  test("shows the count returned by the API for each teacher", async () => {
    serve();
    renderPage();
    await screen.findByText("Adhil");
    expect(within(rowIn("teacher", "Adhil")).getByText("30 Students")).toBeInTheDocument();
    expect(within(rowIn("teacher", "Priya")).getByText("1 Student")).toBeInTheDocument();
    expect(within(rowIn("teacher", "Kumar")).getByText("0 Students")).toBeInTheDocument();
    expect(within(rowIn("teacher", "Kumar")).getByRole("button", { name: "View Students" })).toBeInTheDocument();
  });

  test("pending teacher keeps Approve (no View Students) until approved, then moves to active with 0 Students", async () => {
    serve();
    renderPage();
    await screen.findByText("Newbie");

    const row = rowIn("teacher", "Newbie");
    expect(within(row).getByText("Pending")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "View Students" })).toBeNull();

    fireEvent.click(within(row).getByRole("button", { name: "Approve" }));
    expect(api.patch).toHaveBeenCalledWith("/admin/users/t4/role", { role: "teacher" });

    await waitFor(() =>
      expect(within(rowIn("teacher", "Newbie")).getByRole("button", { name: "View Students" })).toBeInTheDocument(),
    );
    expect(within(rowIn("teacher", "Newbie")).getByText("Active")).toBeInTheDocument();
    expect(within(rowIn("teacher", "Newbie")).getByText("0 Students")).toBeInTheDocument();
  });

  test("View Students opens that teacher's roster route", async () => {
    serve();
    renderPage();
    await screen.findByText("Adhil");
    fireEvent.click(within(rowIn("teacher", "Adhil")).getByRole("button", { name: "View Students" }));
    expect(await screen.findByText("roster for route")).toBeInTheDocument();
  });
});

describe("AdminStaff — changing a role", () => {
  test("a student promoted to teacher moves to the Teacher table (and leaves the Student table)", async () => {
    serve();
    renderPage();
    await screen.findByText("Rahul");

    fireEvent.change(within(rowIn("student", "Rahul")).getByLabelText("Change role for Rahul"), {
      target: { value: "teacher" },
    });
    expect(api.patch).toHaveBeenCalledWith("/admin/users/s1/role", { role: "teacher" });

    await waitFor(() => expect(section("teacher").getByText("Rahul")).toBeInTheDocument());
    expect(section("student").queryByText("Rahul")).toBeNull();
    expect(section("student").getByText("Meena")).toBeInTheDocument();
  });

  test("shows a row-level error and leaves the user in place when the update fails", async () => {
    serve({ patchOk: false });
    renderPage();
    await screen.findByText("Rahul");

    fireEvent.change(within(rowIn("student", "Rahul")).getByLabelText("Change role for Rahul"), {
      target: { value: "admin" },
    });
    expect(await within(rowIn("student", "Rahul")).findByText("Cannot demote the last admin")).toBeInTheDocument();
    expect(section("student").getByText("Rahul")).toBeInTheDocument();
    expect(section("admin").queryByText("Rahul")).toBeNull();
  });

  test("disables the row's select while a role change is saving", async () => {
    serve();
    let resolvePatch;
    api.patch.mockImplementation(() => new Promise((resolve) => (resolvePatch = resolve)));
    renderPage();
    await screen.findByText("Rahul");

    const select = within(rowIn("student", "Rahul")).getByLabelText("Change role for Rahul");
    fireEvent.change(select, { target: { value: "teacher" } });
    expect(select).toBeDisabled();

    resolvePatch({ data: { ok: true } });
    await waitFor(() => expect(select).not.toBeDisabled());
  });
});

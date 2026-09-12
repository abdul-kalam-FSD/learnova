import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import AdminStaff from "./AdminStaff";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

function page(users, overrides = {}) {
  return {
    users,
    total: users.length,
    page: 1,
    totalPages: 1,
    ...overrides,
  };
}

const USERS = [
  { id: "u1", name: "Priya Kumar", email: "priya@example.com", grade: 8, role: "student" },
  { id: "u2", name: "Mr. Raj", email: "raj@example.com", grade: null, role: "teacher" },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminStaff />
    </MemoryRouter>,
  );
}

function rowFor(name) {
  const cell = screen.getByText(name);
  return cell.closest("tr");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminStaff", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load users" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load users")).toBeInTheDocument();
    });
  });

  test("renders the user table with grade fallback for non-students", async () => {
    api.get.mockResolvedValue({ data: page(USERS) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    expect(screen.getByText("Mr. Raj")).toBeInTheDocument();
    expect(screen.getByText("2 users")).toBeInTheDocument();
    // Teacher has no grade, page renders an em dash instead.
    expect(within(rowFor("Mr. Raj")).getByText("—")).toBeInTheDocument();
  });

  test("shows an empty state when no users match", async () => {
    api.get.mockResolvedValue({ data: page([], { total: 0 }) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No users found")).toBeInTheDocument();
    });
  });

  test("changing the role filter re-fetches with the role param and resets to page 1", async () => {
    api.get.mockResolvedValue({ data: page(USERS) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    api.get.mockClear();
    api.get.mockResolvedValue({ data: page(USERS) });

    fireEvent.change(screen.getByDisplayValue("All roles"), { target: { value: "teacher" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/admin/users",
        expect.objectContaining({ params: expect.objectContaining({ role: "teacher", page: 1 }) }),
      );
    });
  });

  test("changing a user's role calls the API and updates the badge on success", async () => {
    api.get.mockResolvedValue({ data: page(USERS) });
    api.patch.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });

    const select = within(rowFor("Priya Kumar")).getByDisplayValue("Student");
    fireEvent.change(select, { target: { value: "teacher" } });

    expect(api.patch).toHaveBeenCalledWith("/admin/users/u1/role", { role: "teacher" });
    await waitFor(() => {
      expect(within(rowFor("Priya Kumar")).getByText("teacher")).toBeInTheDocument();
    });
  });

  test("shows a row-level error and does not change the badge when the role update fails", async () => {
    api.get.mockResolvedValue({ data: page(USERS) });
    api.patch.mockRejectedValue({ response: { data: { message: "Cannot demote the last admin" } } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });

    const select = within(rowFor("Priya Kumar")).getByDisplayValue("Student");
    fireEvent.change(select, { target: { value: "admin" } });

    await waitFor(() => {
      expect(within(rowFor("Priya Kumar")).getByText("Cannot demote the last admin")).toBeInTheDocument();
    });
    // Badge stays "student" — the failed change was never applied.
    expect(within(rowFor("Priya Kumar")).getByText("student")).toBeInTheDocument();
  });

  test("disables the row's select while a role change is saving", async () => {
    api.get.mockResolvedValue({ data: page(USERS) });
    let resolvePatch;
    api.patch.mockImplementation(() => new Promise((resolve) => (resolvePatch = resolve)));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });

    const select = within(rowFor("Priya Kumar")).getByDisplayValue("Student");
    fireEvent.change(select, { target: { value: "teacher" } });
    expect(select).toBeDisabled();

    resolvePatch({ data: { ok: true } });
    await waitFor(() => expect(select).not.toBeDisabled());
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import { clearGuestSession } from "../utils/guestSession";
import Login from "./Login";

vi.mock("../api/axios", () => ({
  default: { post: vi.fn() },
}));

vi.mock("../utils/guestSession", () => ({
  clearGuestSession: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage(initialEntries = ["/login"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Login />
    </MemoryRouter>,
  );
}

function fillAndGetSubmit() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
  return screen.getByRole("button", { name: /log in/i });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Login", () => {
  test("submits credentials, clears any guest session, and stores the token", async () => {
    api.post.mockResolvedValue({ data: { token: "tok123" } });
    renderPage();

    fireEvent.click(fillAndGetSubmit());

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        email: "a@b.com",
        password: "secret",
      });
    });
    expect(clearGuestSession).toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBe("tok123");
    expect(mockNavigate).toHaveBeenCalledWith("/home");
  });

  test("navigates to the redirect target from the query string on success", async () => {
    api.post.mockResolvedValue({ data: { token: "tok123" } });
    renderPage(["/login?redirect=/admin/dashboard"]);

    fireEvent.click(fillAndGetSubmit());

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  test("shows the API's error message and does not navigate on failure", async () => {
    api.post.mockRejectedValue({ response: { data: { message: "Invalid credentials" } } });
    renderPage();

    fireEvent.click(fillAndGetSubmit());

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("disables the submit button and shows a busy label while the request is in flight", async () => {
    let resolvePost;
    api.post.mockImplementation(() => new Promise((resolve) => (resolvePost = resolve)));
    renderPage();

    const button = fillAndGetSubmit();
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: /logging in/i })).toBeInTheDocument();

    resolvePost({ data: { token: "tok123" } });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });

  test("ignores a second click while the first login request is still pending", async () => {
    let resolvePost;
    api.post.mockImplementation(() => new Promise((resolve) => (resolvePost = resolve)));
    renderPage();

    const button = fillAndGetSubmit();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(api.post).toHaveBeenCalledTimes(1);
    resolvePost({ data: { token: "tok123" } });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });

  test("re-enables the submit button after a failed login so the user can retry", async () => {
    api.post.mockRejectedValue({ response: { data: { message: "Invalid credentials" } } });
    renderPage();

    const button = fillAndGetSubmit();
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
    expect(button).not.toBeDisabled();
  });

  test("shows context-specific copy when arriving from a portal entry page", () => {
    renderPage(["/login?context=teacher"]);
    expect(
      screen.getByText("Sign in with your teacher account to continue to the Teacher Portal."),
    ).toBeInTheDocument();
  });

  test("routes a teacher to /teacher when there's no explicit redirect", async () => {
    api.post.mockResolvedValueOnce({ data: { token: "tok1", user: { role: "teacher" } } });
    renderPage();
    fireEvent.click(fillAndGetSubmit());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/teacher"));
  });

  test("routes an admin to /admin when there's no explicit redirect", async () => {
    api.post.mockResolvedValueOnce({ data: { token: "tok2", user: { role: "admin" } } });
    renderPage();
    fireEvent.click(fillAndGetSubmit());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin"));
  });
});

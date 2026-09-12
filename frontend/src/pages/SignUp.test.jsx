import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import { isGuest, clearGuestSession } from "../utils/guestSession";
import Signup from "./SignUp";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("../utils/guestSession", () => ({
  isGuest: vi.fn(),
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

function renderPage() {
  return render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>,
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Priya" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "priya@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  isGuest.mockReturnValue(false);
});

describe("Signup — new account", () => {
  test("registers with the selected grade and stores the token on success", async () => {
    api.post.mockResolvedValue({ data: { token: "tok123" } });
    renderPage();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Grade"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({ name: "Priya", email: "priya@example.com", grade: "8" }),
      );
    });
    expect(clearGuestSession).toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBe("tok123");
    expect(mockNavigate).toHaveBeenCalledWith("/home");
  });

  test("fetches stream options for grade 11/12 and includes the chosen stream on submit", async () => {
    api.get.mockResolvedValue({
      data: { streams: [{ id: "s1", name: "PCM", core_subjects: ["Physics", "Chem", "Math"] }] },
    });
    api.post.mockResolvedValue({ data: { token: "tok123" } });
    renderPage();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Grade"), { target: { value: "11" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/public/standards/11/streams");
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Stream")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Stream"), { target: { value: "s1" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({ streamId: "s1" }),
      );
    });
  });

  test("shows the API's error message and does not navigate on failure", async () => {
    api.post.mockRejectedValue({ response: { data: { message: "Email already in use" } } });
    renderPage();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Grade"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(screen.getByText("Email already in use")).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("ignores a second click while the first signup request is still pending", async () => {
    let resolvePost;
    api.post.mockImplementation(() => new Promise((resolve) => (resolvePost = resolve)));
    renderPage();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Grade"), { target: { value: "8" } });
    const button = screen.getByRole("button", { name: /^sign up$/i });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: /signing up/i })).toBeInTheDocument();

    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.post).toHaveBeenCalledTimes(1);

    resolvePost({ data: { token: "tok123" } });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });

  test("re-enables the submit button after a failed signup so the user can retry", async () => {
    api.post.mockRejectedValue({ response: { data: { message: "Email already in use" } } });
    renderPage();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Grade"), { target: { value: "8" } });
    const button = screen.getByRole("button", { name: /^sign up$/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Email already in use")).toBeInTheDocument();
    });
    expect(button).not.toBeDisabled();
  });
});

describe("Signup — guest upgrade", () => {
  test("calls upgrade-guest instead of register, and skips the grade field", async () => {
    isGuest.mockReturnValue(true);
    localStorage.setItem("guestGrade", "6");
    api.post.mockResolvedValue({ data: { token: "tok123" } });
    renderPage();

    expect(screen.getByText("Save your progress")).toBeInTheDocument();
    expect(screen.queryByLabelText("Grade")).not.toBeInTheDocument();

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /save my progress/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/upgrade-guest", {
        name: "Priya",
        email: "priya@example.com",
        password: "secret123",
      });
    });
    expect(clearGuestSession).toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBe("tok123");
    expect(mockNavigate).toHaveBeenCalledWith("/home");
  });

  test("shows a busy label distinct from the new-account flow while saving", async () => {
    isGuest.mockReturnValue(true);
    let resolvePost;
    api.post.mockImplementation(() => new Promise((resolve) => (resolvePost = resolve)));
    renderPage();

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /save my progress/i }));

    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    resolvePost({ data: { token: "tok123" } });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });
});

describe("Signup — teacher role", () => {
  test("switching to Teacher hides the grade field and sends role: teacher, no grade", async () => {
    api.post.mockResolvedValue({ data: { token: "tok123", user: { status: "pending" } } });
    renderPage();

    fireEvent.click(screen.getByRole("radio", { name: "Teacher" }));
    expect(screen.queryByLabelText("Grade")).not.toBeInTheDocument();

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({ role: "teacher" }),
      );
    });
    const [, payload] = api.post.mock.calls[0];
    expect(payload).not.toHaveProperty("grade");
  });

  test("a successful teacher signup shows the pending-approval screen instead of navigating home", async () => {
    api.post.mockResolvedValue({ data: { token: "tok123", user: { status: "pending" } } });
    renderPage();

    fireEvent.click(screen.getByRole("radio", { name: "Teacher" }));
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(screen.getByText(/pending admin approval/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBe("tok123");
  });

  test("switching back to Student restores the grade field", () => {
    renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "Teacher" }));
    expect(screen.queryByLabelText("Grade")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Student" }));
    expect(screen.getByLabelText("Grade")).toBeInTheDocument();
  });
});

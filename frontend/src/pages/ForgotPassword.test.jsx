import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import ForgotPassword from "./ForgotPassword";

vi.mock("../api/axios", () => ({
  default: { post: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ForgotPassword", () => {
  test("rejects an obviously invalid email without calling the API", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("shows the backend's generic message on success, regardless of whether the email exists", async () => {
    api.post.mockResolvedValue({
      data: { message: "If that email is registered, we've sent password reset instructions." },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/forgot-password", { email: "a@b.com" });
    });
    expect(
      await screen.findByText(
        "If that email is registered, we've sent password reset instructions.",
      ),
    ).toBeInTheDocument();
  });

  test("shows a network-error message and lets the user retry on failure", async () => {
    api.post.mockRejectedValue(new Error("network down"));
    renderPage();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(
        screen.getByText("We couldn't connect right now. Please try again."),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /send reset link/i })).not.toBeDisabled();
  });
});

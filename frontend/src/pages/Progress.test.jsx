import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import Progress from "./Progress";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Progress />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// This page had no dedicated test file before the Task 2 defensive-
// guards work. Kept scoped to that work: the pre-existing empty/
// real-failure states plus the new malformed-response distinction it
// added — not a full feature test of the weak-filter/mastery-badge
// rendering below, which is unrelated to this task.
describe("Progress", () => {
  test("shows an empty state when there are no chapters", async () => {
    api.get.mockResolvedValue({ data: { chapters: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No chapters available for your grade yet.")).toBeInTheDocument();
    });
  });

  test("shows the API's error message when the request fails", async () => {
    // Progress.jsx's catch reads err.message directly (unlike the
    // other three /progress consumers, which also check
    // err.response?.data?.message) — matching its actual, current
    // contract here, not the pattern used elsewhere.
    api.get.mockRejectedValue(new Error("Failed to load"));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error: Failed to load")).toBeInTheDocument();
    });
  });

  test("shows a friendly error (not a raw exception) when chapters is missing from the response", async () => {
    api.get.mockResolvedValue({ data: {} });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("Error: We couldn't understand the response from the server. Please try again in a moment."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("No chapters available for your grade yet.")).not.toBeInTheDocument();
  });

  test("shows the same friendly error when chapters is present but not an array", async () => {
    api.get.mockResolvedValue({ data: { chapters: "not-an-array" } });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("Error: We couldn't understand the response from the server. Please try again in a moment."),
      ).toBeInTheDocument();
    });
  });
});

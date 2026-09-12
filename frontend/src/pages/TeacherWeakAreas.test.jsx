import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import TeacherWeakAreas from "./TeacherWeakAreas";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

const WEAK_AREAS = [
  {
    conceptId: "c1",
    conceptTitle: "Equivalent Fractions",
    subject: "Mathematics",
    grade: 6,
    weak: 4,
    learning: 2,
    strong: 1,
    status: "needs-review",
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherWeakAreas />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeacherWeakAreas", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading weak areas...")).toBeInTheDocument();
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load weak areas" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load weak areas")).toBeInTheDocument();
    });
  });

  test("shows an empty state when there is no mastery data", async () => {
    api.get.mockResolvedValue({ data: { weakAreas: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No mastery data yet")).toBeInTheDocument();
    });
  });

  test("renders the weak-areas table with a formatted status badge", async () => {
    api.get.mockResolvedValue({ data: { weakAreas: WEAK_AREAS } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument();
    });
    expect(screen.getByText("Mathematics")).toBeInTheDocument();
    // status "needs-review" renders with the hyphen swapped for a space.
    expect(screen.getByText("needs review")).toBeInTheDocument();
    expect(screen.getByText("1 concept with activity")).toBeInTheDocument();
  });

  test("changing the grade filter re-fetches with the grade param", async () => {
    api.get.mockResolvedValue({ data: { weakAreas: WEAK_AREAS } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Equivalent Fractions")).toBeInTheDocument();
    });
    api.get.mockClear();
    api.get.mockResolvedValue({ data: { weakAreas: WEAK_AREAS } });

    fireEvent.change(screen.getByDisplayValue("All grades"), { target: { value: "6" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/teacher/weak-areas",
        expect.objectContaining({ params: { grade: "6" } }),
      );
    });
  });
});

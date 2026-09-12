import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import AdminCases from "./AdminCases";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), delete: vi.fn() },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

const COMPLETE_CASE = {
  _id: "c1",
  title: "The Mystery of the Missing Oxygen",
  concept_ids: ["k1", "k2"],
  dragdrop_task: { items: ["Nose", "Trachea"] },
  matching_task: { pairs: [{ structure: "Lungs", role: "Gas exchange" }] },
};

const INCOMPLETE_CASE = {
  _id: "c2",
  title: "Draft Case",
  concept_ids: ["k1"],
  dragdrop_task: { items: [] },
  matching_task: { pairs: [] },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminCases />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminCases", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading cases...")).toBeInTheDocument();
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load cases" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load cases")).toBeInTheDocument();
    });
  });

  test("shows an empty state when there are no cases", async () => {
    api.get.mockResolvedValue({ data: { cases: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No cases yet")).toBeInTheDocument();
    });
  });

  test("renders cases with a visible/hidden badge based on completeness", async () => {
    api.get.mockResolvedValue({ data: { cases: [COMPLETE_CASE, INCOMPLETE_CASE] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("The Mystery of the Missing Oxygen")).toBeInTheDocument();
    });
    expect(screen.getByText("✓ Visible to students")).toBeInTheDocument();
    expect(screen.getByText("⚠ Incomplete — hidden from students")).toBeInTheDocument();
    expect(screen.getByText("2 cases")).toBeInTheDocument();
  });

  test("'Add Case' navigates to the new-case form", async () => {
    api.get.mockResolvedValue({ data: { cases: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No cases yet")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("+ Add Case"));
    expect(navigateMock).toHaveBeenCalledWith("/admin/cases/new");
  });

  test("clicking a case row navigates to its editor", async () => {
    api.get.mockResolvedValue({ data: { cases: [COMPLETE_CASE] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("The Mystery of the Missing Oxygen")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("The Mystery of the Missing Oxygen"));
    expect(navigateMock).toHaveBeenCalledWith("/admin/cases/c1");
  });

  test("deleting a case: cancelling the confirm dialog makes no API call", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    api.get.mockResolvedValue({ data: { cases: [COMPLETE_CASE] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("The Mystery of the Missing Oxygen")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Delete"));
    expect(api.delete).not.toHaveBeenCalled();
  });

  test("deleting a case: confirming calls the delete API and reloads the list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.get
      .mockResolvedValueOnce({ data: { cases: [COMPLETE_CASE] } })
      .mockResolvedValueOnce({ data: { cases: [] } });
    api.delete.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("The Mystery of the Missing Oxygen")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Delete"));

    expect(api.delete).toHaveBeenCalledWith("/admin/cases/c1");
    await waitFor(() => {
      expect(screen.getByText("No cases yet")).toBeInTheDocument();
    });
  });

  test("deleting a case: shows a banner when the delete request fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.get.mockResolvedValue({ data: { cases: [COMPLETE_CASE] } });
    api.delete.mockRejectedValue({ response: { data: { message: "Case is referenced elsewhere" } } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("The Mystery of the Missing Oxygen")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Delete"));

    await waitFor(() => {
      expect(screen.getByText("Case is referenced elsewhere")).toBeInTheDocument();
    });
  });
});

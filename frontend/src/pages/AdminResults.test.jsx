import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import AdminResults from "./AdminResults";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

function page(results, overrides = {}) {
  return {
    results,
    total: results.length,
    page: 1,
    totalPages: 1,
    ...overrides,
  };
}

const RESULTS = [
  {
    sessionId: "r1",
    studentName: "Priya Kumar",
    studentEmail: "priya@example.com",
    grade: 8,
    sessionTypeLabel: "Weak Concept Practice",
    completedAt: "2026-02-01T00:00:00.000Z",
    correctCount: 4,
    totalQuestions: 5,
    accuracy: 80,
    xpAwarded: 40,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminResults />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  window.URL.revokeObjectURL = vi.fn();
  // jsdom doesn't implement navigation, and clicking an <a download> tries
  // to navigate — stub it out since the component's real download
  // mechanism (browser-only) isn't what this test is verifying.
  HTMLAnchorElement.prototype.click = vi.fn();
});

describe("AdminResults", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading results...")).toBeInTheDocument();
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load results" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load results")).toBeInTheDocument();
    });
  });

  test("renders the results table", async () => {
    api.get.mockResolvedValue({ data: page(RESULTS) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    // "Weak Concept Practice" also appears as a filter-dropdown option,
    // so assert on the table cell specifically.
    const row = screen.getByText("Priya Kumar").closest("tr");
    expect(within(row).getByText("Weak Concept Practice")).toBeInTheDocument();
    expect(within(row).getByText((_, el) => el.textContent === "4/5")).toBeInTheDocument();
    expect(within(row).getByText((_, el) => el.textContent === "80%")).toBeInTheDocument();
    expect(within(row).getByText((_, el) => el.textContent === "+40")).toBeInTheDocument();
    expect(screen.getByText("1 result")).toBeInTheDocument();
  });

  test("renders Subject/Chapter/Game for a game-session row, and a dash for quiz rows", async () => {
    api.get.mockResolvedValue({
      data: page([
        ...RESULTS,
        {
          sessionId: "r2",
          studentName: "Dev Raj",
          studentEmail: "dev@example.com",
          grade: 9,
          sessionTypeLabel: "Game Session",
          subject: "Mathematics",
          chapter: "Fractions",
          gameTitle: "Fraction Builder — Level 2",
          gameType: "MATH_FRACTION_BUILDER",
          completedAt: "2026-02-02T00:00:00.000Z",
          correctCount: 1,
          totalQuestions: 1,
          accuracy: 100,
          xpAwarded: 10,
        },
      ]),
    });
    renderPage();
    await waitFor(() => screen.getByText("Dev Raj"));

    expect(screen.getByText("Fraction Builder — Level 2")).toBeInTheDocument();
    expect(screen.getByText("Mathematics · Fractions")).toBeInTheDocument();

    // The first (quiz) row has no gameTitle — it should render a plain
    // dash rather than an empty or undefined cell.
    const priyaRow = screen.getByText("Priya Kumar").closest("tr");
    expect(within(priyaRow).getByText("—")).toBeInTheDocument();
  });

  test("shows an empty state when no results match", async () => {
    api.get.mockResolvedValue({ data: page([], { total: 0 }) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });
  });

  test("changing the grade filter re-fetches with the grade param", async () => {
    api.get.mockResolvedValue({ data: page(RESULTS) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    api.get.mockClear();
    api.get.mockResolvedValue({ data: page(RESULTS) });

    fireEvent.change(screen.getByDisplayValue("All grades"), { target: { value: "8" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/admin/results",
        expect.objectContaining({ params: expect.objectContaining({ grade: "8", page: 1 }) }),
      );
    });
  });

  test("changing the session type filter re-fetches with the sessionType param", async () => {
    api.get.mockResolvedValue({ data: page(RESULTS) });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    api.get.mockClear();
    api.get.mockResolvedValue({ data: page(RESULTS) });

    fireEvent.change(screen.getByDisplayValue("All session types"), {
      target: { value: "case-investigation" },
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/admin/results",
        expect.objectContaining({
          params: expect.objectContaining({ sessionType: "case-investigation" }),
        }),
      );
    });
  });

  test("setting a date range re-fetches with from/to params", async () => {
    api.get.mockResolvedValue({ data: page(RESULTS) });
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });
    api.get.mockClear();
    api.get.mockResolvedValue({ data: page(RESULTS) });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: "2026-01-01" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/admin/results",
        expect.objectContaining({ params: expect.objectContaining({ from: "2026-01-01" }) }),
      );
    });
  });

  test("exporting downloads a blob and reverts the button afterward", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/admin/results/export") {
        return Promise.resolve({ data: new Blob(["fake xlsx"]) });
      }
      return Promise.resolve({ data: page(RESULTS) });
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Export to Excel"));
    expect(screen.getByText("Exporting...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Export to Excel")).toBeInTheDocument();
    });
    expect(api.get).toHaveBeenCalledWith(
      "/admin/results/export",
      expect.objectContaining({ responseType: "blob" }),
    );
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  test("shows an error and re-enables the button when export fails", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/admin/results/export") {
        return Promise.reject({ response: { data: { message: "Export failed" } } });
      }
      return Promise.resolve({ data: page(RESULTS) });
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Priya Kumar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Export to Excel"));

    await waitFor(() => {
      expect(screen.getByText("Export failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Export to Excel")).not.toBeDisabled();
  });

  test("renders Sync Status per row and shows a Retry button only for failed syncs", async () => {
    api.get.mockResolvedValue({
      data: page([
        { ...RESULTS[0], sessionId: "r1", syncStatus: "synced" },
        { ...RESULTS[0], sessionId: "r2", studentName: "Dev Raj", syncStatus: "failed" },
        { ...RESULTS[0], sessionId: "r3", studentName: "Meera S", syncStatus: "pending" },
      ]),
    });
    renderPage();

    await waitFor(() => screen.getByText("Priya Kumar"));

    expect(within(screen.getByText("Priya Kumar").closest("tr")).getByText("Synced")).toBeInTheDocument();
    expect(within(screen.getByText("Dev Raj").closest("tr")).getByText("Failed")).toBeInTheDocument();
    expect(within(screen.getByText("Meera S").closest("tr")).getByText("Pending")).toBeInTheDocument();

    // Only the failed row gets a Retry button.
    expect(within(screen.getByText("Dev Raj").closest("tr")).getByText("Retry")).toBeInTheDocument();
    expect(
      within(screen.getByText("Priya Kumar").closest("tr")).queryByText("Retry"),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByText("Meera S").closest("tr")).queryByText("Retry"),
    ).not.toBeInTheDocument();
  });

  test("a row with no syncStatus at all is treated as Pending, not a crash", async () => {
    const noStatus = { ...RESULTS[0] };
    delete noStatus.syncStatus;
    api.get.mockResolvedValue({ data: page([noStatus]) });
    renderPage();

    await waitFor(() => screen.getByText("Priya Kumar"));
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  test("retrying a failed sync updates that row's status without re-fetching the table", async () => {
    api.get.mockResolvedValue({
      data: page([{ ...RESULTS[0], sessionId: "r2", studentName: "Dev Raj", syncStatus: "failed" }]),
    });
    api.post.mockResolvedValue({ data: { status: "synced" } });
    renderPage();

    await waitFor(() => screen.getByText("Dev Raj"));
    api.get.mockClear();

    fireEvent.click(screen.getByText("Retry"));
    expect(screen.getByText("Retrying...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Synced")).toBeInTheDocument();
    });
    expect(api.post).toHaveBeenCalledWith("/admin/results/r2/retry-sync");
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
    // No full re-fetch — the row patch alone is what updated the UI.
    expect(api.get).not.toHaveBeenCalled();
  });

  test("shows an inline error and re-enables Retry when the retry call fails", async () => {
    api.get.mockResolvedValue({
      data: page([{ ...RESULTS[0], sessionId: "r2", studentName: "Dev Raj", syncStatus: "failed" }]),
    });
    api.post.mockRejectedValue({ response: { data: { message: "Sync retry failed" } } });
    renderPage();

    await waitFor(() => screen.getByText("Dev Raj"));

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("Retry failed")).toBeInTheDocument();
    });
    // Row stays "Failed" and Retry is clickable again.
    expect(within(screen.getByText("Dev Raj").closest("tr")).getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Retry")).not.toBeDisabled();
  });

  test("downloading the synced workbook hits the synced-file endpoint and reverts the button", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/admin/results/synced-file") {
        return Promise.resolve({ data: new Blob(["fake xlsx"]) });
      }
      return Promise.resolve({ data: page(RESULTS) });
    });
    renderPage();

    await waitFor(() => screen.getByText("Priya Kumar"));

    fireEvent.click(screen.getByText("Download Synced Workbook"));
    expect(screen.getByText("Downloading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Download Synced Workbook")).toBeInTheDocument();
    });
    expect(api.get).toHaveBeenCalledWith(
      "/admin/results/synced-file",
      expect.objectContaining({ responseType: "blob" }),
    );
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  test("shows an error and re-enables the button when the synced-workbook download fails", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/admin/results/synced-file") {
        return Promise.reject({ response: { data: { message: "No synchronized performance data yet" } } });
      }
      return Promise.resolve({ data: page(RESULTS) });
    });
    renderPage();

    await waitFor(() => screen.getByText("Priya Kumar"));

    fireEvent.click(screen.getByText("Download Synced Workbook"));

    await waitFor(() => {
      expect(screen.getByText("No synchronized performance data yet")).toBeInTheDocument();
    });
    expect(screen.getByText("Download Synced Workbook")).not.toBeDisabled();
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "../api/axios";
import TeacherContestResults from "./TeacherContestResults";
import AdminContestResults from "./AdminContestResults";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const PAGE = {
  contest: { id: "c1", title: "Blitz", grade: 6, subject: "Mathematics", chapterTitle: null, startAt: "2030-01-01T10:00:00Z", endAt: "2030-01-02T10:00:00Z" },
  rankingRule: { summary: "rule" }, final: false, phase: "ACTIVE",
  summary: { challengeCount: 2, participantCount: 1, completedCount: 0, partialCount: 1, inProgressCount: 0, rankedCount: 1 },
  rows: [{ rank: 1, studentId: "s1", name: "Ann", email: "ann@x.com", status: "PARTIAL", challengeCount: 2, challengesCompleted: 1, challengesSolved: 1, correctAnswers: 1, totalAnswers: 1, accuracy: 100, xpEarned: 30, elapsedSeconds: 60, lastCompletedAt: "2030-01-01T10:01:00Z" }],
  page: 1, limit: 25, total: 1, totalPages: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((url) =>
    url.includes("/results/") ? Promise.resolve({ data: { challenges: [] } }) : Promise.resolve({ data: PAGE }),
  );
});

describe("TeacherContestResults", () => {
  const renderIt = () =>
    render(
      <MemoryRouter initialEntries={["/teacher/contests/c1/results"]}>
        <Routes>
          <Route path="/teacher/contests/:contestId/results" element={<TeacherContestResults />} />
        </Routes>
      </MemoryRouter>,
    );

  test("uses the TEACHER endpoints for this contest and links back to the contest list", async () => {
    renderIt();
    await screen.findByText("Ann");
    expect(api.get).toHaveBeenCalledWith("/contests/c1/results", { params: { page: 1 } });
    expect(screen.getByRole("link", { name: /Back to Contests/ })).toHaveAttribute("href", "/teacher/contests");
    fireEvent.click(screen.getByRole("button", { name: "Details for Ann" }));
    await screen.findByRole("dialog");
    expect(api.get).toHaveBeenCalledWith("/contests/c1/results/s1");
  });

  test("a contest that isn't theirs surfaces the server's not-found message", async () => {
    api.get.mockRejectedValue({ response: { status: 404, data: { message: "Contest not found" } } });
    renderIt();
    expect(await screen.findByText("Contest not found")).toBeInTheDocument();
  });

  test("offers Export Excel against the TEACHER export endpoint — and none when the contest isn't theirs", async () => {
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const view = renderIt();
    const button = await screen.findByRole("button", { name: "Export Excel" });
    api.get.mockClear();
    api.get.mockResolvedValue({ data: new Blob(["x"]), headers: {} });
    fireEvent.click(button);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/contests/c1/results/export", { responseType: "blob" }));
    view.unmount();

    api.get.mockRejectedValue({ response: { status: 404, data: { message: "Contest not found" } } });
    renderIt();
    await screen.findByText("Contest not found");
    expect(screen.queryByRole("button", { name: "Export Excel" })).not.toBeInTheDocument();
  });
});

describe("AdminContestResults", () => {
  const renderIt = () =>
    render(
      <MemoryRouter initialEntries={["/admin/contests/c1/results"]}>
        <Routes>
          <Route path="/admin/contests/:contestId/results" element={<AdminContestResults />} />
        </Routes>
      </MemoryRouter>,
    );

  test("offers Export Excel against the ADMIN export endpoint — and none when the results are refused", async () => {
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const view = renderIt();
    const button = await screen.findByRole("button", { name: "Export Excel" });
    api.get.mockClear();
    api.get.mockResolvedValue({ data: new Blob(["x"]), headers: {} });
    fireEvent.click(button);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/admin/contests/c1/results/export", { responseType: "blob" }));
    view.unmount();

    api.get.mockRejectedValue({ response: { status: 409, data: { message: "Results are only available once a contest has been published" } } });
    renderIt();
    await screen.findByText(/only available once a contest has been published/);
    expect(screen.queryByRole("button", { name: "Export Excel" })).not.toBeInTheDocument();
  });

  test("uses the ADMIN endpoints and links back to contest review", async () => {
    renderIt();
    await screen.findByText("Ann");
    expect(api.get).toHaveBeenCalledWith("/admin/contests/c1/results", { params: { page: 1 } });
    expect(screen.getByRole("link", { name: /Back to Contest Review/ })).toHaveAttribute("href", "/admin/contests");
    fireEvent.click(screen.getByRole("button", { name: "Details for Ann" }));
    await screen.findByRole("dialog");
    expect(api.get).toHaveBeenCalledWith("/admin/contests/c1/results/s1");
  });
});

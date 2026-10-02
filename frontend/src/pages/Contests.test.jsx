import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import Contests from "./Contests";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const CONTEST = (over = {}) => ({
  id: "c1",
  title: "Weekly Fractions Blitz",
  description: "Play them all",
  grade: 6,
  subject: "Mathematics",
  chapterTitle: "Fractions",
  teacherName: "Tina Teacher",
  startAt: "2030-01-01T10:00:00.000Z",
  endAt: "2030-01-02T10:00:00.000Z",
  phase: "ACTIVE",
  challengeCount: 3,
  completedCount: 1,
  ...over,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <Contests />
    </MemoryRouter>,
  );

beforeEach(() => vi.clearAllMocks());

describe("Contests (student list)", () => {
  test("shows a loading state, then requests only /student/contests (no grade is sent)", async () => {
    api.get.mockResolvedValue({ data: { contests: [CONTEST()] } });
    renderPage();
    expect(screen.getByText("Loading contests...")).toBeInTheDocument();
    await screen.findByText("Weekly Fractions Blitz");
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith("/student/contests");
  });

  test("shows the useful details on each card and links to the contest", async () => {
    api.get.mockResolvedValue({ data: { contests: [CONTEST()] } });
    renderPage();
    const link = (await screen.findByText("Weekly Fractions Blitz")).closest("a");
    expect(link).toHaveAttribute("href", "/contests/c1");
    expect(within(link).getByText("Mathematics · Fractions")).toBeInTheDocument();
    expect(within(link).getByText(/3 games · 1 of 3 done · by Tina Teacher/)).toBeInTheDocument();
    expect(within(link).getByText("Live now")).toBeInTheDocument();
  });

  test("groups by phase in the server's order: Live now, Upcoming, Ended", async () => {
    api.get.mockResolvedValue({
      data: {
        contests: [
          CONTEST({ id: "a", title: "Alpha", phase: "ACTIVE" }),
          CONTEST({ id: "u", title: "Upnext", phase: "UPCOMING" }),
          CONTEST({ id: "e", title: "Gone", phase: "ENDED", chapterTitle: null }),
        ],
      },
    });
    renderPage();
    await screen.findByText("Alpha");
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Live now", "Upcoming", "Ended"]);
    expect(screen.getByText("Mathematics · All chapters")).toBeInTheDocument();
  });

  test("a group with no contests is not rendered", async () => {
    api.get.mockResolvedValue({ data: { contests: [CONTEST({ phase: "UPCOMING" })] } });
    renderPage();
    await screen.findByText("Weekly Fractions Blitz");
    expect(screen.queryByRole("heading", { level: 3, name: "Live now" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Ended" })).not.toBeInTheDocument();
  });

  test("singular wording for a one-game contest", async () => {
    api.get.mockResolvedValue({ data: { contests: [CONTEST({ challengeCount: 1, completedCount: 0, teacherName: null })] } });
    renderPage();
    expect(await screen.findByText(/1 game · 0 of 1 done$/)).toBeInTheDocument();
  });

  test("friendly empty state when there are no contests", async () => {
    api.get.mockResolvedValue({ data: { contests: [] } });
    renderPage();
    expect(await screen.findByText("No contests yet")).toBeInTheDocument();
  });

  test("a 403 (guest/teacher/admin) shows the server's reason as a friendly state, not an error", async () => {
    api.get.mockRejectedValue({ response: { status: 403, data: { message: "Create a free account to join contests" } } });
    renderPage();
    expect(await screen.findByText("Contests are for student accounts")).toBeInTheDocument();
    expect(screen.getByText("Create a free account to join contests")).toBeInTheDocument();
    expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument();
  });

  test("other failures show an error", async () => {
    api.get.mockRejectedValue({ response: { status: 500, data: { message: "Server exploded" } } });
    renderPage();
    expect(await screen.findByText("Error: Server exploded")).toBeInTheDocument();
  });
});

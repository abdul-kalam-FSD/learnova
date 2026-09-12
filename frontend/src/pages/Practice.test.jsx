import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import Practice from "./Practice";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Practice />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Practice", () => {
  test("shows the recommended game, difficulty, and a reason-based tagline", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/games/recommended") {
        return Promise.resolve({
          data: {
            gameType: "MCQ_QUIZ",
            subject: "Biology",
            label: "Quiz",
            title: "Cell Structure",
            difficulty: "medium",
            reason: "weak-concept",
          },
        });
      }
      if (url === "/games/catalog") {
        return Promise.resolve({ data: { catalog: [] } });
      }
      return Promise.reject(new Error("unexpected url " + url));
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Quiz")).toBeInTheDocument();
    });
    expect(screen.getByText(/Cell Structure/)).toBeInTheDocument();
    expect(screen.getByText(/Medium difficulty/)).toBeInTheDocument();
    expect(screen.getByText(/still building this up/)).toBeInTheDocument();
    expect(screen.getByText("Start Practice")).toBeInTheDocument();
  });

  test("gracefully handles a 404 (no recommendation yet) and still shows the catalog", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/games/recommended") {
        return Promise.reject({ response: { status: 404 } });
      }
      if (url === "/games/catalog") {
        return Promise.resolve({
          data: {
            catalog: [
              {
                subject: "Mathematics",
                gameTypes: [{ game_type: "SHAPE_MATCH", label: "Shape Match", count: 3 }],
              },
            ],
          },
        });
      }
      return Promise.reject(new Error("unexpected url " + url));
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Shape Match")).toBeInTheDocument();
    });
    expect(screen.getByText("MATHEMATICS")).toBeInTheDocument();
  });

  test("shows an intentional empty state with a real navigation path when there is no recommendation and an empty catalog", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/games/recommended") {
        return Promise.reject({ response: { status: 404 } });
      }
      if (url === "/games/catalog") {
        return Promise.resolve({ data: { catalog: [] } });
      }
      return Promise.reject(new Error("unexpected url " + url));
    });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText("Practice content isn't available for your grade yet"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Browse Chapters")).toBeInTheDocument();
  });

  test("surfaces a real error message when a request fails for a non-404 reason", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/games/recommended") {
        return Promise.resolve({ data: null });
      }
      if (url === "/games/catalog") {
        return Promise.reject({ response: { data: { message: "Server error" } } });
      }
      return Promise.reject(new Error("unexpected url " + url));
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error: Server error")).toBeInTheDocument();
    });
  });
});

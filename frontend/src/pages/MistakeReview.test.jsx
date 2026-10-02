import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../api/axios";
import MistakeReview from "./MistakeReview";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn() },
}));

function renderPage(sessionId = "session123") {
  return render(
    <MemoryRouter initialEntries={[`/mistake-review/${sessionId}`]}>
      <Routes>
        <Route path="/mistake-review/:sessionId" element={<MistakeReview />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

const sampleMistake = {
  question_id: "q1",
  concept_id: "c1",
  concept_title: "Fractions",
  question_text: "What is 1/2 + 1/4?",
  selected_option: { id: "a", text: "1/6" },
  correct_option: { id: "b", text: "3/4" },
  explanation: "Find a common denominator first.",
  answered_at: "2026-01-01T00:00:00.000Z",
};

describe("MistakeReview", () => {
  test("shows a loading state before the response resolves", () => {
    api.get.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.getByText("Loading your answers...")).toBeInTheDocument();
  });

  test("fetches the review for the session id from the URL", async () => {
    api.get.mockResolvedValue({ data: { mistakes: [] } });
    renderPage("abc999");
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/quiz/abc999/review");
    });
  });

  test("renders mistakes with question, selected answer, correct answer, explanation, and concept", async () => {
    api.get.mockResolvedValue({ data: { mistakes: [sampleMistake] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("What is 1/2 + 1/4?")).toBeInTheDocument();
    });
    expect(screen.getByText("Fractions")).toBeInTheDocument();
    expect(screen.getByText(/Your answer: 1\/6/)).toBeInTheDocument();
    expect(screen.getByText(/Correct answer: 3\/4/)).toBeInTheDocument();
    expect(screen.getByText("Find a common denominator first.")).toBeInTheDocument();
  });

  test("shows an empty/celebratory state when there are no mistakes", async () => {
    api.get.mockResolvedValue({ data: { mistakes: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Perfect score!")).toBeInTheDocument();
    });
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Session not found" } } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error: Session not found")).toBeInTheDocument();
    });
  });

  test("shows a friendly error (not a crash) when the response is malformed", async () => {
    api.get.mockResolvedValue({ data: {} }); // missing `mistakes`
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("Error: We couldn't understand the response from the server. Please try again in a moment."),
      ).toBeInTheDocument();
    });
  });

  test("does not crash when a mistake is missing optional fields (deleted question, no explanation)", async () => {
    api.get.mockResolvedValue({
      data: {
        mistakes: [
          {
            question_id: "q2",
            concept_id: "c2",
            concept_title: null,
            question_text: null,
            selected_option: null,
            correct_option: null,
            explanation: null,
            answered_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("This question is no longer available.")).toBeInTheDocument();
    });
    // Falls back gracefully instead of rendering "undefined" or crashing.
    expect(screen.getAllByText(/Unknown/).length).toBeGreaterThan(0);
  });

  test("provides a way back to the relevant learning area", async () => {
    api.get.mockResolvedValue({ data: { mistakes: [sampleMistake] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("What is 1/2 + 1/4?")).toBeInTheDocument();
    });
    const backLink = screen.getByRole("link", { name: "Back to Home" });
    expect(backLink).toHaveAttribute("href", "/home");
  });
});

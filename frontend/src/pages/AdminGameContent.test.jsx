import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import api from "../api/axios";
import AdminGameContent from "./AdminGameContent";
import { GAME_TYPES as GAME_TYPE_ENTRIES } from "../games/gameRegistry";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const FIRST_GAME_TYPE = GAME_TYPE_ENTRIES[0].game_type;

const ITEM_A = {
  _id: "g1",
  game_type: FIRST_GAME_TYPE,
  concept_id: "k1",
  title: "Halves and Quarters",
  difficulty: "easy",
  order_index: 1,
  payload: { target: 0.5 },
};

const ITEM_B = {
  _id: "g2",
  game_type: FIRST_GAME_TYPE,
  concept_id: "k2",
  title: "Thirds and Sixths",
  difficulty: "hard",
  order_index: 2,
  payload: { target: 0.33 },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminGameContent />
    </MemoryRouter>,
  );
}

// The admin-modal__field label elements aren't wired to their inputs via
// htmlFor/id, so getByLabelText can't find them — locate the field's
// input/select/textarea via the label text that precedes it instead.
function fieldControl(labelText) {
  const label = screen.getByText(labelText, { exact: false });
  return label.parentElement.querySelector("input, select, textarea");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminGameContent", () => {
  test("shows a loading state before the request resolves", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading challenges...")).toBeInTheDocument();
  });

  test("shows the API's error message when the request fails", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Failed to load content" } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load content")).toBeInTheDocument();
    });
  });

  test("loads content for the default (first) game type on mount", async () => {
    api.get.mockResolvedValue({ data: { content: [] } });
    renderPage();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/game-content", {
        params: { game_type: FIRST_GAME_TYPE },
      });
    });
  });

  test("shows an empty state naming the selected game type when there is no content", async () => {
    api.get.mockResolvedValue({ data: { content: [] } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No challenges yet")).toBeInTheDocument();
    });
    expect(screen.getByText(`No ${FIRST_GAME_TYPE} content for this grade's concepts yet.`)).toBeInTheDocument();
  });

  test("renders challenge rows with difficulty and order", async () => {
    api.get.mockResolvedValue({ data: { content: [ITEM_A, ITEM_B] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Halves and Quarters")).toBeInTheDocument();
    });
    expect(screen.getByText("easy · order 1")).toBeInTheDocument();
    expect(screen.getByText("Thirds and Sixths")).toBeInTheDocument();
    expect(screen.getByText("hard · order 2")).toBeInTheDocument();
  });

  test("changing the game type filter re-fetches with the new value", async () => {
    api.get.mockResolvedValue({ data: { content: [] } });
    renderPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/game-content", {
        params: { game_type: FIRST_GAME_TYPE },
      });
    });

    const secondType = GAME_TYPE_ENTRIES[1].game_type;
    fireEvent.change(fieldControl("Game Type"), { target: { value: secondType } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/game-content", {
        params: { game_type: secondType },
      });
    });
  });

  test("'+ Add Challenge' opens a create modal defaulted to the current filter's game type", async () => {
    api.get.mockResolvedValue({ data: { content: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No challenges yet")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("+ Add Challenge"));

    expect(screen.getByText("New Challenge")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste the concept's _id from the Content tab")).toBeInTheDocument();
  });

  test("clicking a row opens an edit modal pre-filled with its data, without concept_id/game_type fields", async () => {
    api.get.mockResolvedValue({ data: { content: [ITEM_A] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Halves and Quarters")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Halves and Quarters"));

    expect(screen.getByText("Edit Challenge")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Paste the concept's _id from the Content tab")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Halves and Quarters")).toBeInTheDocument();
    expect(fieldControl(/Payload/).value).toBe(JSON.stringify(ITEM_A.payload, null, 2));
  });

  test("save with invalid JSON payload shows a form error and does not call the API", async () => {
    api.get.mockResolvedValue({ data: { content: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No challenges yet")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("+ Add Challenge"));
    fireEvent.change(fieldControl(/Payload/), { target: { value: "{ not valid json" } });
    fireEvent.click(screen.getByText("Save"));

    expect(
      screen.getByText("Payload must be valid JSON — check for a missing comma or bracket."),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("save with a non-object JSON payload (array) shows a form error", async () => {
    api.get.mockResolvedValue({ data: { content: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No challenges yet")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("+ Add Challenge"));
    fireEvent.change(fieldControl(/Payload/), { target: { value: "[1, 2, 3]" } });
    fireEvent.click(screen.getByText("Save"));

    expect(
      screen.getByText('Payload must be a JSON object, e.g. { "target": ... }.'),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("creating a challenge posts game_type and concept_id along with the rest of the form, then reloads", async () => {
    api.get
      .mockResolvedValueOnce({ data: { content: [] } })
      .mockResolvedValueOnce({ data: { content: [ITEM_A] } });
    api.post.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No challenges yet")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("+ Add Challenge"));
    fireEvent.change(screen.getByPlaceholderText("Paste the concept's _id from the Content tab"), {
      target: { value: "k1" },
    });
    fireEvent.change(fieldControl("Title"), { target: { value: "Halves and Quarters" } });
    fireEvent.change(fieldControl(/Payload/), { target: { value: '{ "target": 0.5 }' } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/game-content",
        expect.objectContaining({
          title: "Halves and Quarters",
          concept_id: "k1",
          game_type: FIRST_GAME_TYPE,
          payload: { target: 0.5 },
        }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("New Challenge")).not.toBeInTheDocument();
    });
  });

  test("editing a challenge patches without game_type/concept_id in the body", async () => {
    api.get.mockResolvedValue({ data: { content: [ITEM_A] } });
    api.patch.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Halves and Quarters")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Halves and Quarters"));
    fireEvent.change(fieldControl("Title"), { target: { value: "Halves and Quarters (updated)" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/admin/game-content/g1", {
        title: "Halves and Quarters (updated)",
        difficulty: "easy",
        order_index: 1,
        payload: { target: 0.5 },
      });
    });
  });

  test("shows the API error inside the modal when save fails, and modal stays open", async () => {
    api.get.mockResolvedValue({ data: { content: [] } });
    api.post.mockRejectedValue({ response: { data: { message: "concept_id not found" } } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No challenges yet")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("+ Add Challenge"));
    fireEvent.change(fieldControl("Title"), { target: { value: "Bad One" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("concept_id not found")).toBeInTheDocument();
    });
    expect(screen.getByText("New Challenge")).toBeInTheDocument();
  });

  test("Cancel closes the modal without calling the API", async () => {
    api.get.mockResolvedValue({ data: { content: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No challenges yet")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("+ Add Challenge"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("New Challenge")).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("deleting: cancelling the confirm dialog makes no API call", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    api.get.mockResolvedValue({ data: { content: [ITEM_A] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Halves and Quarters")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Delete Halves and Quarters"));
    expect(api.delete).not.toHaveBeenCalled();
  });

  test("deleting: confirming calls the delete API and reloads the list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.get
      .mockResolvedValueOnce({ data: { content: [ITEM_A] } })
      .mockResolvedValueOnce({ data: { content: [] } });
    api.delete.mockResolvedValue({ data: { ok: true } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Halves and Quarters")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Delete Halves and Quarters"));

    expect(api.delete).toHaveBeenCalledWith("/admin/game-content/g1");
    await waitFor(() => {
      expect(screen.getByText("No challenges yet")).toBeInTheDocument();
    });
  });

  test("deleting: shows a banner when the delete request fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.get.mockResolvedValue({ data: { content: [ITEM_A] } });
    api.delete.mockRejectedValue({ response: { data: { message: "In use elsewhere" } } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Halves and Quarters")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Delete Halves and Quarters"));

    await waitFor(() => {
      expect(screen.getByText("In use elsewhere")).toBeInTheDocument();
    });
  });
});

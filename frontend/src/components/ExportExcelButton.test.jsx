import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import api from "../api/axios";
import ExportExcelButton from "./ExportExcelButton";

vi.mock("../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const URL_PATH = "/contests/c1/results/export";
const OK = (filename = "Learnova_Contest_Blitz_Results.xlsx") => ({
  data: new Blob(["xlsx-bytes"]),
  headers: { "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${filename}` },
});

let clicked;
beforeEach(() => {
  vi.clearAllMocks();
  clicked = [];
  window.URL.createObjectURL = vi.fn(() => "blob:fake");
  window.URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
    clicked.push({ download: this.download, href: this.href });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ExportExcelButton", () => {
  test("starts in the normal state", () => {
    render(<ExportExcelButton url={URL_PATH} className="btn" />);
    const button = screen.getByRole("button", { name: "Export Excel" });
    expect(button).toBeEnabled();
    expect(button).toHaveClass("btn");
    expect(api.get).not.toHaveBeenCalled(); // nothing is requested until the user asks
  });

  test("clicking requests the file as a blob — sending nothing but the url", async () => {
    api.get.mockResolvedValue(OK());
    render(<ExportExcelButton url={URL_PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    expect(api.get).toHaveBeenCalledWith(URL_PATH, { responseType: "blob" });
  });

  test("shows an exporting state and ignores a second click while it runs", async () => {
    let resolve;
    api.get.mockImplementation(() => new Promise((r) => (resolve = r)));
    render(<ExportExcelButton url={URL_PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    const busy = await screen.findByRole("button", { name: "Exporting..." });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    fireEvent.click(busy);
    expect(api.get).toHaveBeenCalledTimes(1);
    await act(async () => resolve(OK()));
    await screen.findByRole("button", { name: "Downloaded ✓" });
  });

  test("on success the browser downloads the file under the server's filename, then says so", async () => {
    api.get.mockResolvedValue(OK("Learnova_Contest_Weekly_Results.xlsx"));
    render(<ExportExcelButton url={URL_PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(await screen.findByRole("button", { name: "Downloaded ✓" })).toBeInTheDocument();
    expect(clicked).toEqual([{ download: "Learnova_Contest_Weekly_Results.xlsx", href: "blob:fake" }]);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    expect(screen.getByRole("status")).toHaveTextContent("Downloaded Learnova_Contest_Weekly_Results.xlsx");
  });

  test("falls back to a default filename when the header isn't readable", async () => {
    api.get.mockResolvedValue({ data: new Blob(["x"]), headers: {} });
    render(<ExportExcelButton url={URL_PATH} fallbackFilename="fallback.xlsx" />);
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    await screen.findByRole("button", { name: "Downloaded ✓" });
    expect(clicked[0].download).toBe("fallback.xlsx");
  });

  test("the success state fades back to normal", async () => {
    vi.useFakeTimers();
    api.get.mockResolvedValue(OK());
    render(<ExportExcelButton url={URL_PATH} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    });
    expect(screen.getByRole("button", { name: "Downloaded ✓" })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("an error shows the SERVER's reason (read from the blob body), downloads nothing, and can be retried", async () => {
    api.get.mockRejectedValueOnce({
      response: { status: 404, data: new Blob([JSON.stringify({ message: "Contest not found" })]) },
      message: "Request failed with status code 404",
    });
    render(<ExportExcelButton url={URL_PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Contest not found");
    expect(clicked).toEqual([]);
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    const retry = screen.getByRole("button", { name: "Export Excel" });
    expect(retry).toBeEnabled();

    api.get.mockResolvedValueOnce(OK());
    fireEvent.click(retry);
    await screen.findByRole("button", { name: "Downloaded ✓" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(); // the old error is cleared
    expect(clicked).toHaveLength(1);
  });

  test("a network failure shows a readable message", async () => {
    api.get.mockRejectedValue(new Error("Network Error"));
    render(<ExportExcelButton url={URL_PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network Error");
  });

  test("a too-large contest message from the server is shown as-is", async () => {
    api.get.mockRejectedValue({ response: { status: 413, data: { message: "This contest has 2001 participants, which is more than can be exported in one file (limit 2000)." } } });
    render(<ExportExcelButton url={URL_PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/more than can be exported/);
  });

  test("unmounting mid-request doesn't crash or update state", async () => {
    let resolve;
    api.get.mockImplementation(() => new Promise((r) => (resolve = r)));
    const { unmount } = render(<ExportExcelButton url={URL_PATH} />);
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    unmount();
    await act(async () => resolve(OK()));
    expect(true).toBe(true);
  });
});

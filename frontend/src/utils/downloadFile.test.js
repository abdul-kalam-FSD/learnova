import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { filenameFromDisposition, exportErrorMessage, saveBlob } from "./downloadFile";

describe("filenameFromDisposition", () => {
  test("prefers the UTF-8 filename* so non-ASCII titles stay readable", () => {
    const header = `attachment; filename="Learnova_Contest_Contest_Results.xlsx"; filename*=UTF-8''Learnova_Contest_%E0%AE%AA%E0%AE%BF_Results.xlsx`;
    expect(filenameFromDisposition(header)).toBe("Learnova_Contest_பி_Results.xlsx");
  });

  test("falls back to the plain filename", () => {
    expect(filenameFromDisposition('attachment; filename="Learnova_Contest_Blitz_Results.xlsx"')).toBe("Learnova_Contest_Blitz_Results.xlsx");
    expect(filenameFromDisposition("attachment; filename=plain.xlsx")).toBe("plain.xlsx");
  });

  test("a malformed filename* falls back to the plain one instead of throwing", () => {
    expect(filenameFromDisposition(`attachment; filename="ok.xlsx"; filename*=UTF-8''%E0%A4%A`)).toBe("ok.xlsx");
  });

  test("never lets a path separator through; returns null when there is nothing usable", () => {
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"')).toBe(".._.._etc_passwd");
    expect(filenameFromDisposition(undefined)).toBeNull();
    expect(filenameFromDisposition("")).toBeNull();
    expect(filenameFromDisposition("inline")).toBeNull();
    expect(filenameFromDisposition(42)).toBeNull();
  });
});

describe("exportErrorMessage", () => {
  test("reads the server's JSON message out of a blob error body", async () => {
    const err = { response: { data: new Blob([JSON.stringify({ message: "Contest not found" })]) }, message: "Request failed with status code 404" };
    expect(await exportErrorMessage(err)).toBe("Contest not found");
  });

  test("uses a plain object message when the body is already parsed", async () => {
    expect(await exportErrorMessage({ response: { data: { message: "Admin access required" } } })).toBe("Admin access required");
  });

  test("falls back to the axios message, then to a generic one", async () => {
    expect(await exportErrorMessage({ message: "Network Error" })).toBe("Network Error");
    expect(await exportErrorMessage({ response: { data: new Blob(["<html>not json</html>"]) }, message: "Request failed with status code 502" })).toBe("Request failed with status code 502");
    expect(await exportErrorMessage({})).toBe("Export failed. Please try again.");
    expect(await exportErrorMessage(null)).toBe("Export failed. Please try again.");
  });
});

describe("saveBlob", () => {
  let clicked;
  beforeEach(() => {
    clicked = null;
    window.URL.createObjectURL = vi.fn(() => "blob:fake");
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
      clicked = { download: this.download, href: this.href };
    });
  });
  afterEach(() => vi.restoreAllMocks());

  test("creates a temporary link with the filename, clicks it, cleans up and releases the object URL", () => {
    saveBlob(new Blob(["x"]), "results.xlsx");
    expect(clicked).toEqual({ download: "results.xlsx", href: "blob:fake" });
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    expect(document.querySelector("a[download]")).toBeNull();
  });

  test("wraps raw bytes in a blob with the xlsx type", () => {
    saveBlob(new Uint8Array([1, 2, 3]), "r.xlsx");
    const blob = window.URL.createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });
});

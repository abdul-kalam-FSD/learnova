// Helpers for downloading a server-generated file (used by the contest Excel
// export). Kept apart from the button component so they can be tested alone.

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Filename from a Content-Disposition header. Prefers the UTF-8 `filename*`
// (so a Tamil/Hindi contest title keeps a readable name), falls back to the
// plain `filename`, and never lets a path separator through.
export function filenameFromDisposition(header) {
  if (!header || typeof header !== "string") return null;
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  let name = null;
  if (star) {
    try {
      name = decodeURIComponent(star[1].trim());
    } catch {
      name = null;
    }
  }
  if (!name) {
    const plain = header.match(/filename="?([^";]+)"?/i);
    name = plain ? plain[1].trim() : null;
  }
  if (!name) return null;
  const safe = name.replace(/[\\/]/g, "_");
  return safe || null;
}

function blobToText(blob) {
  if (typeof blob.text === "function") return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

// A failed request made with responseType "blob" delivers the server's JSON
// error as a Blob, so `err.response.data.message` is undefined. Read it back
// out so the user sees the real reason ("Contest not found", ...).
export async function exportErrorMessage(err) {
  const data = err?.response?.data;
  try {
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      const parsed = JSON.parse(await blobToText(data));
      if (parsed?.message) return parsed.message;
    } else if (data?.message) {
      return data.message;
    }
  } catch {
    // fall through to the generic message
  }
  return err?.message || "Export failed. Please try again.";
}

// Hands the bytes to the browser as a download (same technique as the
// existing admin result exports).
export function saveBlob(data, filename) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: XLSX_MIME });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}

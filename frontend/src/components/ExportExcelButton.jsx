import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { exportErrorMessage, filenameFromDisposition, saveBlob } from "../utils/downloadFile";

const SUCCESS_VISIBLE_MS = 4000;

// Downloads an .xlsx the SERVER generates from its own result calculation.
// The button sends nothing but the request itself (no scores, ranks or
// filters), and the server independently re-checks who is asking, so showing
// or hiding this button is never the only protection.
//
// States: idle -> exporting -> success (briefly) -> idle, or -> error (retry).
function ExportExcelButton({ url, label = "Export Excel", className = "", fallbackFilename = "contest-results.xlsx" }) {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const mounted = useRef(true);
  const timer = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const handleClick = async () => {
    if (state === "exporting") return;
    clearTimeout(timer.current);
    setState("exporting");
    setMessage("");
    try {
      const res = await api.get(url, { responseType: "blob" });
      const filename = filenameFromDisposition(res.headers?.["content-disposition"]) || fallbackFilename;
      saveBlob(res.data, filename);
      if (!mounted.current) return;
      setState("success");
      setMessage(`Downloaded ${filename}`);
      timer.current = setTimeout(() => {
        if (!mounted.current) return;
        setState("idle");
        setMessage("");
      }, SUCCESS_VISIBLE_MS);
    } catch (err) {
      const text = await exportErrorMessage(err);
      if (!mounted.current) return;
      setState("error");
      setMessage(text);
    }
  };

  const buttonLabel = state === "exporting" ? "Exporting..." : state === "success" ? "Downloaded ✓" : label;

  return (
    <span className="contest-results__export">
      <button type="button" className={className} onClick={handleClick} disabled={state === "exporting"} aria-busy={state === "exporting"}>
        {buttonLabel}
      </button>
      {message && (
        <span role={state === "error" ? "alert" : "status"} className={state === "error" ? "contest-results__error" : "contest-results__export-note"}>
          {message}
        </span>
      )}
    </span>
  );
}

export default ExportExcelButton;

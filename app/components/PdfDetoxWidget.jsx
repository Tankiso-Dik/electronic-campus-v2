"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * PdfDetoxWidget
 * - Floating bottom-right widget for OCR'ing PDFs in-browser.
 * - Uses pdfjs-dist to render pages to canvas, then Tesseract.js to OCR.
 * - Processes pages sequentially to limit memory footprint.
 * - OCR logic is swappable via the `ocrFn` prop.
 *
 * Local build: Uses npm modules (`pdfjs-dist`, `tesseract.js`) with a module
 * worker for pdf.js. No CDN scripts needed.
 */

const DEFAULT_STYLES = {
  container: {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    zIndex: 1000,
    width: "min(92vw, 420px)",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: "12px",
    boxShadow:
      "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    fontWeight: 600,
    fontSize: "14px",
    background: "#f8fafc",
    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
  },
  body: { padding: "12px" },
  row: { display: "flex", gap: "8px", alignItems: "center" },
  input: {
    flex: 1,
    display: "block",
    fontSize: "12px",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#0ea5e9",
    color: "white",
    padding: "8px 10px",
    borderRadius: "8px",
    border: 0,
    fontSize: "12px",
    cursor: "pointer",
  },
  progressWrap: { marginTop: "10px" },
  progressBar: {
    height: "6px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },
  progressInner: {
    height: "100%",
    background: "#22c55e",
    width: "0%",
    transition: "width 200ms ease",
  },
  textarea: {
    marginTop: "10px",
    width: "100%",
    height: "180px",
    fontSize: "12px",
    lineHeight: 1.4,
    padding: "10px",
    border: "1px solid rgba(15, 23, 42, 0.12)",
    borderRadius: "8px",
    resize: "vertical",
  },
  hint: { fontSize: "11px", color: "#475569" },
};

// Lazy import npm modules once per page; set up pdf.js worker via module worker
const useLazyLibraries = () => {
  const libsRef = useRef({ getDocument: null, GlobalWorkerOptions: null, Tesseract: null, loaded: false });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (libsRef.current.loaded) return libsRef.current;
    if (loading) return libsRef.current;
    setLoading(true);
    try {
      // Dynamically import to keep initial bundle lean
      const pdfjs = await import('pdfjs-dist');
      // Try module Worker first, fallback to public worker URL if bundler can't resolve
      let workerPort = null;
      try {
        workerPort = new Worker(
          new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
          { type: 'module' }
        );
      } catch (e) {
        // Fallback: expect worker at /pdf.worker.min.mjs served from public/
        if (pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }
      }
      if (workerPort && pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerPort = workerPort;
      }

      const Tesseract = (await import('tesseract.js')).default;

      libsRef.current = {
        getDocument: pdfjs.getDocument,
        GlobalWorkerOptions: pdfjs.GlobalWorkerOptions,
        Tesseract,
        loaded: true,
      };
      setError(null);
      return libsRef.current;
    } catch (err) {
      console.error('Failed loading libraries', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { load, loading, error };
};

// Default OCR function using tesseract.js; can be swapped via prop
const TESSDATA_PATH = '/tessdata';

async function defaultOcrFn(Tesseract, canvas, pageNumber, onProgress) {
  const res = await Tesseract.recognize(canvas, "eng", {
    // Ensure language data is fetched from our origin (no CDN dependency)
    langPath: TESSDATA_PATH,
    logger: (m) => {
      if (m?.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(Math.floor(m.progress * 100));
      }
    },
  });
  return res?.data?.text || "";
}

export default function PdfDetoxWidget({
  ocrFn, // optional: (Tesseract, canvas, pageNumber, onProgress) => Promise<string>
  title = "PDF OCR",
  hint = "Drop a PDF or choose a file to OCR.",
}) {
  const { load, loading: libsLoading, error: libsError } = useLazyLibraries();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pageProg, setPageProg] = useState({ current: 0, total: 0 });
  const [percent, setPercent] = useState(0);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");
  const [mdActive, setMdActive] = useState(false);
  const abortSeq = useRef(0);

  const onFile = useCallback(
    async (file) => {
      if (!file) return;
      setErr("");
      setText("");
      setFileName(file.name);
      setBusy(true);
      setMdActive(false);
      setPercent(0);
      setPageProg({ current: 0, total: 0 });
      const mySeq = ++abortSeq.current;
      try {
        const body = new FormData();
        body.append('file', file);

        const res = await fetch('/api/ocr', { method: 'POST', body });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || 'OCR failed.');
        }
        if (abortSeq.current !== mySeq) return; // cancelled
        setText(text.trim());
        setMdActive(true);
      } catch (e) {
        console.error(e);
        setErr(
          e?.message ||
            "Failed to process PDF. Ensure the file is valid and try again."
        );
      } finally {
        if (abortSeq.current === mySeq) setBusy(false);
      }
    },
    []
  );

  // drag & drop support
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = Array.from(e.dataTransfer.files || []).find((f) =>
        /pdf$/i.test(f.type) || f.name.toLowerCase().endsWith(".pdf")
      );
      onFile(file);
    },
    [onFile]
  );

  const onPick = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      onFile(file);
    },
    [onFile]
  );

  const cancel = useCallback(() => {
    abortSeq.current++;
    setBusy(false);
  }, []);

  // Note: Avoid preloading to reduce chances of interfering with Next HMR/dev fetches.
  // Libraries load on first file selection.

  const overallPct = useMemo(() => {
    const { current, total } = pageProg;
    if (!total) return 0;
    // progress combines completed pages and current page
    const completed = current > 1 ? (current - 1) / total : 0;
    return Math.max(0, Math.min(100, Math.round((completed + percent / 100 / total) * 100)));
  }, [pageProg, percent]);

  const formatAsMarkdown = useCallback(() => {
    const name = fileName ? `# ${fileName}\n\n` : "";
    const raw = text || "";
    const parts = raw.split(/\n\n----- Page (\d+) -----\n\n/).filter((s) => s !== "");
    // When using split with capturing group, result like: [before, pageNum, content, pageNum, content, ...]
    let md = name;
    if (parts.length > 1) {
      for (let i = 0; i < parts.length; i += 2) {
        const pageNum = parts[i];
        const content = parts[i + 1] || "";
        if (!content) continue;
        md += `## Page ${pageNum}\n\n` + content.trim() + "\n\n";
      }
    } else {
      md += raw.trim();
    }
    return md.trim();
  }, [text, fileName]);

  const handleCopyMd = useCallback(async () => {
    try {
      const md = formatAsMarkdown();
      await navigator.clipboard.writeText(md);
    } catch (e) {
      console.error('Failed to copy MD:', e);
    } finally {
      setMdActive(false);
    }
  }, [formatAsMarkdown]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={onDrop}
      style={{ position: "fixed", right: 20, bottom: 20, display: "flex", alignItems: "center", gap: 8, zIndex: 1000 }}
      aria-live="polite"
    >
      <button
        className="chatbot-send-button"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "application/pdf";
          input.onchange = (e) => {
            const f = e.target.files?.[0];
            onFile(f);
          };
          input.click();
        }}
        disabled={busy || libsLoading}
        aria-label="Choose PDF"
        title="Choose PDF"
      >
        {busy || libsLoading ? "…" : "cf"}
      </button>

      <button
        id="ocr-md"
        onClick={handleCopyMd}
        className={`chatbot-send-button ${mdActive ? 'active' : ''}`}
        disabled={!text}
        title="Copy Markdown"
        aria-label="Copy Markdown"
      >
        md
      </button>
    </div>
  );
}
